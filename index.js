const fetch = require('node-fetch');
const fs = require('fs');

async function buscarContratos(cpf) {
  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': 'Bearer Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6WyJVU0UiLCJkYzA0MjFkOTc1YWJiNDliNGY3MTIxNzc2ZTc2MmY3ZDVkZmY5MTRlIl0sImp0aSI6IjM4ZmYxYzE0ZTk0NzQzYWRhZGM3NjQ3Mzg1MTJmOTI4IiwibmFtZWlkIjoiZGMwNDIxZDk3NWFiYjQ5YjRmNzEyMTc3NmU3NjJmN2Q1ZGZmOTE0ZSIsImVtYWlsIjoiMDYuMDE0LjU3MS8wMDAxLTYxIiwibmJmIjoxNzUwODk3OTI5LCJleHAiOjE3NTA5ODQzMjksImlhdCI6MTc1MDg5NzkyOX0.XNzLoaqnbi_9irEHEv--4s7u_GHwBUZejLP-0lAXAZU'
    }
  });

  const json = await response.json();

  // Se quiser salvar como arquivo
  fs.writeFileSync('resultado.json', JSON.stringify(json, null, 2));
  console.log('Dados salvos em resultado.json');
}

const cpf = process.argv[2] || '00000000000';
buscarContratos(cpf);
