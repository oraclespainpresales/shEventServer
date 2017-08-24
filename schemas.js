module.exports = {

  BOOKING: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.hotelName": { presence: true },
    "booking.hotelBrand": { presence: true },
    "booking.hotelCountry": { presence: true },
    "booking.checkin": { presence: true },
    "booking.checkout": { presence: true },
    "customer.customerID": { presence: true },
    "customer.socialID": { presence: true },
    "customer.name": { presence: true },
    "customer.surname": { presence: true },
    "customer.age": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.points": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } }
  },
  PRECHECKINREQUEST: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.hotelName": { presence: true },
    "booking.hotelBrand": { presence: true },
    "booking.hotelCountry": { presence: true },
    "customer.customerID": { presence: true },
    "customer.socialID": { presence: true },
    "customer.name": { presence: true },
    "customer.surname": { presence: true },
    "customer.age": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } }
  },
  CHECKIN: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.hotelName": { presence: true },
    "booking.hotelBrand": { presence: true },
    "booking.hotelCountry": { presence: true },
    "booking.checkindate": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true },
    "customer.socialID": { presence: true },
    "customer.name": { presence: true },
    "customer.surname": { presence: true },
    "customer.age": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "checkin.timestamp": { presence: true },
    "checkin.gender": { presence: true },
    "checkin.mood": { presence: true }
  },
  DOOROPENREQUEST: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true }
  },
  TEMPCHANGEREQUEST: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true },
    "room.currentTemperature": { presence: true, numericality: { onlyInteger: false, greaterThan: 0, noStrings: true } },
    "room.targetTemperature": { presence: true, numericality: { onlyInteger: false, greaterThan: 0, noStrings: true } }
  },
  PURCHASESERVICE: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true },
    "service.serviceID": { presence: true },
    "service.name": { presence: true },
    "service.cost": { presence: true, numericality: { onlyInteger: false, greaterThan: 0, noStrings: true } },
    "service.points": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } }
  },
  MALFUNCTION: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true },
    "malfunction.element": { presence: true },
    "malfunction.issue": { presence: true }
  },
  COZMODISPATCH: {
    demozone: { presence: true },
    "cozmo.request": { presence: true },
    "cozmo.action": { presence: true },
    "cozmo.parameters": { presence: false }
  },
  COZMOCOMPLETE: {
    demozone: { presence: true },
    "cozmo.request": { presence: true },
    "cozmo.action": { presence: true },
    "cozmo.parameters": { presence: false },
    "cozmo.result": { presence: true },
    "cozmo.timestamp": { presence: true }
  },
  CHECKOUT: {
    demozone: { presence: true },
    "booking.bookingID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "booking.hotelID": { presence: true },
    "booking.hotelName": { presence: true },
    "booking.hotelBrand": { presence: true },
    "booking.hotelCountry": { presence: true },
    "booking.checkindate": { presence: true },
    "booking.checkoutdate": { presence: true },
    "booking.roomID": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    "customer.customerID": { presence: true },
    "customer.socialID": { presence: true },
    "customer.name": { presence: true },
    "customer.surname": { presence: true },
    "customer.age": { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } }
  },
  SURVEY: {

  },
  KAFKAINBOUNDFORMAT: {
    csv:  ['customer.customerID','booking.bookingID','timestamp','type','demozone','booking.roomID','checkin.timestamp','checkin.mood','checkin.gender','checkin.temperature','shower.roomID','shower.timestamp','shower.flow','shower.temp','temp.roomID','temp.timestamp','noise.roomID','noise.timestamp','noise.decibel','checkout.roomID','checkout.timestamp','checkout.mood','extension.roomID','extension.timestamp','extension.data1','extension.data2','extension.data3','extension.data4','extension.data5'],
    json: {
      demozone: '',
      timestamp: '',
      type: '',
      customer: {
      	customerID: ''
      },
      booking: {
      	bookingID: '',
      	roomID: 0
      },
      checkin: {
      	timestamp: '',
      	mood: '',
      	gender: '',
      	temperature: 0.0
      },
      shower: {
      	roomID: '',
      	timestamp: '',
      	flow: '',
      	temp: 0.0
      },
      temp: {
      	roomID: '',
      	timestamp: ''
      },
      noise: {
      	roomID: '',
      	timestamp: '',
      	decibel: 0.0
      },
      checkout: {
      	roomID: '',
      	timestamp: '',
      	mood: ''
      },
      extension: {
      	roomID: '',
      	timestamp: '',
      	data1: '',
      	data2: '',
      	data3: '',
      	data4: '',
      	data5: ''
      }
    }
  },
  KAFKAOUTBOUNDFORMAT: {
    csv:  ['customerID','bookingID','timestamp','type','demozone','roomID','mood'],
    json: {
      customerID: '',
      bookingID: 0,
      timestamp: '',
      type: 0,
      demozone: '',
      roomID: 0,
      mood: 0
    }
  }

};
