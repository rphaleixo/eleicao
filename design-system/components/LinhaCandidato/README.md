Linha de ranking de um candidato: posição, foto, nome, partido, votos, percentual e barra proporcional.

Use em listas de candidatos de qualquer cargo, no cartão de disputa e na tela de um estado. Toque na linha abre a ficha do candidato.

O consumidor fornece: posição, foto (ou o quadrado `trilho` quando não há), nome de urna, partido e cor, votos, percentual sobre votos válidos e, se houver, a situação.

- A foto leva borda de 3px na cor do partido (`--cor`); a mesma `--cor` pinta a barra.
- Eleito: faixa lateral de 3px em `eleito` mais o selo ✓. 2º turno: faixa em `segundo-turno`. A faixa é reforço do selo, nunca o único sinal.
- A linha de corte tracejada (`el-corte`) separa quem está dentro da regra, como em "eleitos" de deputados.
- Votos em `num-md`, percentual em `num-sm`, ambos tabulares, alinhados à direita.