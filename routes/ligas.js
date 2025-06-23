const axios = require('axios');

const API_KEY = '43ebc8f944cc0c4bceb44b7c4bbde38b';
const ids = [15, 72, 71, 363, 265, 239, 907];

async function buscarNomesLigas() {
  for (const id of ids) {
    try {
      const res = await axios.get('https://v3.football.api-sports.io/leagues', {
        headers: { 'x-apisports-key': API_KEY },
        params: { id }
      });

      const liga = res.data.response[0];
      console.log(`${id} → ${liga.league.name} (${liga.country.name})`);
    } catch (err) {
      console.log(`${id} → Erro ao buscar`);
    }
  }
}

buscarNomesLigas();
