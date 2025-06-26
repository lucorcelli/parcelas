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

function calcularValorCorrigidoSimples(valorOriginal, vencimentoStr) {
  const hoje = new Date();
  const venc = new Date(vencimentoStr);
  const dias = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));

  if (dias <= 0) return { corrigido: valorOriginal, atraso: 0 };

  const jurosDia = calcularJurosDiario(dias);
  const multa = valorOriginal * 0.02;
  const juros = valorOriginal * jurosDia * dias;
  const total = valorOriginal + multa + juros;

  return { corrigido: total, atraso: dias };
}

async function buscarParcelas() {
  const cpf = document.getElementById("cpfInput").value.trim();
  if (!cpf) return alert("Digite um CPF válido.");

  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  const url = `/api/parcelas?cpf=${cpf}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro da API: ${response.status}`);

    const data = await response.json();
    let totalGeral = 0;

    (data.itens || []).forEach(item => {
      const contrato = item.contrato;
      const parcelasOrdenadas = [...(item.parcelas || [])].sort((a, b) => {
        return new Date(a.datavencimento) - new Date(b.datavencimento);
      });

      parcelasOrdenadas.forEach(p => {
        if (!p.datavencimento) return;

        const venc = p.datavencimento;
        const valorOriginal = p.valorvencimento;
        const { corrigido, atraso } = calcularValorCorrigidoSimples(valorOriginal, venc);
        totalGeral += corrigido;

        const tr = document.createElement("tr");
        if (atraso > 0) tr.classList.add("vencida");

        tr.innerHTML = `
        <td><input type="checkbox" class="selecionar-parcela" data-valor="${corrigido}" ${atraso > 0 ? "checked" : ""} /></td>
        <td>${contrato}</td>
        <td>${p.parcela}</td>
        <td>${formatarData(venc)}</td>
        <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
        <td>R$ ${corrigido.toFixed(2).replace(".", ",")}</td>
        <td>${atraso > 0 ? atraso + " dia(s)" : "-"}</td>
        `;

        tbody.appendChild(tr);
      });
    });

    document.getElementById("totalGeral").textContent = totalGeral.toFixed(2).replace(".", ",");

    // Eventos dos checkboxes
    document.querySelectorAll(".selecionar-parcela").forEach(cb => {
      cb.addEventListener("change", atualizarSelecionado);
    });

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro ao consultar os dados.");
  }
}

function atualizarSelecionado() {
  let totalSelecionado = 0;
  document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
    const valor = parseFloat(cb.dataset.valor);
    if (!isNaN(valor)) {
      totalSelecionado += valor;
    }
  });
  document.getElementById("totalSelecionado").textContent = totalSelecionado.toFixed(2).replace(".", ",");
}

document.getElementById("selecionarTodos").addEventListener("click", () => {
  const todos = document.querySelectorAll(".selecionar-parcela");
  const algumMarcado = Array.from(todos).some(cb => cb.checked);
  todos.forEach(cb => cb.checked = !algumMarcado);
  atualizarSelecionado();
});
