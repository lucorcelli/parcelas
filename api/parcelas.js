export default async function handler(req, res) {
  let tokenCache = {
    token: null,
    geradoEm: null
  };

  async function obterToken() {
    const agora = Date.now();

    if (
      tokenCache.token &&
      tokenCache.geradoEm &&
      agora - tokenCache.geradoEm < 12 * 60 * 60 * 1000 // 12 horas
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

    if (authResponse.status === 401) {
      return res.status(401).json({
        erro: "Usuário não autenticado. Verifique suas credenciais."
      });
    }

    if (!authResponse.ok) {
      throw new Error(`Erro ao autenticar: ${authResponse.status}`);
    }

    const json = await authResponse.json();
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
    const token = await obterToken();
    console.log("🔑 Token em uso:", token.slice(0, 20) + "...");
    console.log("📡 URL consultada:", url);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 204) {
      return res.status(204).json({
        const data = await response.json();
        if (data.parcelas?.length === 0 || Array.isArray(data.parcelas) && data.parcelas.length === 0) {
          tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color: #1976d2; font-weight: bold;">
          ${data.mensagem || "Nenhuma parcela disponível para este CPF."} 🎉
        </td>
        </tr>
      `;
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
        <div><strong>Cliente:</strong> - — <strong>CPF final:</strong> ${mascararCpfFinal(cpf)}</div>
        <div><strong>Total de Todas as Parcelas:</strong> R$ 0,00 — <strong>Selecionado:</strong> R$ <span id="resumoSelecionado" style="color: #007bff;">0,00</span></div>
        </div>
        `;
        atualizarSelecionado();
        return;
        }
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        erro: "Erro ao acessar API externa",
        status: response.status
      });
    }

    const texto = await response.text();

    if (!texto) {
      return res.status(502).json({
        erro: "Resposta vazia da API externa"
      });
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (parseError) {
      console.error("Erro ao fazer parsing do JSON:", parseError);
      return res.status(500).json({
        erro: "Resposta inválida da API externa"
      });
    }

    res.status(200).json(dados);
  } catch (err) {
    console.error("💥 Erro geral na API:", err);
    res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
