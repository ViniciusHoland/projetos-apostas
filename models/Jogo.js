const mongoose = require('mongoose');

const jogoSchema = new mongoose.Schema({
  fixtureId: { type: Number, unique: true, sparse: true },
  campeonato: String,
  timeCasa: String,
  timeFora: String,
  dataHora: String,
  oddCasa: Number,
  oddEmpate: Number,
  oddFora: Number,
  oddsPersonalizadas: [
    {
      descricao: String,
      valor: Number
    }
  ],
  status: {
    type: String,
    default: 'Aguardando'
  }
});

module.exports = mongoose.model('Jogo', jogoSchema);
