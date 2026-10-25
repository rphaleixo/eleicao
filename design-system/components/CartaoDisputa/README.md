Cartão de uma disputa (por exemplo, o governo de um estado) com topo colorido pela situação, os candidatos mais votados e um rodapé com apuração, fonte e hora.

Use em grades de disputas paralelas: os 27 governos, as 8 disputas do 2º turno, os cargos de um estado. Como o Brasil tem muitas disputas ao mesmo tempo, o cartão no lugar do mapa nacional da CNN é a porta de entrada; o rodapé leva à apuração completa.

O consumidor fornece: cargo, território, situação, de 2 a 5 `LinhaCandidato` compactas, urnas apuradas, hora da atualização e o destino do link.

- Mesma estrutura em todos os cartões (topo, candidatos, rodapé) para o leitor comparar estados sem reaprender o layout.
- O topo usa a situação: `eleito` quando definida, `segundo-turno` quando vai ao 2º turno, `trilho` (neutro) enquanto aberta. As variantes `--a` e `--b` pintam com `lado-a` e `lado-b` só em disputas de dois lados.
- O topo carrega o nome do território em `titulo-display`; o selo fica à direita, sempre com ícone e palavra.
- Cinco candidatos no máximo; o resto vira "e mais N" no rodapé.
- A grade usa `repeat(auto-fill, minmax(260px, 1fr))`: uma coluna no celular, três no computador.

Rodada 9: governo decidido no 1º turno aparece como "Eleito no 1º turno" (selo Eleito), sem cartão de 2º turno. O filete superior é menos pesado no tema escuro.
