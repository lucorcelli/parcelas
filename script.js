function getJurosPorDia(diasAtraso) {
  const faixas = [
    { de: 1, ate: 59, taxa: 5.01 },
    { de: 60, ate: 365, taxa: 6 },
    { de: 366, ate: 730, taxa: 5 },
    { de: 731, ate: 1096, taxa: 4 },
    { de: 1097, ate: 1461, taxa: 3 },
    { de: 1462, ate: 1826, taxa: 2 },
    { de: 1827, ate: 2556, taxa: 1 },
    { de: 2557, ate: 9999, taxa: 0.2 }
  ];

  for (let faixa of faixas) {
    if (diasAtraso >= faixa.de && diasAtraso <= faixa.ate) {
      return faixa.taxa / 30 / 100; // percentual mensal convertido em diário
    }
  }

  return 0;
}

function formatarData(dataStr) {
  const data = new Date(dataStr);
  return data.toLocaleDateString("pt-BR");
}

function calcularValorCorrigido(valorOriginal, vencimentoStr) {
  const hoje = new Date();
  const vencimento = new Date(vencimentoStr);

  const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
  if (diasAtraso <= 0) return valorOriginal;

  const jurosDia = getJurosPorDia(diasAtraso);
  const valorComMulta = valorOriginal * 1.02; // 2% multa
  const valorComJuros = valorComMulta * (1 + jurosDia * diasAtraso);

  return valorComJuros;
}

async function buscarParcelas() {
  const cpf = document.getElementById("cpfInput").value.trim();
  if (!cpf) return alert("Digite um CPF válido!");

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6WyJVU0UiLCJkYzA0MjFkOTc1YWJiNDliNGY3MTIxNzc2ZTc2MmY3ZDVkZmY5MTRlIl0sImp0aSI6IjM4ZmYxYzE0ZTk0NzQzYWRhZGM3NjQ3Mzg1MTJmOTI4IiwibmFtZWlkIjoiZGMwNDIxZDk3NWFiYjQ5YjRmNzEyMTc3NmU3NjJmN2Q1ZGZmOTE0ZSIsImVtYWlsIjoiMDYuMDE0LjU3MS8wMDAxLTYxIiwibmJmIjoxNzUwODk3OTI5LCJleHAiOjE3NTA5ODQzMjksImlhdCI6MTc1MDg5NzkyOX0.XNzLoaqnbi_9irEHEv--4s7u_GHwBUZejLP-0lAXAZU"
    }
  });

  const data = await response.json();
  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  (data.itens || []).forEach(item => {
    const contrato = item.contrato;

    (item.parcelas || []).forEach(p => {
      if (p.datavencimento) {
        const vencimento = p.datavencimento;
        const valorOriginal = p.valorvencimento;
        const valorCorrigido = calcularValorCorrigido(valorOriginal, vencimento);

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${contrato}</td>
          <td>${p.parcela}</td>
          <td>${formatarData(vencimento)}</td>
          <td>R$ ${valorOriginal.toFixed(2).replace('.', ',')}</td>
          <td>R$ ${valorCorrigido.toFixed(2).replace('.', ',')}</td>
        `;
        tbody.appendChild(row);
      }
    });
  });
}
