Duas barras de composição (1º e 2º turno) e uma linha por candidato com o percentual nos dois turnos e a variação em pontos percentuais.

Use na tela "Comparar turnos", para o país, um estado ou um município. A mesma estrutura serve para comparar duas eleições (2022 e 2026).

O consumidor fornece: votos e percentuais de cada lado, de outros candidatos e de não voto (abstenções, brancos e nulos), nos dois turnos.

- A barra de composição tem 14px, cantos arredondados e quatro trechos: lado A, lado B, outros (`ausencia`) e não voto (hachurado). A legenda traz as marcas ▲ e ●.
- Variação com sinal e unidade: "+0,90 p.p." em `eleito` e "−0,10 p.p." em `perigo`. O sinal decide a leitura; a cor reforça.
- Percentuais com 2 casas, sobre votos válidos; o não voto aparece só na barra, nunca na soma de 100%.
- Em município, mostre também "quem liderou" como selo ao lado do nome.

Receita da tela "Comparar turnos" do app (rodada 8). A tela completa se monta com peças do sistema, nesta ordem: seletor de turno em destaque (Comparar); `FiltroRegiao` em escopo recolhido para escolher o lugar (Brasil, estado, município); as duas barras de composição; uma linha por lado com 1º turno, 2º turno, variação em pontos percentuais e variação em votos (a linha "sem candidato" mostra o texto em vez de barra); o mapa por município (`MapaMunicipio` com a escala divergente quando a medida é variação, e a escala sequencial quando é percentual); e, para o exterior, uma `Tabela` por país com ordenação e a coluna de cidades. Os controles do mapa (percentual sobre aptos ou válidos, quem, o que mostrar) ficam num `Painel` "Ajustar mapa", fechado por padrão, com um `Segmentado` por linha; não ficam à vista, para o mapa e o quadro aparecerem sem rolar. A variação em votos aparece sob a variação em pontos, com o sinal e a seta (▲ ▼).


Rodada 9: os controles do mapa vão no painel `AjusteMapa` e a nota "votos no 1º turno" não pode deixar palavra órfã (`white-space: nowrap` na variação).


Rodada 10: o bloco por escopo agora é o `Duelo`, e as premissas ficam na faixa `PremissasFixas`. Regra de base dos percentuais (vale para todo o sistema): votos válidos são os votos dados a candidatos e legendas. Brancos, nulos e abstenções ficam de fora do denominador. Os percentuais por candidato sobre votos válidos somam 100%. "Não voto" é a soma de abstenções, brancos e nulos; aparece só como barra à parte ou na base "Eleitores aptos" (comparecimento), nunca dentro do cálculo de votos válidos. O seletor de base tem dois valores: Votos válidos e Eleitores aptos. Se a fonte do TSE trouxer um campo de votos válidos que já inclua brancos, não use: recalcule somando candidatos e legendas.
