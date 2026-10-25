Cabeçalho e lista do cartão "Estados" da Marcha da apuração, com dois controles independentes: a ordem (A–Z ou % apurado) e o agrupamento (Estados ou Regiões). A visão Blocos | Mapa | Lista (`BlocosEstados`, `BlocosMapa`, `LinhaEstado`) vale só para o agrupamento Estados.

Use na lista de estados da Apuração. O consumidor fornece: a lista de estados ou de regiões, o percentual apurado de cada um e o destino do toque.

- Correção da lista (rodada 16): quando a linha é um `<button>`, o navegador pinta um fundo cinza com largura do conteúdo, o que deixa a lista com faixas de tamanhos diferentes. Use `el-uf` em `<button>` ou `<a>` com o reset do bundle (largura total, sem fundo, sem borda lateral, texto à esquerda, 56px de altura). Toda linha ocupa a largura da coluna e só a linha de cima tem divisor.
- Duas colunas só a partir de 480px (`el-ufs--duas`); abaixo disso, uma coluna. A primeira linha de cada coluna não leva divisor no topo.
- Agrupamento Regiões: seis linhas (`el-uf--regiao`, 64px): sigla de duas letras (N, NE, CO, SE, S) e EX para o Exterior, o nome, a quantidade de estados em `el-uf__det`, a barra e o percentual apurado da região. Norte (7), Nordeste (9), Centro-Oeste (3 estados e DF), Sudeste (4), Sul (3). O Exterior fica como linha própria. O toque em uma região abre a lista dos estados dela, já filtrada, e volta para o agrupamento Estados.
- Em Regiões o seletor Blocos | Mapa | Lista não aparece: com seis linhas não há o que alternar.
- A ordem (A–Z ou % apurado) vale nos dois agrupamentos. Percentual da região é o das seções apuradas dentro dela, calculado somando seções, nunca a média dos percentuais dos estados. Duas casas decimais.
- O agrupamento escolhido não é guardado; a tela volta em Estados.
