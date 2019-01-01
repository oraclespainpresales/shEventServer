'use strict';

// Module imports
var restify = require('restify')
  , express = require('express')
  , http = require('http')
  , bodyParser = require('body-parser')
  , json2csv = require('json2csv')
  , kafka = require('kafka-node')
  , async = require('async')
  , _ = require('lodash')
  , QUEUE = require('block-queue')
  , log = require('npmlog-ts')
  , commandLineArgs = require('command-line-args')
  , getUsage = require('command-line-usage')
  , Schemas = require('./schemas')
  , util = require('util')
  , uuidv4 = require('uuid/v4')
;

// Instantiate classes & servers
const restURI      = '/kafka/send/:username/:product/:qty/:price'
    , CONNECTED    = "CONNECTED"
    , DISCONNECTED = "DISCONNECTED"
    , RESTPORT     = 22222
;
var restapp        = express()
  , restserver     = http.createServer(restapp)
  , Producer       = kafka.Producer
  , kafkaClient    = _.noop()
  , kafkaProducer  = _.noop()
  , kafkaCnxStatus = DISCONNECTED;
;

// ************************************************************************
// Main code STARTS HERE !!
// ************************************************************************

log.stream = process.stdout;
log.timestamp = true;

// Main handlers registration - BEGIN
// Main error handler
process.on('uncaughtException', function (err) {
  log.info("","Uncaught Exception: " + err);
  log.info("","Uncaught Exception: " + err.stack);
});
// Detect CTRL-C
process.on('SIGINT', function() {
  log.info("","Caught interrupt signal");
  log.info("","Exiting gracefully");
  process.exit(2);
});
// Main handlers registration - END

// Initialize input arguments
const optionDefinitions = [
  { name: 'zookeeperhost', alias: 'z', type: String },
  { name: 'kafkainboundtopic', alias: 'i', type: String },
  { name: 'help', alias: 'h', type: Boolean },
  { name: 'verbose', alias: 'v', type: Boolean, defaultOption: false }
];

const sections = [
  {
    header: 'Kafka Wrapper',
    content: 'Kafka wrapper to send messages through REST API'
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'zookeeperhost',
        typeLabel: '[underline]{ipaddress:port}',
        alias: 'z',
        type: String,
        description: 'Zookeeper address for Kafka messaging'
      },
      {
        name: 'kafkainboundtopic',
        typeLabel: '[underline]{topic}',
        alias: 'i',
        type: String,
        description: 'Kafka topic to send the events to'
      },
      {
        name: 'verbose',
        alias: 'v',
        description: 'Enable verbose logging.'
      },
      {
        name: 'help',
        alias: 'h',
        description: 'Print this usage guide.'
      }
    ]
  }
]
var options = undefined;

try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  console.log(getUsage(sections));
  console.log(e.message);
  process.exit(-1);
}

if (!options.zookeeperhost || !options.kafkainboundtopic ) {
  console.log(getUsage(sections));
  process.exit(-1);
}

if (options.help) {
  console.log(getUsage(sections));
  process.exit(0);
}

log.level = (options.verbose) ? 'verbose' : 'info';

// REST engine initial setup
restapp.use(bodyParser.urlencoded({ extended: true }));
restapp.use(bodyParser.json());

var servers = [];

// Initializing QUEUE variables BEGIN
var inboundQueue  = []
  , outboundQueue = _.noop()
  , queueConcurrency = 1
;
// Initializing QUEUE variables END

function startKafka(cb) {
  kafkaClient = new kafka.Client(options.zookeeperhost, "RETAIL", {sessionTimeout: 1000});
  kafkaClient.zk.client.on('connected', () => {
    kafkaCnxStatus = CONNECTED;
    log.verbose("", "[Kafka] Server connected!");
  });
  kafkaClient.zk.client.on('disconnected', () => {
    kafkaCnxStatus = DISCONNECTED;
    log.verbose("", "[Kafka] Server disconnected!");
  });
  kafkaClient.zk.client.on('expired', () => {
    kafkaCnxStatus = DISCONNECTED;
    log.verbose("", "[Kafka] Server disconnected!");
  });
  kafkaProducer = new Producer(kafkaClient);
  kafkaProducer.on('ready', () => {
    log.info("", "[Kafka] Producer ready");
    if (inboundQueue.length > 0) {
      // Sent pending messages
      log.info("", "[Kafka] Sending %d pending messages...", inboundQueue.length);

      async.reject(inboundQueue, (msg, callback) => {
        kafkaProducer.send([{ topic: options.kafkainboundtopic, messages: msg, partition: 0 }], (err, data) => {
          if (err) {
            log.error("", err);
            // Abort resending
            callback(err, true);
          } else {
            log.verbose("", "[Kafka] Message sent to topic %s, partition %s and id %d", Object.keys(data)[0], Object.keys(Object.keys(data)[0])[0], data[Object.keys(data)[0]][Object.keys(Object.keys(data)[0])[0]]);
            callback(err, false);
          }
        });
      }, (err, results) => {
        if (err) {
          log.error(err)
        } else {
          log.info("", "Done");
        }
      });
    }
  });
  kafkaProducer.on('error', (err) => {
    log.error("", "Error initializing KAFKA producer: " + err.message);
  });
  if (typeof(cb) == 'function') cb(null);
}

function stopKafka(cb) {
  if (kafkaClient) {
    kafkaClient.close(() => {
      cb();
    });
  } else {
    cb();
  }
}

async.series([
    function(next) {
      // Initialize QUEUE system
      outboundQueue = QUEUE(queueConcurrency, function(message, done) {
        /**
        { topic: 'gse00011668-wedo-out',
          value: '3862079b,328,2017-08-24T07:13:22.377Z,1,MADRID,101,7',
          offset: 14,
          partition: 1,
          highWaterOffset: 15,
          key: null }
        **/
        if (!message || !message.value) {
          return;
        }
        log.verbose("", "Message dequeued: %s", message.value);

        var aData = message.value.split(",");
        if (aData.length != 7) {
          // Data error
          log.error("", "Error in data value: %s (%d)", message.value, aData.length);
          return;
        }
        var data = {
          customerid: aData[0],
          bookingid: Number(aData[1]),
          timestamp: aData[2],
          type: Number(aData[3]),
          demozone: aData[4],
          roomid: Number(aData[5]),
          mood: Number(aData[6])
        }

        log.verbose("", "Data: %j", data);

        var payload = { mood: data.mood };
        var URI = util.format(INSERTMOODURI, data.demozone, String(data.bookingid));
        client.post(URI, payload, function(err, req, res, obj) {
          if (err) {
            log.verbose("", err.message);
          }
          done(); // Let queue handle next task
        });
      });
      next(null);
    },
    function(next) {
      // Initialize KAFKA producer
      log.verbose("", "[Kafka] Connecting to Zookeper host at %s...", options.zookeeperhost);
      startKafka(next);
    },
    function(next) {
      // Start REST server
      restserver.listen(RESTPORT, function() {
        log.info("","REST server running on http://localhost:" + RESTPORT + restURI);
        next(null);
      });
    }
], function(err, results) {
  if (err) {
    log.error("", err.message);
    process.exit(2);
  }
});

restapp.get(restURI, function(req,res) {
  res.status(204).end();
  log.verbose("","Incoming request for event with data: %s, %s, %s, %s", req.params.username, req.params.product, req.params.qty, req.params.price);
  var csvSchema = _.cloneDeep(Schemas.KAFKAINBOUNDFORMAT.json);
  csvSchema.username = req.params.username;
  csvSchema.timestamp = new Date();
  csvSchema.product = req.params.product;
  csvSchema.qty = req.params.qty;
  csvSchema.txid = uuidv4();
  csvSchema.price_total = req.params.price;
  var csv = json2csv({ data: csvSchema, fields: Schemas.KAFKAINBOUNDFORMAT.csv, hasCSVColumnTitle: false, quotes: '' });
  log.verbose("","[Kafka] CSV payload: %s", csv);
  if (kafkaCnxStatus !== CONNECTED || !kafkaProducer) {
    // Zookeeper connection lost, let's try to reconnect before giving up
    log.verbose("","[Kafka] Server not available. Enqueueing message");
    inboundQueue.push(csv);
    log.verbose("","[Kafka] Trying to reconnect to Kafka server...");
    stopKafka(() => {
      log.verbose("","[Kafka] Kafka Object closed");
      startKafka();
    });
  } else {
    kafkaProducer.send([{ topic: options.kafkainboundtopic, messages: csv, partition: 0 }], (err, data) => {
      if (err) {
        log.error("", err);
        log.verbose("","[Kafka] Server not available. Enqueueing message");
        inboundQueue.push(csv);
      } else {
        log.verbose("", "[Kafka] Message sent to topic %s, partition %s and id %d", Object.keys(data)[0], Object.keys(Object.keys(data)[0])[0], data[Object.keys(data)[0]][Object.keys(Object.keys(data)[0])[0]]);
      }
    });
  }
});
