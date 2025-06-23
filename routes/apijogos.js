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
/*
15 → FIFA Club World Cup (World)
72 → Serie A (Brazil)
71 → Serie B (Brazil)
363 → Paulista A1 (Brazil)
265 → Copa do Brasil (Brazil)
239 → Libertadores (South America)
907 → Copa Sudamericana (South America)

*/

const Jogo = require('../models/Jogo'); // ajuste o caminho se necessário
const leagueFiltro = new Set([15, 72, 71, 363, 265, 239, 907]);
const CASA_DE_APOSTA = '1xBet'; // nome da casa
const FATOR_REDUCAO = 0.85; // reduz odds em 20%
const FATOR_REDUCAO_PLACAR = 0.70; // reduz odds em 30%

const ligasTraduzidas = {
  15: 'Premier League (Inglês)',
  71: 'Ligue 1 (Francês)',
  72: 'Serie A (Italiano)',
  363: 'Bundesliga (Alemão)',
  265: 'Primeira Liga (Português)',
  239: 'La Liga (Espanhol)',
  907: 'Liga dos Campeões da UEFA'
};

router.get('/jogos-hoje', async (req, res) => {
  try {
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];

    const resHoje = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: { 'x-apisports-key': API_TOKEN },
      params: { date: dataHoje, timezone: 'America/Sao_Paulo' }
    });

    const fixtures = resHoje.data.response.filter(jogo => leagueFiltro.has(jogo.league.id));

    const jogosComOdds = await Promise.all(
      fixtures.map(async (jogo) => {
        try {
          const oddsResponse = await axios.get('https://v3.football.api-sports.io/odds', {
            headers: { 'x-apisports-key': API_TOKEN },
            params: { fixture: jogo.fixture.id }
          });

          const oddsData = oddsResponse.data.response?.[0];
          const bm = oddsData?.bookmakers?.find(b => b.name === CASA_DE_APOSTA);

          if (!bm) return null;

          const mercadoPrincipal = bm.bets.find(bet => bet.name === 'Match Winner');

          const odds = mercadoPrincipal?.values.reduce((acc, v) => {
            if (v.value === 'Home') acc.home = parseFloat(v.odd) * FATOR_REDUCAO;
            if (v.value === 'Draw') acc.draw = parseFloat(v.odd) * FATOR_REDUCAO;
            if (v.value === 'Away') acc.away = parseFloat(v.odd) * FATOR_REDUCAO;
            return acc;
          }, {}) || {};

          const oddsPersonalizadas = [];

          const ambosMarcam = bm.bets.find(bet => bet.name === 'Both Teams Score');
          if (ambosMarcam?.values?.length) {
            ambosMarcam.values.forEach(item => {
              const traducao = item.value === 'Yes' ? 'Sim' : 'Não';
              oddsPersonalizadas.push({
                descricao: `Ambos Marcam: ${traducao}`,
                valor: (parseFloat(item.odd) * FATOR_REDUCAO).toFixed(2)
              });

              if (item.value === 'Yes') {
                if (mercadoPrincipal?.values?.length) {
                  mercadoPrincipal.values.forEach(v => {
                    let vencedor = '';
                    if (v.value === 'Home') vencedor = 'Casa';
                    if (v.value === 'Away') vencedor = 'Fora';
                    if (v.value === 'Draw') vencedor = 'Empate';

                    if (vencedor && vencedor !== 'Empate') {
                      oddsPersonalizadas.push({
                        descricao: `Ambos Marcam: Sim + ${vencedor} Vence`,
                        valor: (parseFloat(item.odd) * parseFloat(v.odd) * FATOR_REDUCAO).toFixed(2)
                      });
                    }
                  });
                }
              }
            });
          }

          const golsOverUnder = bm.bets.find(bet => bet.name === 'Goals Over/Under');
          if (golsOverUnder?.values?.length) {
            const over25 = golsOverUnder.values.find(v => v.value === 'Over 2.5');
            if (over25) {
              oddsPersonalizadas.push({
                descricao: 'Mais de 2.5 Gols',
                valor: (parseFloat(over25.odd) * FATOR_REDUCAO).toFixed(2)
              });
            }
          }

          const resultadoExato = bm.bets.find(bet => bet.name === 'Exact Score');
          if (resultadoExato?.values?.length) {
            const placaresDesejados = ['2:1', '3:1', '1:1', '1:2'];
            resultadoExato.values.forEach(v => {
              if (placaresDesejados.includes(v.value)) {
                oddsPersonalizadas.push({
                  descricao: `Placar Exato: ${v.value}`,
                  valor: (parseFloat(v.odd) * FATOR_REDUCAO_PLACAR).toFixed(2)
                });
              }
            });
          }

          return {
            fixtureId: jogo.fixture.id,
            campeonato: jogo.league.name,
            timeCasa: jogo.teams.home.name,
            timeFora: jogo.teams.away.name,
            dataHora: new Date(jogo.fixture.date),
            oddCasa: parseFloat(odds.home?.toFixed(2)),
            oddEmpate: parseFloat(odds.draw?.toFixed(2)),
            oddFora: parseFloat(odds.away?.toFixed(2)),
            oddsPersonalizadas
          };
        } catch (err) {
          return null;
        }
      })
    );

    const jogosFiltrados = jogosComOdds.filter(j => j && j.oddCasa && j.oddEmpate && j.oddFora);

    for (const jogo of jogosFiltrados) {
      const existe = await Jogo.findOne({ fixtureId: jogo.fixtureId });
      if (!existe) {
        await Jogo.create(jogo);
      }
    }

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


router.get('/jogos-hoje/delete', async (req, res) => {

  try {
    await Jogo.deleteMany({});
    res.redirect('/jogos-hoje');
  } catch (error) {
    console.error('Erro ao deletar jogos:', error.response?.data || error.message);
    res.status(500).send('Erro ao deletar jogos');
  }
});




module.exports = router