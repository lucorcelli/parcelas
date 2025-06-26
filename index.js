const fetch = require('node-fetch');
const fs = require('fs');

async function buscarContratos(cpf) {
  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': 'Bearer SEU_TOKEN_AQUI'
    }
  });

  const json = await response.json();

  // Se quiser salvar como arquivo
  fs.writeFileSync('resultado.json', JSON.stringify(json, null, 2));
  console.log('Dados salvos em resultado.json');
}

const cpf = process.argv[2] || '00000000000';
buscarContratos(cpf);
