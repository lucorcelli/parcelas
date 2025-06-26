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

function abreviarNome(nomeCompleto) {
  const partes = nomeCompleto.trim().split(" ");
  return partes.map(p => p[0] + ".").join(" ");
}

function mascararCpfFinal(cpf) {
  const partes = cpf.replace(/\D/g, "").slice(-8);
  return partes.replace(/^(\d{3})(\d{3})(\d{2})$/, "$1.$2-$3");
}

function calcularValorCorrigidoSimples(valorOriginal, vencimentoStr) {
  const hoje = new Date();
  const venc = new Date(vencimentoStr);
  const dias = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));

  if (dias <= 5) return { corrigido: valorOriginal, atraso: dias };

  const jurosDia = calcularJurosDiario(dias);
  const multa = valorOriginal * 0.02;
  const juros = valorOriginal * jurosDia * dias;
  const total = valorOriginal + multa + juros;

  return { corrigido: total, atraso: dias };
}

async function buscarParcelas(cpf) {
  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  try {
    const response = await fetch(`/api/parcelas?cpf=${cpf}`);
    if (!response.ok) throw new Error(`Erro da API: ${response.status}`);

    const data = await response.json();

    const nomeCompleto = data.itens?.[0]?.cliente?.identificacao?.nome || "";
    const nomeAbreviado = abreviarNome(nomeCompleto);
    const cpfParcial = mascararCpfFinal(cpf);

    document.getElementById("dadosCliente").innerHTML =
      nomeCompleto && cpf
        ? `Cliente: <strong>${nomeAbreviado}</strong> — CPF final <strong>${cpfParcial}</strong>`
        : "";

    const todasParcelas = [];

    (data.itens || []).forEach(item => {
      const contrato = item.contrato;
      (item.parcelas || []).forEach(p => {
        const emAberto = p.capitalaberto > 0 || (p.totalpago || 0) < p.valorvencimento;
        if (emAberto) {
          todasParcelas.push({ contrato, ...p });
        }
      });
    });

    todasParcelas.sort((a, b) => new Date(a.datavencimento) - new Date(b.datavencimento));

    let totalGeral = 0;

    todasParcelas.forEach(p => {
      if (!p.datavencimento) return;

      const venc = p.datavencimento;
      const valorOriginal = p.valorvencimento;
      const { corrigido, atraso } = calcularValorCorrigidoSimples(valorOriginal, venc);
      totalGeral += corrigido;

      const tr = document.createElement("tr");
      if (atraso > 0) tr.classList.add("vencida");

      tr.innerHTML = `
        <td><input type="checkbox" class="selecionar-parcela" data-valor="${corrigido}" ${atraso > 0 ? "checked" : ""} /></td>
        <td>${p.contrato}</td>
        <td>${p.parcela}</td>
        <td>${formatarData(venc)}</td>
        <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
        <td>R$ ${corrigido.toFixed(2).replace(".", ",")}</td>
        <td>${atraso > 0 ? `${atraso} dia(s)` : "-"}</td>
      `;

      tbody.appendChild(tr);
    });

    document.getElementById("totalGeral").textContent = totalGeral.toFixed(2).replace(".", ",");
    atualizarSelecionado();

    document.querySelectorAll(".selecionar-parcela").forEach(cb => {
      cb.addEventListener("change", atualizarSelecionado);
    });

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro ao consultar os dados. Verifique o CPF ou tente novamente mais tarde.");
  }
}

function atualizarSelecionado() {
  let total = 0;
  document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
    const valor = parseFloat(cb.dataset.valor);
    if (!isNaN(valor)) total += valor;
  });
  document.getElementById("totalSelecionado").textContent = total.toFixed(2).replace(".", ",");
}

document.getElementById("selecionarTodos").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".selecionar-parcela");
  const algumMarcado = Array.from(checkboxes).some(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !algumMarcado);
  atualizarSelecionado();
});

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const cpf = params.get("cpf");
  if (cpf) buscarParcelas(cpf);
});
