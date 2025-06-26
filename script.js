const faixasJuros = [
  { de: 1, ate: 59, taxa: 5.01 },
  { de: 60, ate: 365, taxa: 6 },
  { de: 366, ate: 730, taxa: 5 },
  { de: 731, ate: 1096, taxa: 4 },
  { de: 1097, ate: 1461, taxa: 3 },
  { de: 1462, ate: 1826, taxa: 2 },
  { de: 1827, ate: 2556, taxa: 1 },
  { de: 2557, ate: 9999, taxa: 0.2 }
];

function calcularJurosDiario(dias) {
  for (const faixa of faixasJuros) {
    if (dias >= faixa.de && dias <= faixa.ate) {
      return faixa.taxa / 30 / 100;
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

  if (diasAtraso <= 0) return { corrigido: valorOriginal, atraso: 0 };

  const jurosDia = calcularJurosDiario(diasAtraso);
  const comMulta = valorOriginal * 1.02;
  const comJuros = comMulta * (1 + jurosDia * diasAtraso);

  return {
    corrigido: comJuros,
    atraso: diasAtraso
  };
}

async function buscarParcelas() {
  const cpf = document.getElementById("cpfInput").value.trim();
  if (!cpf) return alert("Digite um CPF válido.");

  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: "Bearer SEU_TOKEN_AQUI"
      }
    });

    const data = await response.json();

    (data.itens || []).forEach(item => {
      const contrato = item.contrato;

      (item.parcelas || []).forEach(p => {
        if (!p.datavencimento) return;

        const valorOriginal = p.valorvencimento;
        const venc = p.datavencimento;
        const { corrigido, atraso } = calcularValorCorrigido(valorOriginal, venc);

        const tr = document.createElement("tr");
        if (atraso > 0) tr.classList.add("vencida");

        tr.innerHTML = `
          <td>${contrato}</td>
          <td>${p.parcela}</td>
          <td>${formatarData(venc)}</td>
          <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
          <td class="valorCorrigido">R$ ${corrigido.toFixed(2).replace(".", ",")}</td>
          <td class="diasAtraso">${atraso > 0 ? atraso + " dia(s)" : "-"}</td>
        `;
        tbody.appendChild(tr);
      });
    });

  } catch (err) {
    console.error("Erro:", err);
    alert("Algo deu errado ao consultar a API.");
  }
}
