const express = require('express');
const router = express.Router();
const Jogo = require('../models/Jogo');

// POST - Cadastrar jogo
router.post('/cadastro', async (req, res) => {
  try {

    //console.log("dados recebidos ", req.body);

    const moment = require('moment-timezone'); // adicione no topo do arquivo
    const dataHoraBrasilia = moment.tz(req.body.dataHora, 'America/Sao_Paulo').toDate();

    const novoJogo = new Jogo({
      campeonato: req.body.campeonato,
      timeCasa: req.body.timeCasa,
      timeFora: req.body.timeFora,
      dataHora: dataHoraBrasilia,
      oddCasa: req.body.oddCasa,
      oddEmpate: req.body.oddEmpate,
      oddFora: req.body.oddFora,
      oddsPersonalizadas: req.body.oddsPersonalizadas
    });
    await novoJogo.save();
    res.redirect('/jogos');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao salvar jogo');
  }
});



// GET - Listar todos os jogos agrupados por campeonato
router.get('/', async (req, res) => {
  try {
    const jogos = await Jogo.find().sort({ campeonato: 1, dataHora: 1 }); // Removido filtro por data

    const campeonatos = {};
    jogos.forEach(jogo => {
      const camp = jogo.campeonato || 'Outros';
      if (!campeonatos[camp]) campeonatos[camp] = [];
      campeonatos[camp].push(jogo);
    });

    res.render('home', { campeonatos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar jogos');
  }
});


// GET - Página de edição
router.get('/editar/:id', async (req, res) => {
  try {
    const jogo = await Jogo.findById(req.params.id);
    if (!jogo) return res.status(404).send('Jogo não encontrado');

    const dataUTC = new Date(jogo.dataHora);
    const offsetMin = dataUTC.getTimezoneOffset();
    const dataLocal = new Date(dataUTC.getTime() - offsetMin * 60000);

    const ano = dataLocal.getFullYear();
    const mes = String(dataLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(dataLocal.getDate()).padStart(2, '0');
    const horas = String(dataLocal.getHours()).padStart(2, '0');
    const minutos = String(dataLocal.getMinutes()).padStart(2, '0');

    jogo.dataHoraLocalFormatada = `${ano}-${mes}-${dia}T${horas}:${minutos}`;


    res.render('editarJogo', { jogo });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});

// POST - Salvar edição
router.post('/editar/:id', async (req, res) => {


  try {

    //console.log("dados recebidos ", req.body);

    //console.log("tipo da data", req.body.dataHora);

    //console.log('Odds recebidas:', req.body.oddsPersonalizadas);


    const moment = require('moment-timezone'); // adicione no topo do arquivo

    const dataHoraBrasilia = moment.tz(req.body.dataHora, 'America/Sao_Paulo').toDate();

    // Corrigir estrutura de oddsPersonalizadas (caso venham como objeto com índices)
    let oddsArray = [];
    if (req.body.oddsPersonalizadas) {
      if (Array.isArray(req.body.oddsPersonalizadas)) {
        oddsArray = req.body.oddsPersonalizadas;
      } else {
        oddsArray = Object.values(req.body.oddsPersonalizadas);
      }

      // Converter campos 'valor' para Number
      oddsArray = oddsArray.map(odd => ({
        descricao: odd.descricao,
        valor: parseFloat(odd.valor)
      }));
    }

    // Atualizar jogo no banco
    await Jogo.findByIdAndUpdate(req.params.id, {
      campeonato: req.body.campeonato,
      timeCasa: req.body.timeCasa,
      timeFora: req.body.timeFora,
      dataHora: dataHoraBrasilia,
      oddCasa: req.body.oddCasa,
      oddEmpate: req.body.oddEmpate,
      oddFora: req.body.oddFora,
      oddsPersonalizadas: oddsArray
    });
    res.redirect('/jogos');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao editar jogo');
  }
});

router.post('/jogos/status/:id', async (req, res) => {
  const { status } = req.body;
  await Jogo.findByIdAndUpdate(req.params.id, { status });
  res.redirect('/jogos'); // ou onde quiser redirecionar
});


// DELETE - Excluir jogo
router.delete('/:id', async (req, res) => {
  try {
    await Jogo.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao excluir jogo');
  }
});

module.exports = router;
