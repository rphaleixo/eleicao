Cartão com o percentual de urnas apuradas, a barra de progresso e a hora da última atualização.

Use uma vez por tela, logo abaixo do Placar ou no lugar dele quando o cargo ainda não tem líder. É o único lugar onde o progresso da apuração aparece grande; cartões menores usam a barra fina de `LinhaEstado`.

O consumidor fornece: percentual apurado, seções apuradas e faltantes, abstenção e o instante da última atualização.

- O percentual usa `placar-lg`; seções e abstenção usam `num-md` com números tabulares.
- Barra em `acento` enquanto apura; vira `eleito` (classe `el-trilho--eleito`) só aos 100,00%.
- Escreva "Atualizado às hh:mm:ss" e, quando a página não tem atualização automática, a data. Todo bloco com projeção repete o carimbo.
- Aos 100%, troque o carimbo por "Apuração encerrada" e pare de pedir dados.