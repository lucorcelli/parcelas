function abrirJanelaProdutoCompleta(codigoVenda) {
  const url = `https://integracaodatasystem.useserver.com.br/api/v1/vendas/loja/5/codigo/${codigoVenda}`;
  const popup = window.open("", "_blank", "width=720,height=600,left=100,top=100");

  popup.document.write(`
    <html>
      <head>
        <title>Detalhes da Compra</title>
        <style>
          body {
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
            background: #f8fafc;
            padding: 20px;
            color: #333;
          }
          h2 {
            color: #1976d2;
            margin-bottom: 4px;
          }
          p {
            margin: 8px 0;
            font-size: 1.05em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 15px;
          }
          th, td {
            padding: 10px 8px;
            border: 1px solid #e0e0e0;
            text-align: left;
          }
          th {
            background: #e3edfa;
            color: #1976d2;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <h2>Consultando compra...</h2>
      </body>
    </html>
  `);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const cliente = data.cliente;
      const itens = data.itens || [];
      const parcelas = data.parcelas || [];

      const produtosHTML = itens.map(item => `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.marca?.descricao || "-"}</td>
          <td>${item.tipo?.descricao || "-"}</td>
          <td>R$ ${item.valor.toFixed(2).replace(".", ",")}</td>
        </tr>
      `).join("");

      const parcelasHTML = parcelas.map(p => `
        <tr>
          <td>${p.numero}</td>
          <td>${p.vencimento.split("T")[0]}</td>
          <td>R$ ${p.valor.toFixed(2).replace(".", ",")}</td>
          <td>${p.valorPagto > 0 ? `R$ ${p.valorPagto.toFixed(2).replace(".", ",")}` : "—"}</td>
        </tr>
      `).join("");

      popup.document.body.innerHTML = `
        <h2>Compra #${data.codigo}</h2>
        <p><strong>Cliente:</strong> ${cliente.nome} ${cliente.sobrenome}</p>
        <p><strong>CPF:</strong> ${cliente.cpf}</p>
        <p><strong>Valor Total:</strong> R$ ${data.valorTotal.toFixed(2).replace(".", ",")}</p>
        <p><strong>Emissão:</strong> ${data.emissao}</p>

        <h3>🛍️ Produtos Adquiridos</h3>
        <table>
          <thead><tr><th>Produto</th><th>Marca</th><th>Tipo</th><th>Valor</th></tr></thead>
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
      popup.document.body.innerHTML = `<p style="color:red;">Erro ao buscar os dados da compra: ${err.message}</p>`;
    });
}
