export default async function handler(req, res) {
  const { loja, codigo } = req.query;

  if (!loja || !codigo) {
    return res.status(400).json({ erro: "Parâmetros ausentes" });
  }

  // 🔐 Cache de token exclusivo para esta rota
  let tokenCache = {
    token: null,
    geradoEm: null
  };

  const BASE_URL = "https://integracaodatasystem.useserver.com.br/api/v1";
  const TOKEN_VALIDADE = 12 * 60 * 60 * 1000; // 12 horas

  // 📦 Gera cabeçalhos
  const gerarHeaders = token => ({
    accept: "application/json",
    Authorization: `Bearer ${token}`
  });

  // 🔑 Autenticação com hash específica
  async function obterToken() {
    const agora = Date.now();

    if (
      tokenCache.token &&
      tokenCache.geradoEm &&
      agora - tokenCache.geradoEm < TOKEN_VALIDADE
    ) {
      return tokenCache.token;
    }

    const response = await fetch(`${BASE_URL}/autenticar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: process.env.CREDIARIO_CNPJ,
        hash: process.env.HASH_CADASTRO // ← hash específica aqui
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Credenciais inválidas (CNPJ ou HASH_CADASTRO).");
      }
      throw new Error(`Erro ao autenticar: ${response.status}`);
    }

    const json = await response.json();
    tokenCache.token = json.token;
    tokenCache.geradoEm = agora;

    return json.token;
  }

  try {
    const token = await obterToken();
    console.log("🔑 Token (cadastro):", token.slice(0, 20) + "...");

    const url = `${BASE_URL}/vendas/loja/${loja}/codigo/${codigo}`;
    console.log("📡 URL consulta:", url);

    let resposta = await fetch(url, { headers: gerarHeaders(token) });

    if (resposta.status === 403) {
      console.warn("🚫 Token recusado. Gerando novo token...");
      tokenCache.token = null;
      tokenCache.geradoEm = null;
      const novoToken = await obterToken();
      resposta = await fetch(url, { headers: gerarHeaders(novoToken) });
    }

    const texto = await resposta.text();

    if (!texto || resposta.status === 204) {
      return res.status(204).json({
        sucesso: true,
        mensagem: "Nenhum dado encontrado para loja e código informados.",
        dados: []
      });
    }

    if (!resposta.ok) {
      return res.status(resposta.status).json({
        erro: "Erro ao acessar API externa",
        status: resposta.status
      });
    }

    let dados;
    try {
      console.log("📥 Texto recebido:", texto);
      dados = JSON.parse(texto);
    } catch (err) {
      console.error("❌ Erro de parsing:", err.message);
      return res.status(500).json({ erro: "Resposta inválida da API externa" });
    }

    return res.status(200).json(dados);
  } catch (err) {
    console.error("💥 Erro geral:", err.message || err);
    return res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
