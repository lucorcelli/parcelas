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
      return parseFloat((faixa.taxa / 30 / 100).toFixed(10)); 
    }
  }
  return 0;
}
function renderizarParcelas(parcelas) {
  const htmlBuilder = [];
  parcelas.forEach(p => {
    console.log("Parcela:", p);
    htmlBuilder.push(`
  <tr>
    <td><input type="checkbox" /></td>
    <td>${p.contrato}-${p.numero}</td>
    <td>${formatarData(p.vencimento)}</td>
    <td>R$ ${p.valorOriginal.toFixed(2).replace(".", ",")}</td>
    <td>R$ ${p.valorCorrigido.toFixed(2).replace(".", ",")}</td>
    <td>${p.atraso || "-"}</td>
    <td>
      <button onclick="abrirJanelaProdutoCompleta('${p.loja}', '${p.contrato}')" 
              style="background:#1976d2; color:#fff; padding:6px 10px; border:none; border-radius:4px; cursor:pointer;">
        Ver Produto
      </button>
    </td>
  </tr>
`);
  });

  document.querySelector("#tabelaParcelas tbody").innerHTML = htmlBuilder.join("");
}
function mascararCpfFinal(cpf) {
  if (!cpf) return "";
  const numeros = cpf.replace(/\D/g, "").slice(-8);
  return numeros.replace(/^(\d{3})(\d{3})(\d{2})$/, "$1.$2-$3");
}

function abreviarNome(nome) {
  if (!nome) return "";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
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
  return { corrigido: parseFloat(comJuros.toFixed(2)), atraso: dias  }; 
}

async function buscarParcelas(cpf) {
  if (!cpf) {
    alert("CPF não informado na URL.");
    return;
  }

  const tbody = document.querySelector("#tabelaParcelas tbody");
  const loader = document.getElementById("loaderParcelas");
  if (loader) loader.style.display = "block";
  tbody.innerHTML = "";

  try {
    const response = await fetch(`/api/parcelas?cpf=${cpf}`);
    if (!response.ok) throw new Error("Erro ao acessar a API.");

    const texto = await response.text();
    if (!texto || texto.trim() === "") {
      // ⚠️ Resposta da API está vazia
      document.getElementById("dadosCliente").innerHTML = `
        <div style="background-color:#f5f5f5; border:1px solid #ccc; border-radius:6px; padding:12px 16px;">
          <div><strong>Cliente:</strong> - — <strong>CPF final:</strong> ${mascararCpfFinal(cpf)}</div>
          <div><strong>Total de Todas as Parcelas:</strong> R$ 0,00 — 
          <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color:#007bff;">0,00</span></div>
        </div>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color: #1976d2; font-weight: bold;">
            Nenhuma parcela em aberto para este cliente. 🎉
          </td>
        </tr>
      `;
      atualizarSelecionado();
      if (loader) loader.style.display = "none";
      return;
    }

    const data = JSON.parse(texto);
    const itens = Array.isArray(data.itens) ? data.itens : [];

    const nomeCompleto = itens[0]?.cliente?.identificacao?.nome || "-";
    const nomeAbreviado = abreviarNome(nomeCompleto);
    const cpfParcial = mascararCpfFinal(cpf);

    let todasParcelas = [];

    for (const item of itens) {
      const contrato = item.contrato;
      const abertas = (item.parcelas || []).filter(p =>
        p.datavencimento &&
        p.capitalaberto > 0 &&
        p.valorvencimento > 0
      );
      abertas.forEach(p => todasParcelas.push({ loja: item.loja, contrato, ...p }));
    }

    if (todasParcelas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color: #1976d2; font-weight: bold;">
            Nenhuma parcela em aberto para este cliente. 🎉
          </td>
        </tr>
      `;
      document.getElementById("dadosCliente").innerHTML = `
        <div style="background-color:#f5f5f5; border:1px solid #ccc; border-radius:6px; padding:12px 16px;">
          <div><strong>Cliente:</strong> ${nomeAbreviado} — 
          <strong>CPF final:</strong> ${cpfParcial}</div>
          <div><strong>Total de Todas as Parcelas:</strong> R$ 0,00 — 
          <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color:#007bff;">0,00</span></div>
        </div>
      `;
      atualizarSelecionado();
      if (loader) loader.style.display = "none";
      return;
    }

    todasParcelas.sort((a, b) => new Date(a.datavencimento) - new Date(b.datavencimento));

    const hoje = new Date();
    const parcelasComCalculo = todasParcelas.map(p => {
      const venc = new Date(p.datavencimento);
      const valorOriginal = p.valorvencimento;
      const { corrigido, atraso } = calcularValorCorrigido(valorOriginal, p.datavencimento);
      return {
        ...p,
        corrigido,
        atraso,
        atrasada: venc < hoje
      };
    });

    const existeVencida = parcelasComCalculo.some(p => p.atrasada);

    let totalGeral = 0;
    let htmlBuilder = [];

    for (let i = 0; i < parcelasComCalculo.length; i++) {
      const p = parcelasComCalculo[i];
      const marcado = existeVencida ? p.atrasada : i === 0;
      const [loja, contratoRaw] = p.contrato.split("-");
      const contrato = contratoRaw.split(":")[0];
      totalGeral += p.corrigido;
    
      htmlBuilder.push(`
        <tr class="${p.atrasada ? "vencida" : ""}">
          <td>
            <input type="checkbox" class="selecionar-parcela" data-valor="${p.corrigido}" ${marcado ? "checked" : ""} />
          </td>
          <td>${p.contrato}-${p.parcela}</td>
          <td>${formatarData(p.datavencimento)}</td>
          <td>R$ ${p.valorvencimento.toFixed(2).replace(".", ",")}</td>
          <td>R$ ${p.corrigido.toFixed(2).replace(".", ",")}</td>
          <td>${p.atrasada ? `${p.atraso} dia(s)` : "-"}</td>
          <td>
            ${p.valorPagto > 0 ? `R$ ${p.valorPagto.toFixed(2).replace(".", ",")}` : "—"}
             <button onclick="abrirJanelaProdutoCompleta(${loja}, ${contrato})" class="produto-btn">
              🛍️
            </button>
          </td>
        </tr>
      `);
    }
    
    tbody.innerHTML = htmlBuilder.join("");

    document.getElementById("dadosCliente").innerHTML = `
      <div style="background-color:#f5f5f5; border:1px solid #ccc; border-radius:6px; padding:12px 16px;">
        <div><strong>Cliente:</strong> ${nomeAbreviado} — 
        <strong>CPF final:</strong> ${cpfParcial}</div>
        <div><strong>Total de Todas as Parcelas:</strong> R$ ${totalGeral.toFixed(2).replace(".", ",")} — 
        <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color:#007bff;">${totalGeral.toFixed(2).replace(".", ",")}</span></div>
      </div>
    `;

    atualizarSelecionado();

    requestAnimationFrame(() => {
      document.querySelectorAll(".selecionar-parcela").forEach(cb => {
        cb.addEventListener("change", atualizarSelecionado);
      });
    });

  } catch (err) {
    console.error("Erro na consulta de parcelas:", err);
    alert("Erro ao consultar os dados. Tente novamente mais tarde.");
  }

  if (loader) loader.style.display = "none";
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

const btnVoltar = document.getElementById("voltarWhatsapp");
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    let total = 0;
    let listaParcelas = [];

    const selecionadas = document.querySelectorAll(".selecionar-parcela:checked");
    selecionadas.forEach(cb => {
      const linha = cb.closest("tr");
      const colunas = linha.querySelectorAll("td");

      const parcela = colunas[1]?.textContent.trim();
      const venc = colunas[2]?.textContent.trim();
      const valor = colunas[4]?.textContent.trim();

      const num = parseFloat(cb.dataset.valor);
      if (!isNaN(num)) total += num;

      listaParcelas.push(`${parcela} - ${venc} - ${valor}`);
    });

    // 🔧 Limpa e formata a mensagem
    const textoParcelas = listaParcelas.join('\n');
    const mensagemFinal = `Gostaria de pagar o valor selecionado: ${textoParcelas}`;

    // 🔁 Agora codifica corretamente
    const textoSeguro = encodeURIComponent(mensagemFinal.replace(/\n/g, '\n').trim());

    const link = `https://wa.me/5511915417060?text=${textoSeguro}`;
    window.open(link, '_blank');
  });
}


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
  // Função para atualizar o texto do botão Selecionar/Desmarcar
function atualizarBotaoSelecionarTodos() {
  const checkboxes = document.querySelectorAll(".selecionar-parcela");
  const todosMarcados = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  document.getElementById("selecionarTodos").textContent = todosMarcados ? "Desmarcar tudo" : "Selecionar tudo";
}

// Evento do botão Selecionar/Desmarcar tudo
document.getElementById("selecionarTodos").addEventListener("click", function() {
  const checkboxes = document.querySelectorAll(".selecionar-parcela");
  const todosMarcados = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !todosMarcados);
  atualizarSelecionado();
  atualizarBotaoSelecionarTodos();
});

// Sempre que as checkboxes mudam, atualiza o texto do botão
function adicionarEventoCheckboxes() {
  document.querySelectorAll(".selecionar-parcela").forEach(cb => {
    cb.addEventListener("change", function() {
      atualizarSelecionado();
      atualizarBotaoSelecionarTodos();
    });
  });
}
const btnVoltar = document.getElementById("voltarWhatsapp");
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    let total = 0;
    let listaParcelas = [];

    document.querySelectorAll(".selecionar-parcela:checked").forEach(cb => {
      const linha = cb.closest("tr");
      const colunas = linha.querySelectorAll("td");

      const contratoParcela = colunas[1]?.textContent.trim(); // Ex: 100074519
      const valor = parseFloat(cb.dataset.valor);
      if (!isNaN(valor)) total += valor;

      listaParcelas.push(contratoParcela);
    });

    const textoParcelas = listaParcelas.length === 1
      ? `da parcela ${listaParcelas[0]}`
      : `das parcelas ${listaParcelas.join(", ")}`;

    const mensagem = `${textoParcelas}${total.toFixed(2).replace(".", ",")} `;

    const numero = "5511915417060";
    const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(link, "_blank");
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
