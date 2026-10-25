Tabela numérica com cabeçalho enxuto, números tabulares alinhados à direita e a primeira coluna presa à esquerda durante a rolagem horizontal.

Use para comparar muitas linhas por várias medidas: partidos, estados, cláusula de desempenho, comparação de turnos. A coluna fixa resolve o problema da tabela de majoritárias da aba Partidos, que esconde colunas à direita no celular.

O consumidor fornece: cabeçalhos, linhas e, se houver, o total (`tfoot`).

- Envolva em `el-rolagem` (`overflow-x: auto`). A primeira coluna é sticky e leva sombra de 1px à direita.
- Variação com sinal e palavra: `+` em `eleito`, `−` em `perigo`; a cor reforça, o sinal decide.
- Números em `num-md` com `font-variant-numeric: tabular-nums`; percentuais com 2 casas.
- Linha de destaque (eleito) usa a faixa lateral de 3px, como em `LinhaCandidato`.