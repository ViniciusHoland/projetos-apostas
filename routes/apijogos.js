const express = require('express');
const router = express.Router();
const axios = require('axios');

const API_URL = 'https://v3.football.api-sports.io/leagues';
const API_TOKEN = '43ebc8f944cc0c4bceb44b7c4bbde38b';

router.get('/leagues', async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'x-apisports-key': API_TOKEN
      },
      params: {
        season: '2025'
      }
    });
    const leagues = response.data.response;

    leagues.forEach(league => {
      console.log(`ID: ${league.league.id}, Name: ${league.league.name}, Country: ${league.country.name}`);
    });

    res.json(leagues);

  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
  }
})

const Jogo = require('../models/Jogo'); // ajuste o caminho se necessário
const leagueFiltro = new Set([15, 72, 71, 363, 265, 239, 907]);
const CASA_DE_APOSTA = 'Pinnacle'; // nome exato da casa de aposta


router.get('/jogos-hoje', async (req, res) => {
  try {
    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);

    const dataHoje = hoje.toISOString().split('T')[0];
    const dataAmanha = amanha.toISOString().split('T')[0];

    // Requisições para hoje e amanhã
    const [resHoje, resAmanha] = await Promise.all([
      axios.get('https://v3.football.api-sports.io/fixtures', {
        headers: { 'x-apisports-key': API_TOKEN },
        params: {
          date: dataHoje,
          timezone: 'America/Sao_Paulo'
        }
      }),
      axios.get('https://v3.football.api-sports.io/fixtures', {
        headers: { 'x-apisports-key': API_TOKEN },
        params: {
          date: dataAmanha,
          timezone: 'America/Sao_Paulo'
        }
      })
    ]);

    // Junta os dois arrays
    const fixtures = [...resHoje.data.response, ...resAmanha.data.response]
      .filter(jogo => leagueFiltro.has(jogo.league.id));

    const jogosComOdds = await Promise.all(
      fixtures.map(async (jogo) => {
        try {
          const oddsResponse = await axios.get('https://v3.football.api-sports.io/odds', {
            headers: { 'x-apisports-key': API_TOKEN },
            params: { fixture: jogo.fixture.id }
          });

          const oddsData = oddsResponse.data.response?.[0];
          const bm = oddsData?.bookmakers?.find(b => b.name === CASA_DE_APOSTA);
          const mercado = bm?.bets.find(bet => bet.name === 'Match Winner');
          const odds = mercado?.values.reduce((acc, v) => {
            if (v.value === 'Home') acc.home = v.odd;
            if (v.value === 'Draw') acc.draw = v.odd;
            if (v.value === 'Away') acc.away = v.odd;
            return acc;
          }, {}) || {};

          return {
            fixtureId: jogo.fixture.id,
            campeonato: jogo.league.name,
            timeCasa: jogo.teams.home.name,
            timeFora: jogo.teams.away.name,
            dataHora: new Date(jogo.fixture.date).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }),
            oddCasa: parseFloat(odds.home),
            oddEmpate: parseFloat(odds.draw),
            oddFora: parseFloat(odds.away),
            oddsPersonalizadas: []
          };
        } catch (err) {
          return null;
        }
      })
    );

    const jogosFiltrados = jogosComOdds.filter(j => j && j.oddCasa && j.oddEmpate && j.oddFora);

    // Salvar apenas os que ainda não existem
    for (const jogo of jogosFiltrados) {
      const existe = await Jogo.findOne({ fixtureId: jogo.fixtureId });
      if (!existe) {
        await Jogo.create(jogo);
      }
    }

    // Buscar todos os jogos do banco
    const jogosBD = await Jogo.find({});

    const campeonatos = {};
    jogosBD.forEach(jogo => {
      const camp = jogo.campeonato || 'Outros';
      if (!campeonatos[camp]) campeonatos[camp] = [];
      campeonatos[camp].push(jogo);
    });

    res.render('jogos', { campeonatos });

  } catch (error) {
    console.error('Erro ao buscar jogos:', error.response?.data || error.message);
    res.status(500).send('Erro ao obter jogos');
  }
});




module.exports = router