Os mesmos blocos dos estados (`BlocosEstados`), mas cada um na posição aproximada que o estado ocupa no mapa do Brasil, em vez da ordem alfabética.

Use como terceira opção da visão dos estados: Blocos, Mapa e Lista (`el-visao` aceita até três botões). O mapa de contornos reais (`MapaBrasil`) continua sendo o desenho geográfico; este é o mapa de blocos iguais, que dá o mesmo peso a São Paulo e a Roraima e cabe no celular.

O consumidor fornece: sigla, percentual apurado, partido líder (cor), o destino do toque e a posição de cada sigla na grade.

- A grade tem 9 colunas e 7 linhas. Posições (linha/coluna): RR 1/4, AP 1/6; AM 2/3, PA 2/5, MA 2/6, CE 2/7, RN 2/8; AC 3/2, RO 3/3, MT 3/4, TO 3/5, PI 3/6, PE 3/7, PB 3/8; MS 4/4, GO 4/5, DF 4/6, BA 4/7, AL 4/8; SP 5/4, MG 5/5, RJ 5/6, ES 5/7, SE 5/8; PR 6/4, SC 6/5; RS 7/4.
- A posição é uma aproximação: o objetivo é reconhecer a região, não desenhar a fronteira. Não aplique a grade em desktop com mais de 480px de largura útil.
- Cada bloco leva sigla e percentual com duas casas decimais, sempre; a cor sozinha não basta. Aguardando usa `el-bloco--aguardando` e o traço.
- Alvo de toque: 46px de altura no celular (largura de cerca de 36px em 390px de tela; por isso o percentual usa a fonte estreita a 10px); 54px a partir de 480px. Se o percentual não couber, mostre só a sigla e deixe o percentual no cartão do estado selecionado, sem inventar valor.
- Mesma regra de cor e de base do `BlocosEstados`.
