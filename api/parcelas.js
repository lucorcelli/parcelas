export default async function handler(req, res) {
  // Cache simples para guardar o token na memória
  let tokenCache = {
    token: null,
    geradoEm: null
  };

  // 🔐 Função para obter token com cache e fallback
  async function obterToken() {
    const agora = Date.now();

    // Verifica se o token ainda está válido (12h)
    if (
      tokenCache.token &&
      tokenCache.geradoEm &&
      agora - tokenCache.geradoEm < 12 * 60 * 60 * 1000
    ) {
      return tokenCache.token;
    }

    // Faz autenticação via API externa
    const authResponse = await fetch("https://integracaodatasystem.useserver.com.br/api/v1/autenticar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: process.env.CREDIARIO_CNPJ,
        hash: process.env.CREDIARIO_HASH
      })
    });

    if (authResponse.status === 401) {
      throw new Error("Usuário não autenticado. Verifique suas credenciais.");
    }

    if (!authResponse.ok) {
      throw new Error(`Erro ao autenticar: ${authResponse.status}`);
    }

    const json = await authResponse.json();
    tokenCache.token = json.token;
    tokenCache.geradoEm = agora;

    return json.token;
  }

  // 🧾 CPF vindo na URL
  const { cpf } = req.query;

  if (!cpf) {
    return res.status(400).json({ erro: "CPF obrigatório" });
  }

  // 🧪 Reset automático em CPF de teste
  if (cpf === "111.111.111-11" || cpf === "11111111111") {
    tokenCache.token = null;
    tokenCache.geradoEm = null;
    console.log("⚠️ Token resetado automaticamente devido ao CPF de teste.");
  }

  // 🌐 URL da consulta de parcelas
  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2035-06-01&horaFim=00%3A00&itensPorPagina=18&pagina=1&baixado=2`;

  try {
    let token = await obterToken();
    console.log("🔑 Token em uso:", token.slice(0, 20) + "...");
    console.log("📡 URL consultada:", url);
    
    let response = await fetch(url, {
      headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}` // ⬅️ comenta essa para usar token fixo
      //Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6WyJVU0UiLCJmOWUwODY5YjNlZGEyZTViYzk3MWJiNmRiMWRjMjVlOTliNGQ4MWZmIl0sImp0aSI6IjdiNzkzNDU5OWEwMDRmMjJhNTg1NjU4MjIwODE4ZjQ4IiwibmFtZWlkIjoiZjllMDg2OWIzZWRhMmU1YmM5NzFiYjZkYjFkYzI1ZTk5YjRkODFmZiIsImVtYWlsIjoiMDYuMDE0LjU3MS8wMDAxLTYxIiwibmJmIjoxNzUxNjQ0OTU1LCJleHAiOjE3NTE3MzEzNTUsImlhdCI6MTc1MTY0NDk1NX0.Io7K_MYC2LWVkNuO_7jqmVdP_C0BPGUVb2DZluGm020` // ⬅️ descomenta esta para testar manualmente
    }
    });
    
    // 🔄 Retry em caso de token recusado
    if (response.status === 403) {
      console.warn("🚫 Token recusado. Resetando e tentando novamente...");
      tokenCache.token = null;
      tokenCache.geradoEm = null;
    
      token = await obterToken(); // gera novo token
      console.log("🔑 Novo token gerado:", token.slice(0, 20) + "...");
    
      response = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 🔄 Detecta 403 e tenta novamente com novo token
    if (response.status === 403) {
      console.warn("🚫 Token recusado. Gerando novo token...");
      tokenCache.token = null;
      tokenCache.geradoEm = null;
      token = await obterToken();

      response = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Nenhuma parcela
    if (response.status === 204) {
      return res.status(204).json({
        sucesso: true,
        mensagem: "Nenhuma parcela encontrada para o CPF informado.",
        parcelas: []
      });
    }

    // Qualquer erro diferente
    if (!response.ok) {
      return res.status(response.status).json({
        erro: "Erro ao acessar API externa",
        status: response.status
      });
    }

    const texto = await response.text();

    if (!texto || texto.trim() === "") {
      return res.status(502).json({ erro: "Resposta vazia da API externa" });
    }

    let dados;
    try {
      console.log("🧪 Texto recebido da API externa:", texto);
      dados = JSON.parse(texto);
    } catch (parseError) {
      console.error("❌ Erro ao fazer parsing:", parseError.message);
      return res.status(500).json({ erro: "Resposta inválida da API externa" });
    }

    // Resposta final
    return res.status(200).json(dados);

  } catch (err) {
    console.error("💥 Erro geral na API:", err.message || err);
    return res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
