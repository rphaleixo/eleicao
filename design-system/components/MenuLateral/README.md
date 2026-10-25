Menu de navegação vertical, um índice numerado das áreas do app, com a marca e o turno no topo.

Use só em telas largas (a partir de 1024px), fixo à esquerda, com o conteúdo à direita. No celular não use gaveta: a navegação é a `BarraInferior` com 4 ou 5 áreas principais e um "Mais" para as demais, porque área escondida atrás de botão é área que ninguém descobre durante a apuração. O Menu e a barra mostram as mesmas áreas na mesma ordem.

O consumidor fornece: a lista de áreas, a área atual, e uma contagem opcional por área (estados, vagas, partidos).

- A área atual leva uma barra de 5px em `acento` à esquerda, fundo `trilho` e texto em `texto`; não depende só da cor.
- Numeração (01, 02…) por contador CSS, em `num`; nome em Bebas Neue; linhas de 48px com filete.
- Rola sozinho se a lista passar da altura da janela; o rodapé mostra a fonte dos dados.
- Dez áreas em quatro grupos, numeradas em sequência (01 a 10): Acompanhar (Apuração, a Marcha da apuração); Cargos (Presidente, Governadores, Senadores, Deputados); Estado (Meu estado, a antiga aba Estados); Análises (Partidos, Cenários, Geografia, Nulos). "E se…" passa a se chamar Cenários.
- No 2º turno só aparecem as áreas que existem: Apuração, Presidente, Governadores (seis estados), Meu estado, Partidos, Cenários, Geografia e Nulos; Senadores e Deputados somem.
- Comparar turnos não fica no menu: é o terceiro botão do seletor de turno (1º turno, 2º turno, Comparar) no alto da página, em todas as telas.
