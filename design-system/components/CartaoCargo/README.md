Resumo de um cargo dentro da tela de um estado: título, percentual apurado, os dois primeiros colocados com foto, nome, partido, percentual e votos, e o link "Ver completo ›".

Use na área "Todas as eleições do estado" (Meu estado, Apuração ao abrir um estado). O consumidor fornece: o cargo, o percentual apurado, os candidatos em ordem de votos (posição, foto, nome de urna, partido, percentual, votos) e o destino do toque.

- Problema corrigido (rodada 17): com três cartões lado a lado numa coluna de 720px, cada um ficava com cerca de 235px e o nome "FLAVIO BOLSONARO" quebrava letra por letra ("FLAVI / O / BOL / SONAR / O"). Agora o nome só quebra entre palavras (`overflow-wrap: normal`), a grade da linha é 18px de posição, foto `foto-p`, nome flexível (`minmax(0, 1fr)`) e percentual, com 8px de espaço.
- Em telas de 720px ou mais os cartões ficam empilhados em uma coluna (`el-cargos`), nunca três lado a lado; abaixo disso, é o carrossel (`Carrossel`), um cartão por vez com a ponta do próximo à direita.
- O número pequeno abaixo do percentual diz o que é: "430 votos". Número solto sem rótulo não aparece.
- Cargo sem dados (`el-cargo--vazio`): uma linha de título com "Aguardando" e uma frase curta, sem altura de cartão cheio e sem repetir "Dados indisponíveis no momento" em cartões lado a lado.
- A ordem dos candidatos é por votos (lista), não por lado; a regra Lula à esquerda vale só onde os dois aparecem lado a lado.
- Percentual com duas casas decimais; alvo de toque do "Ver completo ›" de 44px.
