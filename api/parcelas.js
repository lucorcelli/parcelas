export default async function handler(req, res) {
  const { cpf } = req.query;

  if (!cpf) {
    return res.status(400).json({ erro: "CPF obrigatório" });
  }

  const url = `https://integracaodatasystem.useserver.com.br/api/v1/personalizado-1/meucrediario/vendas?cpf=${cpf}&dataInicio=2022-01-01&horaIni=00%3A00&dataFim=2035-06-01&horaFim=00%3A00&itensPorPagina=18&pagina=1&baixado=2`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6WyJVU0UiLCJkYzA0MjFkOTc1YWJiNDliNGY3MTIxNzc2ZTc2MmY3ZDVkZmY5MTRlIl0sImp0aSI6IjE5ZTFkMzBmZDVlYjRjZjU4MTVkNmM0NDAxYzEzYzA4IiwibmFtZWlkIjoiZGMwNDIxZDk3NWFiYjQ5YjRmNzEyMTc3NmU3NjJmN2Q1ZGZmOTE0ZSIsImVtYWlsIjoiMDYuMDE0LjU3MS8wMDAxLTYxIiwibmJmIjoxNzUxMjQ1NjMwLCJleHAiOjE3NTEzMzIwMzAsImlhdCI6MTc1MTI0NTYzMH0.5sv8UHxVd8SBISjhcukTsWsFicprs2FG6V-B6vd32Og"
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
