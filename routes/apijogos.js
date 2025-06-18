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
                id: 15,
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

const leagueFiltro = new Set([15, 72, 71, 363, 265, 239, 907]);
const CASA_DE_APOSTA = 'Bet365'; // nome exato da casa de aposta

router.get('/jogos-hoje', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-apisports-key': API_TOKEN
      },
      params: {
        date: hoje,
        timezone: 'America/Sao_Paulo'
      }
    });

    const fixtures = response.data.response.filter(jogo =>
      leagueFiltro.has(jogo.league.id)
    );

    // Buscar odds para cada jogo individualmente
    const jogosComOdds = await Promise.all(
      fixtures.map(async (jogo) => {
        try {
          const oddsResponse = await axios.get('https://v3.football.api-sports.io/odds', {
            headers: {
              'x-apisports-key': API_TOKEN
            },
            params: {
              fixture: jogo.fixture.id
            }
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
            id: jogo.fixture.id,
            timeCasa: jogo.teams.home.name,
            timeFora: jogo.teams.away.name,
            liga: jogo.league.name,
            horario: jogo.fixture.date,
            odds
          };
        } catch (err) {
          return null; // ignora se falhar
        }
      })
    );

    const jogosFiltrados = jogosComOdds.filter(j => j && j.odds.home && j.odds.draw && j.odds.away);

    res.render('jogos', { jogos: jogosFiltrados });

  } catch (error) {
    console.error('Erro ao buscar jogos:', error.response?.data || error.message);
    res.status(500).send('Erro ao obter jogos');
  }
});



module.exports = router