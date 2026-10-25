Linha de lista para um estado: sigla, nome, ponto de situação, barra de apuração e percentual apurado.

Use na lista de estados quando o usuário escolhe a visão "Lista" (a visão padrão é `BlocosEstados`) e em qualquer lista que mude de estado com um toque.

O consumidor fornece: sigla, nome, situação, percentual apurado, os dois líderes com percentuais e o destino do toque.

- Use `el-uf--compacta`: 56px, sigla de 36px, barra de 4px. Os dois líderes (`el-uf__det`) só aparecem quando a linha está expandida (`aria-expanded="true"`); isso corta cerca de um terço da altura da lista.
- A lista (`el-ufs--duas`) passa para duas colunas a partir de 480px.
- Estado sem dados: `el-uf--aguardando`, sem barra, com a palavra "Aguardando" no lugar de "0% apurado". Nunca mostre pilhas de zeros.
- Estado cujo governo foi decidido no 1º turno (ex.: RJ no 2º turno): `el-uf--eleito`, sem barra, com o texto "Eleito no 1º turno" no lugar do percentual.
- O ponto de situação é redundante com a barra e as palavras; não é o único sinal.
- Para 27 estados, ofereça filtro por região e situação (`Abas`) e a ordenação "Mais apurados / Ordem alfabética".


Rodada 9c: na Marcha da apuração a linha descreve andamento (eleitorado, seções, presença), não candidatos; os dois líderes (`el-uf__det`) só aparecem em telas que carregam votos. "Eleito no 1º turno" só se aplica onde existe a lista de governos (ex.: Meu estado); no 2º turno, a lista de Governadores mostra os seis com disputa e uma linha de aviso diz quantos governos foram decididos no 1º turno, com link para o 1º turno.
