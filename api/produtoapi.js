export default async function handler(req, res) {
  const { loja, codigo } = req.query;

  if (!loja || !codigo) {
    return res.status(400).json({ erro: "Parâmetros ausentes" });
  }

  // reutilize a lógica do seu obterToken() aqui
  const token = await obterToken();

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/vendas/loja/${loja}/codigo/${codigo}`;

  const resposta = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  });

  const texto = await resposta.text();

  if (!texto) return res.status(502).json({ erro: "Resposta vazia da API externa" });

  try {
    const dados = JSON.parse(texto);
    return res.status(200).json(dados);
  } catch {
    return res.status(500).json({ erro: "Não foi possível interpretar os dados da compra" });
  }
}
