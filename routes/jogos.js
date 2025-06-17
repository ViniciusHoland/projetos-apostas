const express = require('express');
const router = express.Router();
const Jogo = require('../models/Jogo');

// POST - Cadastrar jogo
router.post('/cadastro', async (req, res) => {
  try {

    console.log("dados recebidos ", req.body);

    const novoJogo = new Jogo({
      campeonato: req.body.campeonato,
      timeCasa: req.body.timeCasa,
      timeFora: req.body.timeFora,
      dataHora: new Date(req.body.dataHora),
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


// GET - Listar jogos do dia agrupados por campeonato
/*router.get('/', async (req, res) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const amanha = new Date();
  amanha.setHours(23, 59, 59, 999);

  try {
    const jogos = await Jogo.find({
      dataHora: { $gte: hoje, $lte: amanha }
    }).sort({ campeonato: 1, dataHora: 1 });

    const campeonatos = {};
    jogos.forEach(jogo => {
      const camp = jogo.campeonato || 'Outros';
      if (!campeonatos[camp]) campeonatos[camp] = [];
      campeonatos[camp].push(jogo);
    });

    res.render('home', { campeonatos });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar jogos do dia');
  }
});*/

// GET - Página de edição
router.get('/editar/:id', async (req, res) => {
  try {
    const jogo = await Jogo.findById(req.params.id);
    if (!jogo) return res.status(404).send('Jogo não encontrado');
    res.render('editarJogo', { jogo });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});

// POST - Salvar edição
router.post('/editar/:id', async (req, res) => {


  try {

    console.log("dados recebidos ", req.body);


    await Jogo.findByIdAndUpdate(req.params.id, {
      campeonato: req.body.campeonato,
      timeCasa: req.body.timeCasa,
      timeFora: req.body.timeFora,
      dataHora: new Date(req.body.dataHora),
      oddCasa: req.body.oddCasa,
      oddEmpate: req.body.oddEmpate,
      oddFora: req.body.oddFora,
      oddsPersonalizadas: req.body.oddsPersonalizadas.map(odd => ({
        descricao: odd.descricao,
        valor: Number(odd.valor)
      }))
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
