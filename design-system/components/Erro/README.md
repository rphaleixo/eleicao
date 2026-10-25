Aviso de falha ao buscar os dados, com a causa em linguagem simples e um botão para tentar de novo.

Use no lugar do conteúdo quando não há resultado guardado. Se houver um guardado, mantenha-o na tela e avise só na `BarraStatus`.

- Faixa lateral de 5px em `perigo` e ícone quadrado com "!"; o título diz o que falhou, o texto diz o que acontece agora.
- `role="alert"`; o botão "Tentar agora" repete a busca imediatamente.
- Nunca mostre mensagem técnica (404, JSON). Para 2º turno antes da divulgação, use `Aguardando`, não `Erro`.