export default async function handler(req, res) {
  const { cpf } = req.query;

  if (!cpf) {
    return res.status(400).json({ erro: "CPF obrigatório" });
  }

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2025-06-01&horaFim=00%3A00&itensPorPagina=10&pagina=1&baixado=2`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: "Bearer SEU_TOKEN_AQUI"
      }
    });

    const dados = await response.json();
    res.status(200).json(dados);
  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
