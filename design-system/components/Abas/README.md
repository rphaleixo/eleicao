Fileira de pílulas roláveis na horizontal para trocar de cargo (navegação) ou filtrar uma lista (filtro).

Use `aria-current="true"` para a aba da página atual e `aria-pressed` para filtros que ligam e desligam. A ordem proposta para o site: Marcha, Presidente, Governadores, Senadores, Deputados, Partidos, Cenários, Geografia, Nulos, Estados.

O consumidor fornece: os rótulos, a aba ativa e, nos filtros, a contagem (`small`).

- Altura mínima de 44px; foco visível com anel de 3px em `acento`.
- Aba ativa em `acento` com `sobre-acento`. Texto sempre legível nos dois temas.
- Nomes consistentes: "Dep. Federal" e "Deputado Federal" viram só "Deputado Federal"; "E se…" vira "Cenários".
- No celular, deixe a próxima aba aparecer pela metade para indicar a rolagem.

Linguagem de redação (rodada 4): as abas são um índice numerado em Bebas Neue, sem caixa nem pílula; a ativa leva uma barra de 5px em `acento` e texto em `texto`, a numeração (01, 02…) vem de contador CSS. Filtros usam `el-abas--filtro`: caixa quadrada marcada (preenchida = ativa) com a contagem ao lado. Atalhos que não guardam estado (cidades populares) usam `el-abas--atalhos`, só texto sublinhado.
