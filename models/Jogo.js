const mongoose = require('mongoose');

const jogoSchema = new mongoose.Schema({
  fixtureId: { type: Number, unique: true, sparse: true },
  campeonato: String,
  timeCasa: String,
  timeFora: String,
  dataHora: Date,
  oddCasa: Number,
  oddEmpate: Number,
  oddFora: Number,
  logoCasa: String,
  logoFora: String,
  oddsPersonalizadas: [
    {
      descricao: String,
      valor: Number
    }
  ],
  status: {
    type: String,
    default: 'Aberta'
  }
});

module.exports = mongoose.model('Jogo', jogoSchema);
