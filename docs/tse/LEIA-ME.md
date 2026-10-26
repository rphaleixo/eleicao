# Arquivos desta pasta e das ferramentas da Fase 0

Tudo aqui foi gerado na sessão que construiu o site de apuração e planejou o banco histórico. Serve de ponto de partida para a sessão nova.

- `catalogo-tse.json`: manifesto de 122 pacotes (resultados, candidatos e eleitorado) e 5.476 recursos do portal de dados abertos do TSE, com nome, formato, URL do arquivo no CDN e data de modificação. Gerado em 2026-10-26 por `tools/tse/catalogo.py`. Para atualizar: `python3 tools/tse/catalogo.py`.
- `../../tools/tse/catalogo.py`: gera o manifesto acima (somente leitura).
- `../../tools/tse/qualidade-candidatos.py`: mede cobertura de CPF, título e nascimento por ano e quantas pessoas se repetem entre eleições (somente leitura; baixa os cadastros do CDN para um cache). Exemplo: `python3 tools/tse/qualidade-candidatos.py 2018 2022 2026`. Reproduz os números do plano (CPFs em comum 2022 x 2026 = 6.393).
- `../historico-plano.md`: o plano completo (Parte A: o que o site já faz; Parte B: o banco histórico).
- `../prompt-nova-sessao.md`: o prompt para abrir a sessão nova.

Observação do portal do TSE: o `urllib` do Python sem User-Agent às vezes recebe 403; os scripts já mandam um User-Agent de navegador.
