Semicírculo de cadeiras, uma bolinha por cadeira, agrupadas por partido da esquerda para a direita.

Use para o Senado (81 cadeiras, com as que não estão em disputa tracejadas) e para a Câmara (513). É mais legível para composição de bancada do que uma lista, e a `Bancada` em barra continua como a versão compacta de cartão.

O consumidor fornece: cadeiras por partido (com o token de cor), as fora de disputa e o total. O SVG é gerado: coloque N bolinhas em arcos concêntricos, ordene por ângulo e atribua os partidos em sequência.

- Fileiras: 3 para o Senado, 8 para a Câmara; o raio da bolinha encolhe para manter 2px de folga.
- Cadeira ainda não definida fica tracejada em `texto-suave`; nunca preenchida com cor de partido.
- O número de eleitos fica no centro em `placar-lg`; a legenda repete número e partido, porque a cor sozinha não identifica 30 partidos.
- Ordem dos partidos: por tamanho da bancada, e a mesma em toda a sessão. Federações são um bloco só.
- Em telas pequenas deixe a legenda abaixo, em duas colunas.