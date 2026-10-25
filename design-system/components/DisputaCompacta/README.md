Cartão de uma disputa de 2º turno com os dois finalistas na mesma linha. Substitui o cartão alto, com foto grande e candidato empilhado (cerca de 290px), por um de cerca de 120px.

Use na lista "Disputas do 2º turno" da Apuração e em Meu estado: sete cartões passam de mais de 2.000px para menos de 900px.

O consumidor fornece: o cargo ou o estado, os dois candidatos (nome de urna, partido, cor, foto), o percentual de cada um e o texto do rodapé.

- Classe `el-duplo` (o nome `el-disputa` já existe em outro componente). Topo de 36px com o título à esquerda e o selo "2º turno" à direita.
- Corpo: cada lado tem a foto pequena (largura `foto-p`, proporção 3:4) ao lado de nome, chip do partido e percentual de 20px. O lado direito é espelhado (foto na ponta) para a leitura "A × B" ficar simétrica.
- O percentual mostrado é o do 1º turno enquanto o 2º não tem dados, e o rodapé diz isso ("Resultado do 1º turno"). Quando houver dados do 2º turno, o número passa a ser o do 2º e o do 1º vai para o rodapé.
- Rodapé de uma linha: situação da apuração e o link "Ver apuração ›". Os votos absolutos saem do cartão (ficam na tela da disputa).
- Percentuais sempre com duas casas decimais.
- Em telas abaixo de 360px, o nome quebra em até duas linhas; a altura sobe poucos pixels.
