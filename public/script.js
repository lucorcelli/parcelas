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

function mascararCpf(cpf) {
  if (!cpf) return '';
  // Mascara tudo, exceto os 3 últimos dígitos
  return cpf.replace(/^(\d{3})\d+(\d{2})$/, '$1***$2');
}

function formatarData(dataStr) {
  const data = new Date(dataStr);
  if (isNaN(data)) return "-";
  return data.toLocaleDateString("pt-BR");
}

function calcularValorCorrigido(valorOriginal, vencimentoStr) {
  const hoje = new Date();
  const venc = new Date(vencimentoStr);
  const dias = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
  if (dias <= 5) return { corrigido: valorOriginal, atraso: dias };

  const jurosDia = calcularJurosDiario(dias);
  const comMulta = valorOriginal * 1.02;
  const comJuros = comMulta * (1 + jurosDia * dias);
  return { corrigido: comJuros, atraso: dias };
}

function abreviarNome(nome) {
  if (!nome) return "";
  return nome.split(" ").map(p => p[0] + ".").join(" ");
}

function mascararCpfFinal(cpf) {
  if (!cpf) return "";
  const numeros = cpf.replace(/\D/g, "").slice(-8);
  return numeros.replace(/^(\d{3})(\d{3})(\d{2})$/, "$1.$2-$3");
}

async function buscarParcelas(cpf) {
  if (!cpf) {
    alert("CPF não informado na URL.");
    return;
  }

  const tbody = document.querySelector("#tabelaParcelas tbody");
  tbody.innerHTML = "";

  const url = `/api/parcelas?cpf=${cpf}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro da API: ${response.status}`);

    const data = await response.json();

    // Garante que data.itens é array
    const itens = Array.isArray(data.itens) ? data.itens : [];

    // Busca nome/CPF, mesmo sem parcelas
    const nomeCompleto = itens[0]?.cliente?.identificacao?.nome || "";
    const nomeAbreviado = abreviarNome(nomeCompleto);
    const cpfParcial = mascararCpfFinal(cpf);

    let totalGeral = 0;
    let htmlString = "";
    const todasParcelas = [];

    // Junta todas as parcelas em aberto de todos os contratos
    itens.forEach(item => {
      const contrato = item.contrato;
      const abertas = (item.parcelas || []).filter(p => {
        if (!p.datavencimento) return false;
        return p.capitalaberto > 0 && p.valorvencimento > 0;
      });
      abertas.forEach(p => {
        todasParcelas.push({ contrato, ...p });
      });
    });

    // Se não há NENHUMA parcela em aberto (mas pode ter contratos)
    if (todasParcelas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color: #1976d2; font-weight: bold;">
            Nenhuma parcela em aberto para este cliente. 🎉
          </td>
        </tr>
      `;
      // Mostra nome e CPF mesmo para adimplente
      document.getElementById("dadosCliente").innerHTML = nomeCompleto ? `
        <div style="
          background-color: #f5f5f5;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 12px 16px;
          font-family: Arial, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: #333;
          margin-bottom: 20px;">
          <div><strong>Cliente:</strong> ${nomeAbreviado} — <strong>CPF final:</strong> ${cpfParcial}</div>
          <div><strong>Total de Todas as Parcelas:</strong> R$ 0,00 — <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color: #007bff;">0,00</span></div>
        </div>
      ` : "";
      atualizarSelecionado();
      return;
    }

    // Mostra as parcelas normalmente
    todasParcelas.sort((a, b) => new Date(a.datavencimento) - new Date(b.datavencimento));

    todasParcelas.forEach(p => {
      const venc = p.datavencimento;
      const valorOriginal = p.valorvencimento;
      const { corrigido, atraso } = calcularValorCorrigido(valorOriginal, venc);
      totalGeral += corrigido;

      htmlString += `
        <tr class="${atraso > 0 ? "vencida" : ""}">
          <td><input type="checkbox" class="selecionar-parcela" data-valor="${corrigido}" ${atraso > 0 ? "checked" : ""} /></td>
          <td>${p.contrato}-${p.parcela}</td>
          <td>${formatarData(venc)}</td>
          <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
          <td>R$ ${corrigido.toFixed(2).replace(".", ",")}</td>
          <td>${atraso > 0 ? `${atraso} dia(s)` : "-"}</td>
        </tr>
      `;
    });

    tbody.innerHTML = htmlString;

    document.getElementById("dadosCliente").innerHTML = `
      <div style="
        background-color: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 12px 16px;
        font-family: Arial, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #333;
        margin-bottom: 20px;">
        <div><strong>Cliente:</strong> ${nomeAbreviado} — <strong>CPF final:</strong> ${cpfParcial}</div>
        <div><strong>Total de Todas as Parcelas:</strong> R$ ${totalGeral.toFixed(2).replace(".", ",")} —
        <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color: #007bff;">${totalGeral.toFixed(2).replace(".", ",")}</span></div>
      </div>
    `;

    atualizarSelecionado();

    document.querySelectorAll(".selecionar-parcela").forEach(cb => {
      cb.addEventListener("change", atualizarSelecionado);
    });

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro ao consultar os dados. Tente novamente mais tarde.");
  }
}

function atualizarSelecionado() {
  let total = 0;
  document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
    const valor = parseFloat(cb.dataset.valor);
    if (!isNaN(valor)) total += valor;
  });

  const resumoSpan = document.getElementById("resumoSelecionado");
  if (resumoSpan) resumoSpan.textContent = total.toFixed(2).replace(".", ",");
}

document.getElementById("selecionarTodos").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(".selecionar-parcela");
  const algumMarcado = Array.from(checkboxes).some(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !algumMarcado);
  atualizarSelecionado();
});

document.getElementById("voltarWhatsapp").addEventListener("click", () => {
  let total = 0;
  document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
    const valor = parseFloat(cb.dataset.valor);
    if (!isNaN(valor)) total += valor;
  });

  const mensagem = `Gostaria de pagar o valor selecionado: R$ ${total.toFixed(2).replace(".", ",")}`;
  const link = `https://wa.me/5511915417060?text=${encodeURIComponent(mensagem)}`;

  window.open(link, "_blank");
});

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  let cpf = token;
  if (token && /^[A-Za-z0-9+/=]+$/.test(token) && token.length > 11) {
    // Provavelmente está em base64, decodifica
    try {
      cpf = atob(token);
    } catch (e) {
      // Se não conseguir decodificar, usa o próprio token (pode ser CPF puro)
    }
  }
  if (cpf && /^\d{11}$/.test(cpf)) buscarParcelas(cpf);
});
