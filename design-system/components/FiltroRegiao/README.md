Barra de escopo e filtros: caminho (Brasil › Região › Estado), pílulas de região com contagem, seletores de estado e situação e a ordem da lista.

Use acima de qualquer lista que mude de recorte: estados, deputados, partidos. Os filtros valem em todas as listas e vão para a URL (`#/aba/estado/município`) para o recorte poder ser compartilhado.

O consumidor fornece: o escopo atual, as regiões (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) com a contagem de estados, as opções de estado e de situação.

- O escopo mostra o nível atual em `texto` e os anteriores como link em `acento`; cada nível volta um passo.
- Pílulas de região usam `aria-pressed`; "Todas" é o padrão. As regiões ficam em ordem geográfica, de norte a sul.
- Dois seletores lado a lado cabem em 360px; use `Campo` com largura mínima de 150px quebrando em duas linhas se necessário.
- Para listas de 27 estados, ofereça ordenar por "Mais apurados" ou "Ordem alfabética".

Linguagem de redação (rodada 4): as regiões são um placar (`el-abas--placar`), células coladas em grade de 3 colunas com a contagem de estados em Bebas Neue grande e o nome embaixo; a região ativa inverte (fundo `texto`, letra `fundo`). Ordem e situação usam o filtro em caixa marcada (`el-abas--filtro`). Os campos de seleção têm cantos retos e filete inferior de 2px.

Orçamento de altura (rodada 6): o placar de regiões é uma única linha de 6 células (Todas e as 5 regiões) com 52px, em vez de duas linhas. Nada de seletor de estado e de situação sempre à vista: eles abrem sob demanda.

Escopo recolhido (rodada 8): no celular a linha de escopo é um botão de 46px (`el-escopo-barra`) com o caminho atual (Brasil › Sudeste › Rio de Janeiro). Tocar abre o `el-escopo-painel`: setas para o estado anterior e o próximo (`el-vizinhos`), o placar de regiões, o seletor de estado (que abre o `SeletorEstado`) e a situação. Fechado por padrão, soma só 46px, e entra no orçamento de altura (topo 48 + turno e escopo 44 + esta linha 46 = 138px). Aparece em Presidente, Governadores e Meu estado.

- O mesmo agrupamento (Brasil, Regiões, Estados) vale em qualquer seletor de lugar que hoje liste só os estados.
