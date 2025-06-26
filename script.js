async function buscarParcelas() {
  const cpf = document.getElementById("cpfInput").value.trim();
  if (!cpf) return alert("Digite um CPF válido!");

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "Authorization": "Bearer SEU_TOKEN_AQUI"
    }
  });

  const data = await response.json();
  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  (data.itens || []).forEach(item => {
    const contrato = item.contrato;
    (item.parcelas || []).forEach(p => {
      if (p.datavencimento) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${contrato}</td>
          <td>${p.parcela}</td>
          <td>${new Date(p.datavencimento).toLocaleDateString()}</td>
          <td>R$ ${p.valorvencimento.toFixed(2).replace('.', ',')}</td>
        `;
        tbody.appendChild(row);
      }
    });
  });
}
