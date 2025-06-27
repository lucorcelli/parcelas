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

    // Novo bloco: marca todas as vencidas, ou, se não houver vencidas, a primeira a vencer
    const hoje = new Date();
    const existeVencida = todasParcelas.some(p => {
      const venc = new Date(p.datavencimento);
      return venc < hoje;
    });

    todasParcelas.forEach((p, idx) => {
      const venc = new Date(p.datavencimento);
      const valorOriginal = p.valorvencimento;
      const { corrigido, atraso } = calcularValorCorrigido(valorOriginal, p.datavencimento);
      const atrasada = venc < hoje;
      let checked = "";

      if (existeVencida) {
        // Marca todas as vencidas
        if (atrasada) checked = "checked";
      } else {
        // Se não tem vencida, marca só a primeira a vencer
        if (idx === 0) checked = "checked";
      }

      totalGeral += corrigido;

      htmlString += `
        <tr class="${atrasada ? "vencida" : ""}">
          <td>
            <input type="checkbox" class="selecionar-parcela" data-valor="${corrigido}" ${checked} />
          </td>
          <td>${p.contrato}-${p.parcela}</td>
          <td>${formatarData(p.datavencimento)}</td>
          <td>R$ ${valorOriginal.toFixed(2).replace(".", ",")}</td>
          <td>R$ ${corrigido.toFixed(2).replace(".", ",")}</td>
          <td>${atrasada ? `${atraso} dia(s)` : "-"}</td>
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
