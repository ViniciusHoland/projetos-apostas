const mongoose = require('mongoose');

const jogoApostadoSchema = new mongoose.Schema({
  campeonato: String,
  jogoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jogo', required: true },
  jogoNome: String,
  tipoOdd: String,
  valorOdd: Number,
  dataHora: String,
  status: {
    type: String,
    default: 'Aguardando'
  }
});

const apostaSchema = new mongoose.Schema({
  nomeCliente: {
    type: String,
    required: true,
    trim: true
  },
  jogos: [jogoApostadoSchema],
  valorApostado: { type: Number, required: true },
  retornoEstimado: Number,
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Aposta', apostaSchema);
