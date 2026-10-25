Mapa do Brasil com os 27 estados, pintados pela cor de quem lidera e marcados com ▲ ou ● no centro de cada um.

Use na tela do presidente e no resumo de governadores. O mapa é só uma visão: os detalhes de cada estado vêm do `CartaoDisputa` e da `LinhaEstado`, e o toque em um estado abre a tela dele. Diferente da CNN, o Brasil tem muitas disputas paralelas, então o mapa não é a porta de entrada.

O consumidor fornece: o líder de cada estado (`--cor` no `<path>`), a situação (hachura quando não há líder) e o estado selecionado (`aria-current`). O desenho vem da malha simplificada do IBGE em unidades de 0,01 grau, com `y = -latitude` (`public/mapa-brasil.js`).

- Cor lisa é líder; hachura é "sem líder definido" (aguardando ou empate); nunca deixe um estado sem uma das duas.
- A marca de forma (▲ lado A, ● lado B) no centro do estado é obrigatória: a diferença de cor sozinha não basta para daltônicos. A marca tem contorno escuro e preenchimento branco para ler sobre qualquer cor de partido.
- Para mostrar o líder pela cor do partido, passe `--cor: var(--partido-pt)`; a marca continua sendo o lado.
- Contorno de 7 unidades em `cartao` entre estados; o selecionado ganha contorno em `texto`.
- Legenda sempre abaixo, com as mesmas marcas. Os contornos do IBGE ficam angulosos com muito zoom: não ofereça zoom neste mapa.