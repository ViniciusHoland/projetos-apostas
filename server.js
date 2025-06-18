const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();



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


// ====== CONTROLE DE INATIVIDADE ======
let ultimaRequisicao = Date.now();

// Middleware que registra o horário da última requisição
app.use((req, res, next) => {
  ultimaRequisicao = Date.now();
  next();
});

// Verifica a cada 10 minutos se já passou 2h sem acesso
setInterval(() => {
  const agora = Date.now();
  const duasHoras = 2 * 60 * 60 * 1000;

  if (agora - ultimaRequisicao > duasHoras) {
    console.log('Mais de 2 horas sem atividade. Encerrando servidor...');
    process.exit(); // Render entrará em modo sleeping
  }
}, 10 * 60 * 1000); // Verifica a cada 10 minutos

// Página inicial
app.get('/', (req, res) => {
  //res.sendFile(path.join(__dirname, 'views', 'index.html'));
  res.render('index'); 
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

