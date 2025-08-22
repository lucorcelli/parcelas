function abrirProdutoModal(loja, contrato) {
  const url = `/api/produtoapi?loja=${loja}&codigo=${contrato}`;
  const modal = document.getElementById("modalProduto");
  const titulo = document.getElementById("tituloProduto");
  const conteudo = document.getElementById("conteudoProduto");

  modal.style.display = "flex";
  titulo.textContent = "Consultando compra...";
  conteudo.innerHTML = "<p>Carregando...</p>";

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const itens = data.itens || [];
      const parcelas = data.parcelas || [];

      const produtosHTML = itens.map(item => `
        <tr>
          <td>${item.descricao}</td>
          <td>R$ ${item.valor.toFixed(2).replace(".", ",")}</td>
        </tr>
      `).join("");

      parcelas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

      const parcelasHTML = parcelas.map(p => `
        <tr>
          <td>${p.numero}</td>
          <td>${p.vencimento.split("T")[0]}</td>
          <td>R$ ${p.valor.toFixed(2).replace(".", ",")}</td>
          <td>${p.valorPagto > 0 ? `R$ ${p.valorPagto.toFixed(2).replace(".", ",")}` : "—"}</td>
        </tr>
      `).join("");

      titulo.textContent = `Compra #${data.codigo}`;
      conteudo.innerHTML = `
        <p><strong>Valor Total:</strong> R$ ${data.valorTotal.toFixed(2).replace(".", ",")}</p>
        <p><strong>Emissão:</strong> ${data.emissao}</p>

        <h3>🛍️ Produtos Adquiridos</h3>
        <table>
          <thead><tr><th>Produto</th><th>Valor</th></tr></thead>
          <tbody>${produtosHTML}</tbody>
        </table>

        <h3>📆 Parcelas</h3>
        <table>
          <thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Pagamento</th></tr></thead>
          <tbody>${parcelasHTML}</tbody>
        </table>
      `;
    })
    .catch(err => {
      conteudo.innerHTML = `<p style="color:red;">Erro ao buscar os dados da compra: ${err.message}</p>`;
    });
}

document.getElementById("fecharModalProduto").addEventListener("click", () => {
  document.getElementById("modalProduto").style.display = "none";
});
