Menu de navegação vertical, um índice numerado das áreas do app, com a marca e o turno no topo.

Use só em telas largas (a partir de 1024px), fixo à esquerda, com o conteúdo à direita. No celular não use gaveta: a navegação é a `BarraInferior` com 4 ou 5 áreas principais e um "Mais" para as demais, porque área escondida atrás de botão é área que ninguém descobre durante a apuração. O Menu e a barra mostram as mesmas áreas na mesma ordem.

O consumidor fornece: a lista de áreas, a área atual, e uma contagem opcional por área (estados, vagas, partidos).

- A área atual leva uma barra de 5px em `acento` à esquerda, fundo `trilho` e texto em `texto`; não depende só da cor.
- Numeração (01, 02…) por contador CSS, em `num`; nome em Bebas Neue; linhas de 48px com filete.
- Rola sozinho se a lista passar da altura da janela; o rodapé mostra a fonte dos dados.
- Ordem sugerida: Presidente, Governadores, Senadores, Deputados, Partidos, Cenários, Geografia, Nulos.
