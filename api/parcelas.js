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
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6WyJVU0UiLCJkYzA0MjFkOTc1YWJiNDliNGY3MTIxNzc2ZTc2MmY3ZDVkZmY5MTRlIl0sImp0aSI6ImNiOGJiYzQ2MThkMjRmYWE5M2VmNjQzODhkMWE4M2RiIiwibmFtZWlkIjoiZGMwNDIxZDk3NWFiYjQ5YjRmNzEyMTc3NmU3NjJmN2Q1ZGZmOTE0ZSIsImVtYWlsIjoiMDYuMDE0LjU3MS8wMDAxLTYxIiwibmJmIjoxNzUxMDA1MzI4LCJleHAiOjE3NTEwOTE3MjgsImlhdCI6MTc1MTAwNTMyOH0.pmY4GanrFkQBu2y81feifc0Ul3zMU-rtIC6uipZIImM"
      }
    });

    const dados = await response.json();
    res.status(200).json(dados);
  } catch (err) {
    console.error("Erro na API:", err);
    res.status(500).json({ erro: "Erro ao acessar a API externa" });
  }
}
