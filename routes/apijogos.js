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
    });

    const leagues = response?.data?.response || [];

    leagues.forEach(league => {
      console.log(`ID: ${league.league.id}, Name: ${league.league.name}, Country: ${league.country.name}`);
    });

    res.json(leagues);

  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Erro ao buscar ligas.' });
  }
});



/*
2 -UEFA Champions League
11 - sudamericana
13 - libertadores 
15 → FIFA Club World Cup (World)
39 - premier league - ingles 
71 → Serie A (Brazil)
72 → Serie B (Brazil)
73 - copa do brasil
129  - primeira nacional - argentina 
135: 'Serie A (Itália)',
140: 'La Liga (Espanha)',
265 → Primera División" - chile 
239 → primera A - colombia 

*/

const Jogo = require('../models/Jogo'); // ajuste o caminho se necessário
const leagueFiltro = new Set([ 2, 11 , 13, 15, 39 , 71, 72, 73, 129, 135, 140, 265, 239,612]);
const CASA_DE_APOSTA = '1xBet'; // nome da casa
const FATOR_REDUCAO = 0.80; // reduz odds em 20%
const FATOR_REDUCAO_PLACAR = 0.70; // reduz odds em 30%

const ligasTraduzidas = {
  15: 'FIFA Copa do Mundo de Clubes',
  71: 'Brasil - Brasileirão Série A',
  72: 'Brasil - Brasileirão Série B',
  265: 'Primera División - Chile ',
  140: 'La Liga (Espanhol)',
  2: 'Liga dos Campeões da UEFA',
  11: 'Copa Sul-Americana',
  13: 'Libertadores',
  39: 'Premier League (Inglaterra)',
  73: 'Copa do Brasil',
  129: 'Primeira Nacional - Argentina',
  135: 'Serie A (Itália)',
  239: 'Primeira A - Colombia ',
  612: 'Brasil - Copa do Nordeste',
};

function limitarOdd(valor, maximo = 12) {
  return Math.min(parseFloat(valor), maximo).toFixed(2);
}

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
            if (v.value === 'Home') acc.home = limitarOdd(parseFloat(v.odd) * FATOR_REDUCAO);
            if (v.value === 'Draw') acc.draw = limitarOdd(parseFloat(v.odd) * FATOR_REDUCAO);
            if (v.value === 'Away') acc.away = limitarOdd(parseFloat(v.odd) * FATOR_REDUCAO);
            return acc;
          }, {}) || {};

          const oddsPersonalizadas = [];

          const ambosMarcam = bm.bets.find(bet => bet.name === 'Both Teams Score');
          if (ambosMarcam?.values?.length) {
            ambosMarcam.values.forEach(item => {
              const traducao = item.value === 'Yes' ? 'Sim' : 'Não';
              oddsPersonalizadas.push({
                descricao: `Ambos Marcam: ${traducao}`,
                valor: limitarOdd(parseFloat(item.odd) * FATOR_REDUCAO)
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
                        valor: limitarOdd(parseFloat(item.odd) * parseFloat(v.odd) * FATOR_REDUCAO)
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
                valor: limitarOdd(parseFloat(over25.odd) * FATOR_REDUCAO)
              });
            }
          }

          const resultadoExato = bm.bets.find(bet => bet.name === 'Exact Score');
          if (resultadoExato?.values?.length) {
            const placaresDesejados = ['2:1', '3:1', '1:1', '1:2', '1:3','2:0','0:2' , '1:0', '0:1'];
            resultadoExato.values.forEach(v => {
              if (placaresDesejados.includes(v.value)) {
                oddsPersonalizadas.push({
                  descricao: `Placar Exato: ${v.value}`,
                  valor: limitarOdd(parseFloat(v.odd) * FATOR_REDUCAO_PLACAR)
                });
              }
            });
          }

          const nomeCampeonato = ligasTraduzidas[jogo.league.id] || jogo.league.name;

          return {
            fixtureId: jogo.fixture.id,
            campeonato: nomeCampeonato,
            timeCasa: jogo.teams.home.name,
            timeFora: jogo.teams.away.name,
            logoCasa: jogo.teams.home.logo, // ✅ Adicionado
            logoFora: jogo.teams.away.logo, // ✅ Adicionado
            dataHora: new Date(jogo.fixture.date),
            oddCasa: parseFloat(odds.home),
            oddEmpate: parseFloat(odds.draw),
            oddFora: parseFloat(odds.away),
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
    res.redirect('/jogos');
  } catch (error) {
    console.error('Erro ao deletar jogos:', error.response?.data || error.message);
    res.status(500).send('Erro ao deletar jogos');
  }
});




module.exports = router