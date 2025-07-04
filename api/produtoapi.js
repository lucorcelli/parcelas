export default async function handler(req, res) {
  const { loja, codigo } = req.query;

  if (!loja || !codigo) {
    return res.status(400).json({ erro: "Parâmetros ausentes" });
  }

  // cache básico
  let tokenCache = {
    token: null,
    geradoEm: null
  };

  async function obterToken() {
    const agora = Date.now();

    if (
      tokenCache.token &&
      tokenCache.geradoEm &&
      agora - tokenCache.geradoEm < 12 * 60 * 60 * 1000
    ) {
      return tokenCache.token;
    }

    const authResponse = await fetch("https://integracaodatasystem.useserver.com.br/api/v1/autenticar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: process.env.CREDIARIO_CNPJ,
        hash: process.env.CREDIARIO_HASH
      })
    });

    if (!authResponse.ok) {
      return res.status(401).json({ erro: "Falha na autenticação" });
    }

    const json = await authResponse.json();
    tokenCache.token = json.token;
    tokenCache.geradoEm = agora;

    return json.token;
  }

  try {
    const token = await obterToken();
    const url = `https://integracaodatasystem.useserver.com.br/api/v1/vendas/loja/${loja}/codigo/${codigo}`;

    const resposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json"
      }
    });

    const texto = await resposta.text();

    if (!texto || resposta.status === 204) {
      return res.status(502).json({ erro: "Dados não encontrados ou resposta vazia" });
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (err) {
      console.error("Erro ao interpretar a resposta da API externa:", err.message);
      return res.status(500).json({ erro: "Resposta inválida da API externa" });
    }

    res.status(200).json(dados);
  } catch (err) {
    console.error("Erro geral no handler produtoapi:", err.message);
    res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
