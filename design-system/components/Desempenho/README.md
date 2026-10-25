Por partido, uma barra horizontal dividida em votos nos candidatos e votos na legenda, os números dos dois lados e os três candidatos mais votados.

Use na aba Partidos e na tela de deputados. É a versão por partido do gráfico de barras editável: um controle `Segmentado` escolhe a medida (votos, cadeiras ou % dos válidos) e as barras se reordenam.

O consumidor fornece: o partido (ou federação), votos em candidatos, votos na legenda, os três mais votados e a medida escolhida.

- A barra tem 16px; o trecho de candidatos é cor lisa do partido (`partido-*`), o da legenda tem o padrão listrado na mesma cor. Legenda explica os dois, e os números ao lado repetem os valores: a barra não é a única fonte.
- Ordene por votos decrescente; federações são um bloco só e levam a cor do primeiro partido.
- "Mais votados" fica em `apoio`; cada nome leva à ficha do candidato.
- Votos em `num-md`, com ponto nos milhares.