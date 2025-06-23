const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios'); // Se ainda não estiver usando
require('dotenv').config();

const app = express();

// ====== CONTROLE DE INATIVIDADE ======
setInterval(() => {
  const url = 'https://banca-bets.onrender.com/jogos'; // substitua pela URL real do seu app no Render
  axios.get(url)
    .then(() => {
    const dataAtual = new Date();
console.log('Ping enviado para manter o servidor ativo em:', dataAtual.toLocaleString('pt-BR'));
    })
    .catch((err) => {
      console.error('Erro ao enviar ping:', err.message);
    });
}, 14 * 60 * 1000); // a cada 14 minutos


// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // arquivos CSS, JS etc.

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro na conexão MongoDB:', err));

// Rotas
const jogosRoutes = require('./routes/jogos');
const apostasRoutes =  require('./routes/apostas');
const saida = require('./routes/saida');
const apiJogos = require('./routes/apijogos');
app.use('/api', apiJogos);
app.use('/jogos', jogosRoutes);
app.use('/apostas', apostasRoutes);
app.use('/', saida);

app.get('/', (req, res) => {
  res.render('index'); // ou res.redirect('/jogos') se quiser redirecionar
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

