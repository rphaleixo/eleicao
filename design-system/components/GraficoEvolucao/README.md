Gráfico de linhas do percentual de cada lado conforme a apuração avança, com a linha tracejada dos 50% e um cursor que mostra o valor de cada lado.

Use na tela do cargo, abaixo do Placar. O eixo horizontal é a porcentagem de urnas apuradas, não a hora: assim o leitor compara com a apuração anterior no mesmo ponto, e o gráfico de dois turnos pode ser sobreposto.

O consumidor fornece: a série de cada lado (percentual sobre votos válidos por % apurada) e as cores dos lados. O SVG é de largura total (`viewBox` 360 por 206) e se ajusta ao cartão.

- Os gráficos começam na primeira apuração real (17h de Brasília do dia da eleição), nunca no meio-dia.
- Linhas de 2,6px em `lado-a` e `lado-b`, com a marca ▲ ou ● ao lado do nome na legenda e no painel do cursor; a cor sozinha nunca é a legenda. Se usar a cor do partido, mantenha as marcas e garanta 3:1 contra `cartao` nos dois temas.
- Eixo vertical com 5 linhas de grade em `linha`; rótulos em `num-sm` e `texto-suave`.
- O painel do cursor (`el-info`) abre ao tocar ou arrastar; mostre sempre o % apurado, o valor de cada lado e a diferença em pontos.
- Deixe a leitura "quem está na frente" no Placar; o gráfico só mostra como chegou lá.