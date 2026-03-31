cat > parcelas/api/parcelas.js << 'EOF'
let tokenCache = {
  token: null,
  geradoEm: null
};

const TOKEN_VALIDADE = 12 * 60 * 60 * 1000;
const BASE_URL = "https://integracaodatasystem.useserver.com.br/api/v1";

const gerarHeaders = token => ({
  accept: "application/json",
  Authorization: `Bearer ${token}`
});

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
      hash: process.env.CREDIARIO_HASH
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Credenciais inválidas. Verifique CNPJ e hash.");
    }
    throw new Error(`Erro ao autenticar: ${response.status}`);
  }

  const json = await response.json();
  tokenCache.token = json.token;
  tokenCache.geradoEm = agora;
  return json.token;
}

async function consultarParcelas(token, url) {
  let response = await fetch(url, { headers: gerarHeaders(token) });

  if (response.status === 403) {
    console.warn("🚫 Token recusado. Tentando com novo token...");
    tokenCache.token = null;
    tokenCache.geradoEm = null;
    const novoToken = await obterToken();
    console.log("🔑 Novo token:", novoToken.slice(0, 20) + "...");
    response = await fetch(url, { headers: gerarHeaders(novoToken) });
  }

  return response;
}

export default async function handler(req, res) {
  const { cpf } = req.query;

  if (!cpf) {
    return res.status(400).json({ erro: "CPF obrigatório" });
  }

  if (cpf === "11111111111" || cpf === "111.111.111-11") {
    tokenCache.token = null;
    tokenCache.geradoEm = null;
    console.log("⚠️ CPF de teste — token resetado.");
  }

  const url = `${BASE_URL}/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2035-06-01&horaFim=00%3A00&itensPorPagina=20&pagina=1&baixado=2`;
  console.log("📡 URL:", url);

  try {
    const token = await obterToken();
    console.log("🔐 Token:", token.slice(0, 20) + "...");

    const response = await consultarParcelas(token, url);

    if (response.status === 204) {
      return res.status(204).json({
        sucesso: true,
        mensagem: "Nenhuma parcela encontrada para o CPF informado.",
        parcelas: []
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        erro: "Erro ao acessar a API externa",
        status: response.status
      });
    }

    const texto = await response.text();
    if (!texto || texto.trim() === "") {
      return res.status(502).json({ erro: "Resposta vazia da API externa" });
    }

    let dados;
    try {
      console.log("📥 Resposta da API:", texto);
      dados = JSON.parse(texto);
    } catch (parseError) {
      console.error("❌ Erro ao parsear JSON:", parseError.message);
      return res.status(500).json({ erro: "Resposta inválida da API externa" });
    }

    return res.status(200).json(dados);
  } catch (err) {
    console.error("💥 Erro na requisição:", err.message || err);
    return res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
EOF
