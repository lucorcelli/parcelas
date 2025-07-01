export default async function handler(req, res) {
 
  let tokenCache = {
    token: null,
    geradoEm: null
  };
  async function obterToken() {
  const agora = Date.now();
  //tokenCache.geradoEm = null; // força nova autenticação
   
  // Se já temos token e foi gerado há menos de 12 horas, reutiliza
  if (
    tokenCache.token &&
    tokenCache.geradoEm &&
    agora - tokenCache.geradoEm < 12 * 60 * 60 * 1000 // 12 horas em ms
  ) {
    return tokenCache.token;
  }

  // Caso contrário, gera novo token
  const authResponse = await fetch("https://integracaodatasystem.useserver.com.br/api/v1/autenticar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cnpj: process.env.CREDIARIO_CNPJ,
      hash: process.env.CREDIARIO_HASH

    })
  });

  if (!authResponse.ok) {
    throw new Error(`Erro ao autenticar: ${authResponse.status}`);
  }

  const json = await authResponse.json();

  // Salva no cache
  tokenCache.token = json.token;
  tokenCache.geradoEm = agora;

  return json.token;
}
  const { cpf } = req.query;
  if (!cpf) {
    return res.status(400).json({ erro: "CPF obrigatório" });
  }

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2035-06-01&horaFim=00%3A00&itensPorPagina=18&pagina=1&baixado=2`;

  try {
    const token = await obterToken(); // ⬅️ essa é a linha que estava faltando
    console.log("🔑 Token em uso:", token.slice(0, 20) + "...");

    const response = await fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}` // agora sim, token real
    }
  });

    if (!response.ok) {
      return res.status(response.status).json({ erro: "Erro ao acessar API externa", status: response.status });
    }

    const texto = await response.text();

    if (!texto) {
      return res.status(502).json({ erro: "Resposta vazia da API externa" });
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (parseError) {
      console.error("Erro ao fazer parsing do JSON:", parseError);
      return res.status(500).json({ erro: "Resposta inválida da API externa" });
    }

    res.status(200).json(dados);
  } catch (err) {
    console.error("Erro geral na API:", err);
    res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
