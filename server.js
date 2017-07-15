'use strict';

// Module imports
var restify = require('restify')
  , express = require('express')
  , http = require('http')
  , bodyParser = require('body-parser')
  , json2csv = require('json2csv')
  , kafka = require('kafka-node')
  , async = require('async')
  , validate = require("validate.js")
  , _ = require('lodash')
  , log = require('npmlog-ts')
  , commandLineArgs = require('command-line-args')
  , getUsage = require('command-line-usage')
  , Schemas = require('./schemas')
  , util = require('util')
;

// Instantiate classes & servers
const wsURI        = '/socket.io'
    , restURI      = '/wh/event/:eventname'
    , CONNECTED    = "CONNECTED"
    , DISCONNECTED = "DISCONNECTED"
;
var restapp        = express()
  , restserver     = http.createServer(restapp)
  , Producer       = kafka.Producer
  , kafkaClient    = _.noop()
  , kafkaProducer  = _.noop()
  , kafkaCnxStatus = DISCONNECTED;
;

const EVENTS = [
  { event: 'BOOKING', schema: Schemas.BOOKING, kafka: false },
  { event: 'PRECHECKINREQUEST', schema: Schemas.PRECHECKINREQUEST, kafka: false },
  { event: 'CHECKIN', schema: Schemas.CHECKIN, kafka: true },
  { event: 'DOOROPENREQUEST', schema: Schemas.DOOROPENREQUEST, kafka: false },
  { event: 'TEMPCHANGEREQUEST', schema: Schemas.TEMPCHANGEREQUEST, kafka: false },
  { event: 'PURCHASESERVICE', schema: Schemas.PURCHASESERVICE, kafka: false },
  { event: 'MALFUNCTION', schema: Schemas.MALFUNCTION, kafka: false },
  { event: 'COZMODISPATCH', schema: Schemas.COZMODISPATCH, kafka: false },
  { event: 'COZMOCOMPLETE', schema: Schemas.COZMOCOMPLETE, kafka: false },
  { event: 'CHECKOUT', schema: Schemas.CHECKOUT, kafka: true }
];

const MOOD = [
  { mood: "VERY ANGRY", code: 1},
  { mood: "ANGRY", code: 2 },
  { mood: "NEUTRAL", code: 3 },
  { mood: "HAPPY", code: 4 },
  { mood: "VERY HAPPY", code: 5 }
];

const GENDER = [
  { gender: "MALE", code: 1},
  { gender: "FEMALE", code: 2}
];

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
  { name: 'dbhost', alias: 'd', type: String },
  { name: 'pinginterval', alias: 'i', type: Number },
  { name: 'pingtimeout', alias: 't', type: Number },
  { name: 'zookeeperhost', alias: 'z', type: String },
  { name: 'kafkatopic', alias: 'k', type: String },
  { name: 'help', alias: 'h', type: Boolean },
  { name: 'verbose', alias: 'v', type: Boolean, defaultOption: false }
];

const sections = [
  {
    header: 'WEDO Hospitality - Event Server',
    content: 'Event Server for WEDO Hospitality events'
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'dbhost',
        typeLabel: '[underline]{ipaddress:port}',
        alias: 'd',
        type: String,
        description: 'DB setup server IP address/hostname and port'
      },
      {
        name: 'pinginterval',
        typeLabel: '[underline]{milliseconds}',
        alias: 'i',
        type: Number,
        description: 'Ping interval in milliseconds for WS event clients'
      },
      {
        name: 'pingtimeout',
        typeLabel: '[underline]{milliseconds}',
        alias: 't',
        type: Number,
        description: 'Ping timeout in milliseconds for WS event clients'
      },
      {
        name: 'zookeeperhost',
        typeLabel: '[underline]{ipaddress:port}',
        alias: 'z',
        type: Number,
        description: 'Zookeeper address for Kafka messaging'
      },
      {
        name: 'kafkatopic',
        typeLabel: '[underline]{topic}',
        alias: 'k',
        type: Number,
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

if (!options.dbhost || !options.zookeeperhost || !options.kafkatopic) {
  console.log(getUsage(sections));
  process.exit(-1);
}

if (options.help) {
  console.log(getUsage(sections));
  process.exit(0);
}

log.level = (options.verbose) ? 'verbose' : 'info';

const pingInterval = options.pinginterval || 25000
    , pingTimeout  = options.pingtimeout  || 60000
    , RESTPORT = 20000
    , URI = '/ords/pdb1/smarthospitality/demozone/zone'
;

// REST engine initial setup
restapp.use(bodyParser.urlencoded({ extended: true }));
restapp.use(bodyParser.json());

var client = restify.createJsonClient({
  url: 'https://' + options.dbhost,
  rejectUnauthorized: false,
  headers: {
    "content-type": "application/json"
  }
});

var demozones = _.noop();
var servers = [];

// Initializing QUEUE variables BEGIN
var queue = [];
// Initializing QUEUE variables END

function startKafka(cb) {
  kafkaClient = new kafka.Client(options.zookeeperhost, "xx", {sessionTimeout: 1000});
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
  kafkaProducer.on('ready', function () {
    log.info("", "[Kafka] Producer ready");
    if (queue.length > 0) {
      // Sent pending messages
      log.info("", "[Kafka] Sending %d pending messages...", queue.length);

      async.reject(queue, (msg, callback) => {
        kafkaProducer.send([{ topic: options.kafkatopic, messages: msg, partition: 0 }], (err, data) => {
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
  kafkaProducer.on('error', function (err) {
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
      // Get all demozones
      log.verbose("", "Getting available demozones...");
      client.get(URI, function(err, req, res, obj) {
        var jBody = JSON.parse(res.body);
        if (err) {
          next(err.message);
        } else if (!jBody.items || jBody.items.length == 0) {
          next("No demozones found. Aborting.");
        } else {
          demozones = jBody.items;
          next(null);
        }
      });
    },
    function(next) {
      // Open a WS server for each demozone's baseport
      async.eachSeries(demozones, (demozone,callback) => {
        var d = {
          demozone: demozone.id,
          name: demozone.name,
          port: parseInt("2" + demozone.baseport + "00")
        };
        d.app = express();
        d.server = http.createServer(d.app);
        d.io = require('socket.io')(d.server, {'pingInterval': pingInterval, 'pingTimeout': pingTimeout});
        d.io.on('connection', function (socket) {
          log.info(d.name,"Connected!!");
          socket.conn.on('heartbeat', function() {
            log.verbose(d.name,'heartbeat');
          });
          socket.on('disconnect', function () {
            log.info(d.name,"Socket disconnected");
          });
          socket.on('error', function (err) {
            log.error(d.name,"Error: " + err);
          });
        });
        d.server.listen(d.port, function() {
          log.info("","Created WS server for demozone '" + d.name + "' at port: " + d.port);
          servers.push(d);
          callback(null);
        });
      }, function(err) {
        next(null);
      });
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
        log.verbose("", "Available events:%s", _.reduce(EVENTS, (str, e) => {
          return str + " " + e.event;
        }, ""));
        next(null);
      });
    }
], function(err, results) {
  if (err) {
    log.error("", err.message);
    process.exit(2);
  }
});

restapp.post(restURI, function(req,res) {
  if (req.params.eventname) {
    var eventName = req.params.eventname.toUpperCase();
    var event = _.find(EVENTS, ['event', eventName ]);
    var payload = req.body;
    if (!event || !payload) {
      res.status(405).end();
      return;
    }
    var assert = validate(payload, event.schema);
    if (assert) {
      res.status(405).end(assert);
      return;
    }
    // Known event with valid schema, move on...
    // First, send over WebSockets
    var server = _.find(servers, { 'demozone': payload.demozone });
    if (server) {
      var namespace = req.params.eventname.toLowerCase();
      log.verbose("","[WS] Sending event to %s (%s, %d)", namespace, payload.demozone, server.port);
      server.io.sockets.emit(namespace, req.body);
    } else {
      log.error("", "Request received for a demozone not registered (" + demozone + ")");
    }
    // Second, publish it to Kafka topic
    if (event.kafka) {
      log.verbose("","[Kafka] Sending %s event to %s", eventName, options.kafkatopic);
      var csvSchema = _.cloneDeep(Schemas.KAFKAFORMAT.json);
      csvSchema.demozone = payload.demozone;
      csvSchema.timestamp = new Date();
      switch(event.event) {
        case 'CHECKIN':
          csvSchema.type = 1;
          csvSchema.customer.customerID = payload.customer.customerID;
          csvSchema.booking.bookingID = payload.booking.bookingID;
          csvSchema.booking.roomID = payload.booking.roomID;
          csvSchema.checkin.timestamp = new Date();
          var m = _.find(MOOD, ['mood', payload.checkin.mood.toUpperCase() ]);
          csvSchema.checkin.mood = (m) ? m.code : -1;
          var g = _.find(GENDER, ['gender', payload.checkin.gender.toUpperCase() ]);
          csvSchema.checkin.gender = (g) ? g.code : 3;
          csvSchema.checkin.temperature = -1; // TODO
        break;
        case 'CHECKOUT':
          csvSchema.type = 9;
          csvSchema.customer.customerID = payload.customer.customerID;
          csvSchema.booking.bookingID = payload.booking.bookingID;
          csvSchema.checkout.roomID = payload.booking.roomID;
          csvSchema.checkout.timestamp = new Date();
          csvSchema.checkout.mood = ''; // TODO
        break;
      }
      var csv = json2csv({ data: csvSchema, fields: Schemas.KAFKAFORMAT.csv, hasCSVColumnTitle: false, quotes: '' });
      log.verbose("","[Kafka] CSV payload: %s", csv);
      if (kafkaCnxStatus !== CONNECTED || !kafkaProducer) {
        // Zookeeper connection lost, let's try to reconnect before giving up
        log.verbose("","[Kafka] Server not available. Enqueueing message");
        queue.push(csv);
        log.verbose("","[Kafka] Trying to reconnect to Kafka server...");
        stopKafka(() => {
          log.verbose("","[Kafka] Kafka Object closed");
          startKafka();
        });
      } else {
        kafkaProducer.send([{ topic: options.kafkatopic, messages: csv, partition: 0 }], (err, data) => {
          if (err) {
            log.error("", err);
            log.verbose("","[Kafka] Server not available. Enqueueing message");
            queue.push(csv);
          } else {
            log.verbose("", "[Kafka] Message sent to topic %s, partition %s and id %d", Object.keys(data)[0], Object.keys(Object.keys(data)[0])[0], data[Object.keys(data)[0]][Object.keys(Object.keys(data)[0])[0]]);
          }
        });
      }
    }
    res.status(204).end();
  }
});
