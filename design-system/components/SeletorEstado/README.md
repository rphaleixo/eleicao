Troca de estado em duas peças: a barra com setas (anterior, escolher, próximo) e a folha com o mapa de blocos do Brasil, em que cada estado é um quadrado na posição aproximada do território.

Use no alto da tela "Estados", quando o leitor precisa pular entre estados sem voltar à lista. A folha abre em diálogo (`aria-haspopup="dialog"`), com busca por nome acima do mapa.

O consumidor fornece: o estado atual, os vizinhos (ordem alfabética ou por região), a situação de cada estado (ponto) e, se quiser, o líder (borda inferior de 4px em `--cor`).

- O bloco tem 46px de altura e a grade cabe em 420px: um dedo acerta qualquer estado.
- O ponto do canto é a situação (cinza, azul, verde); a borda inferior é o líder; o estado atual vira `acento` com o ponto contornado em `sobre-acento`.
- A grade tem 7 colunas por 8 linhas: RR, AP no topo; RS no fim. Mantenha a posição fixa para o leitor aprender onde cada estado está.
- A seta mostra o nome do estado vizinho no `aria-label`; nunca só "‹" e "›".