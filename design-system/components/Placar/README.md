Painel de destaque que responde, em cinco segundos, quem está na frente: percentual grande de cada lado, barra bicolor com a linha de 50% e a vantagem em votos.

Use no topo da tela de um cargo (presidente, governador de um estado). Em disputas com mais de dois candidatos, mostre os dois primeiros nos lados e agrupe o resto num trecho neutro (`ausencia`) da barra.

O consumidor fornece: cargo e turno (kicker), nome e percentual de cada lado, votos, percentual de urnas apuradas, hora da última atualização e a situação (selo).

- Marque o painel com `data-theme="escuro"`: ele é sempre um fundo escuro (`destaque-a` para `destaque-b`) e os tokens `lado-a` e `lado-b` assumem os valores claros.
- A cor de cada lado é a do partido do candidato: passe `--lado-a` e `--lado-b` no elemento (`style="--lado-a: var(--partido-pt); --lado-b: var(--partido-pl)"`). Sem partido, ou com dois candidatos de cores parecidas, os valores padrão `lado-a` (azul) e `lado-b` (laranja) separam os lados para daltônicos. A barra fica dentro de uma moldura branca e as marcas ▲ e ● em quadradinhos brancos, para as cores escuras dos partidos lerem sobre o fundo azul-marinho.
- O lado pertence ao candidato, não à posição no ranking: o mesmo candidato é ▲ e o outro ● em toda a eleição, para o leitor não reaprender a cor a cada tela.
- Percentuais com 2 casas, sobre votos válidos (base `vvc` do TSE).
- Sempre mostre urnas apuradas e a hora da atualização no rodapé; sem isso o placar não é um resultado, é um palpite.
- Quando a disputa é definida, troque a barra pela frase "Fulana eleita" e o selo Eleito.
- Não anime o percentual a cada atualização; troque o valor e destaque só a vantagem.

Rodada 9: o Placar agora é chapado (cor sólida de `destaque-a`, sem gradiente e sem sombra), alinhado à linguagem de redação.


Regra de base dos percentuais (vale para todo o sistema): votos válidos são os votos dados a candidatos e legendas. Brancos, nulos e abstenções ficam de fora do denominador. Os percentuais por candidato sobre votos válidos somam 100%. "Não voto" é a soma de abstenções, brancos e nulos; aparece só como barra à parte ou na base "Eleitores aptos" (comparecimento), nunca dentro do cálculo de votos válidos. O seletor de base tem dois valores: Votos válidos e Eleitores aptos. Se a fonte do TSE trouxer um campo de votos válidos que já inclua brancos, não use: recalcule somando candidatos e legendas.

- A marca de 50% também vale para qualquer outra barra de dois lados do sistema (classe `el-composicao--meta`, ver `Comparacao`).
