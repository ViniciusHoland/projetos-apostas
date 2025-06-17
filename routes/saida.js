const express = require('express');
const router = express.Router();
const Saida = require('../models/Saida'); // Modelo que você deve criar
const Aposta = require('../models/Aposta');

router.post('/registrar-saida', async (req, res) => {
  try {
    const { valor } = req.body;
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Salva a saída no banco
    const novaSaida = new Saida({
      valor,
      data: new Date()
    });
    await novaSaida.save();

    // Calcula o total de saídas
    const saidas = await Saida.aggregate([
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    const totalSaidas = saidas[0]?.total || 0;

    res.json({ totalSaidas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar saída' });
  }
});


// Obter total de saídas (opcional, caso queira usar em outro lugar)
router.get('/total-saidas', async (req, res) => {
  try {
    const saidas = await Saida.aggregate([
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    const totalSaidas = saidas[0]?.total || 0;
    res.json({ totalSaidas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter total de saídas' });
  }
});

module.exports = router;
