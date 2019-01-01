module.exports = {
  PURCHASE: {
    username: { presence: true },
    timestamp: { presence: true },
    product: { presence: true },
    qty: { presence: true, numericality: { onlyInteger: true, greaterThan: 0, noStrings: true } },
    txid: { presence: true },
    price_total: { presence: true, numericality: { onlyInteger: false, greaterThan: 0, noStrings: true } }
  },
  KAFKAINBOUNDFORMAT: {
    csv:  ['username','timestamp','product','qty','txid','price_total'],
    json: {
      username: '',
      timestamp: '',
      product: '',
      qty: 0,
      txid: '',
      price_total: 0
    }
  }
};
