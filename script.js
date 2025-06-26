// Tabela de faixas de juros mensais
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

// Retorna a taxa de juros diária com base nos dias de atraso
function calcularJurosDiario(dias) {
  for (const faixa of faixasJuros) {
    if (dias >= faixa.de && dias <= faixa.ate) {
      return faixa.taxa / 30 / 100; // mensal → diário
    }
  }
  return 0;
}

// Formata data no padrão dd/mm/aaaa
function formatarData(dataStr) {
  const data = new Date(dataStr);
  return data.toLocaleDateString("pt-BR");
}

// Cálculo do valor corrigido com multa e juros
function calcularValorCorrigido(valorOriginal, vencimentoStr) {
  const hoje = new Date();
  const vencimento = new Date(vencimentoStr);
  const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));

  if (diasAtraso <= 0) return { valorCorrigido: valorOriginal, diasAtraso: 0 };

  const jurosDia = calcularJurosDiario(diasAtraso);
  const valorComMulta = valorOriginal * 1.02;
  const valorComJuros = valorComMulta * (1 + jurosDia * diasAtraso);

  return {
    valorCorrigido: valorComJuros,
    diasAtraso: diasAtraso
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
        if (p.datavencimento) {
          const venc = p.datavencimento;
          const valorOriginal = p.valorvencimento;
          const { valorCorrigido, diasAtraso } = calcularValorCorrigido(valorOriginal, venc);

          const row = document.createElement("tr");
          if (diasAtraso > 0) row.classList.add("vencida");

          row.innerHTML = `
            <td>${contrato}</td>
            <td>${p.parcela}</td>
            <td>${formatarData(venc)}</td>
            <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
            <td class="valorCorrigido">R$ ${valorCorrigido.toFixed(2).replace(".", ",")}</td>
            <td class="diasAtraso">${diasAtraso > 0 ? diasAtraso + " dia(s)" : "-"}</td>
          `;

          tbody.appendChild(row);
        }
      });
    });

  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    alert("Erro ao consultar a API. Verifique o token ou tente novamente mais tarde.");
  }
}
