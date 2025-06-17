const mongoose = require('mongoose');

const SaidaSchema = new mongoose.Schema({
  valor: { type: Number, required: true },
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Saida', SaidaSchema);