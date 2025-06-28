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

    const itens = Array.isArray(data.itens) ? data.itens : [];

    const nomeCompleto = itens[0]?.cliente?.identificacao?.nome || "";
    const nomeAbreviado = abreviarNome(nomeCompleto);
    const cpfParcial = mascararCpfFinal(cpf);

    let totalGeral = 0;
    let htmlString = "";
    const todasParcelas = [];

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

    if (todasParcelas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color: #1976d2; font-weight: bold;">
            Nenhuma parcela em aberto para este cliente. 🎉
          </td>
        </tr>
      `;
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

    todasParcelas.sort((a, b) => new Date(a.datavencimento) - new Date(b.datavencimento));

    const hoje = new Date();
    const parcelasComCalculo = todasParcelas.map(p => {
      const venc = new Date(p.datavencimento);
      const valorOriginal = p.valorvencimento;
      const { corrigido, atraso } = calcularValorCorrigido(valorOriginal, p.datavencimento);
      const atrasada = venc < hoje;
      return { ...p, corrigido, atraso, atrasada };
    });

    const existeVencida = parcelasComCalculo.some(p => p.atrasada);

    parcelasComCalculo.forEach((p, idx) => {
      let checked = "";

      if (existeVencida) {
        if (p.atrasada) checked = "checked";
      } else {
        if (idx === 0) checked = "checked";
      }

      totalGeral += p.corrigido;

      htmlString += `
        <tr class="${p.atrasada ? "vencida" : ""}">
          <td>
            <input type="checkbox" class="selecionar-parcela" data-valor="${p.corrigido}" ${checked} />
          </td>
          <td>${p.contrato}-${p.parcela}</td>
          <td>${formatarData(p.datavencimento)}</td>
          <td>R$ ${p.valorvencimento.toFixed(2).replace(".", ",")}</td>
          <td>R$ ${p.corrigido.toFixed(2).replace(".", ",")}</td>
          <td>${p.atrasada ? `${p.atraso} dia(s)` : "-"}</td>
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

// Modal Pix
document.getElementById("abrirPix").addEventListener("click", function() {
  document.getElementById("modalPix").style.display = "flex";
});
document.getElementById("fecharModalPix").addEventListener("click", function() {
  document.getElementById("modalPix").style.display = "none";
});
document.getElementById("modalPix").addEventListener("click", function(e) {
  if (e.target.id === "modalPix") document.getElementById("modalPix").style.display = "none";
});

// Função copiar chave Pix (global para funcionar no onclick do HTML)
window.copiarChave = function(id) {
 console.log("Copiando chave:", id);
  const chave = document.getElementById(id).innerText;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(chave)
      .then(() => mostrarToast("Chave Pix copiada!"))
      .catch(() => mostrarToast("Não foi possível copiar. Tente copiar manualmente."));
  } else {
    mostrarToast("Não foi possível copiar. Tente copiar manualmente.");
  }
}

// Toast visual (mensagem temporária na tela)
function mostrarToast(msg) {
  let toast = document.getElementById("toastPix");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastPix";
    toast.style.cssText = `
      position: fixed;
      bottom: 22px; left: 50%; transform: translateX(-50%);
      background: #1976d2; color: #fff; padding: 14px 32px;
      border-radius: 24px; font-size: 1.07em; z-index: 2000;
      box-shadow: 0 2px 18px #0002; opacity:0; pointer-events:none;
      transition: opacity .2s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 2100);
}

window.addEventListener("DOMContentLoaded", () => {
  // ✅ Botão Selecionar Todos
  const btnSelecionarTodos = document.getElementById("selecionarTodos");
  if (btnSelecionarTodos) {
    btnSelecionarTodos.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".selecionar-parcela");
      const algumMarcado = Array.from(checkboxes).some(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !algumMarcado);
      atualizarSelecionado();
    });
  }

  // ✅ Botão Voltar WhatsApp
  const btnVoltar = document.getElementById("voltarWhatsapp");
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      let total = 0;
      document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
        const valor = parseFloat(cb.dataset.valor);
        if (!isNaN(valor)) total += valor;
      });

      const mensagem = `Gostaria de pagar o valor selecionado: R$ ${total.toFixed(2).replace(".", ",")}`;
      const link = `https://wa.me/5511915417060?text=${encodeURIComponent(mensagem)}`;
      window.open(link, "_blank");
    });
  }

  // ✅ Botões do modal Pix
  const abrirPix = document.getElementById("abrirPix");
  const fecharPix = document.getElementById("fecharModalPix");
  const modalPix = document.getElementById("modalPix");

  if (abrirPix && fecharPix && modalPix) {
    abrirPix.addEventListener("click", () => modalPix.style.display = "flex");
    fecharPix.addEventListener("click", () => modalPix.style.display = "none");
    modalPix.addEventListener("click", (e) => {
      if (e.target.id === "modalPix") modalPix.style.display = "none";
    });
  }

  // ✅ Pegando o CPF da URL
  const params = new URLSearchParams(window.location.search);
  let cpf = params.get("token");
  if (cpf && /^[A-Za-z0-9+/=]+$/.test(cpf) && cpf.length > 11) {
    try {
      cpf = atob(cpf);
    } catch (e) { }
  }

  if (cpf && /^\d{11}$/.test(cpf)) {
    buscarParcelas(cpf);
  }
});
