const express = require('express');
const router = express.Router();
const Aposta = require('../models/Aposta');

router.post('/apostar', async (req, res) => {
  try {
    const { nomeCliente, jogos, valorApostado, possivelRetorno } = req.body;

    if (!nomeCliente || nomeCliente.trim() === '') {
      return res.status(400).send('Nome do cliente é obrigatório');
    }

    if (!Array.isArray(jogos) || jogos.length === 0 || !valorApostado || valorApostado <= 0) {
      return res.status(400).send('Dados inválidos');
    }

    // 💡 Usar o valor direto como retorno estimado, mas garantir que seja numérico
    const retornoEstimado = Number(possivelRetorno) || 0;

    // Monta os jogos para salvar
    const jogosCompletos = jogos.map(jogo => ({
      campeonato: jogo.campeonato || '---',
      jogoId: jogo.jogoId,
      jogoNome: jogo.jogoNome || '---',
      tipoOdd: jogo.tipoOdd || '---',
      valorOdd: Number(jogo.valorOdd) || 0,
      status: jogo.status?.trim() || 'Aberta',
      dataHora: jogo.dataHora || 'Data não disponível',
      logoCasa: jogo.logoCasa || '',
      logoFora: jogo.logoFora || ''
    }));

    const novaAposta = new Aposta({
      nomeCliente: nomeCliente.trim(),
      jogos: jogosCompletos,
      valorApostado: Number(valorApostado),
      retornoEstimado,
      data: new Date()
    });

    await novaAposta.save();

    res.status(201).json({ message: 'Aposta salva com sucesso', id: novaAposta._id });

  } catch (err) {
    console.error('[Erro ao salvar aposta]:', err);
    res.status(500).send('Erro ao salvar aposta');
  }
});


router.get('/bilhete/:id/print', async (req, res) => {
  try {

    const bilhete = await Aposta.findById(req.params.id);
    if (!bilhete) return res.status(404).send('Bilhete não encontrado');

    res.render('printbilhete', { bilhete });
  } catch (error) {
    res.status(500).send('Erro ao carregar bilhete para impressão');
  }
});


router.get('/bilhete/:id', async (req, res) => {
  try {

    const bilhete = await Aposta.findById(req.params.id);

    //console.log("Jogos do bilhete:", bilhete.jogos)

    if (!bilhete) {
      return res.status(404).send('Bilhete não encontrado');
    }
    res.render('bilhete-cliente', { bilhete });
  } catch (e) {
    res.status(500).send('Erro no servidor');
  }
});




router.post('/:apostaId/jogo/:jogoId/status', async (req, res) => {


  try {

    const { apostaId, jogoId } = req.params;
    const { status } = req.body;


    await Aposta.updateOne(
      { _id: apostaId, "jogos._id": jogoId },
      { $set: { "jogos.$.status": status } }
    );
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar o status do jogo');
  }
});


router.post('/bilhete/:id/status', async (req, res) => {
  try {
    const { jogoId, novoStatus } = req.body;
    const bilhete = await Aposta.findById(req.params.id);
    if (!bilhete) return res.status(404).send('Bilhete não encontrado');

    const jogo = bilhete.jogos.find(j => j.jogoId === jogoId);
    if (jogo) {
      jogo.status = novoStatus;
      await bilhete.save();
      res.send('Status atualizado');
    } else {
      res.status(404).send('Jogo não encontrado no bilhete');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});




router.get('/caixa', async (req, res) => {
  try {
    const apostas = await Aposta.find();
    let totalEntradas = apostas.reduce((acc, aposta) => acc + aposta.valorApostado, 0);
    // Aqui você pode buscar saídas de outro modelo se quiser (ou armazenar na sessão)
    res.render('dashboard-caixa', { totalEntradas, saidasManuais: 0, apostas });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao carregar o caixa');
  }
});

router.get('/apostas', async (req, res) => {
  try {
    const apostas = await Aposta.find();
    res.json(apostas);
  } catch (err) {
    res.status(500).send('Erro ao buscar apostas');
  }
});


// Rota API para buscar aposta por ID
router.get('/:id', async (req, res) => {
  try {
    const aposta = await Aposta.findById(req.params.id);
    if (!aposta) return res.status(404).send('Aposta não encontrada');
    res.json(aposta);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});


// Rota para listar todas as apostas
router.get('/', async (req, res) => {
  try {
    const apostas = await Aposta.find().sort({ data: -1 });
    res.render('listarApostas', { apostas });
  } catch (err) {
    res.status(500).send('Erro ao buscar apostas');
  }
});


// Rota para deletar aposta
router.post('/delete/:id', async (req, res) => {
  try {
    await Aposta.findByIdAndDelete(req.params.id);
    res.redirect('/apostas');
  } catch (err) {
    res.status(500).send('Erro ao deletar aposta');
  }
});



module.exports = router;
