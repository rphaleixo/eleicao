Uma casa por estado, na ordem alfabética, com a sigla, o percentual apurado e a cor do partido do líder.

É a visão padrão da lista de estados na Marcha da apuração: cabe os 27 estados em cerca de 5 linhas de 6 colunas (9 colunas a partir de 480px), em vez de 27 linhas de 56px. O botão "Lista" (`el-visao`) troca para `LinhaEstado` compacta.

O consumidor fornece: sigla, percentual apurado, partido líder (cor) e o destino do toque.

- Estado sem dados usa `el-bloco--aguardando` (cinza, palavra "aguardando"). Nunca desenhe zero barras.
- Estado selecionado: `aria-pressed="true"` com contorno de 3px.
- Alvo de toque: cada bloco tem pelo menos 52px no celular.
- O nome completo vai em `aria-label`.


Dois modos de cor (rodada 9c). Na Marcha da apuração, que só traz o andamento, o bloco é colorido pela situação: verde para encerrada, azul para em apuração, cinza para aguardando, sempre com o percentual apurado escrito. Nas telas que carregam votos por estado (Presidente, Governadores), o bloco usa a cor do partido do líder. Mostre uma legenda curta dizendo qual dos dois modos está ativo. O preview mostra o modo do líder.
