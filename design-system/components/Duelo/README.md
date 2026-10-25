Bloco de comparação entre os dois turnos para um escopo (estado ou município). Substitui as linhas altas com 1º turno, 2º turno e variação empilhados.

Use na tela Comparar turnos: um `Duelo` por estado no escopo escolhido.

O consumidor fornece: nome do escopo, percentual apurado de cada turno, e para cada candidato os percentuais e votos do 1º e do 2º turno.

- Faixa de vantagem no alto (`el-duelo__vantagem`): quem lidera, por quantos pontos percentuais sobre o segundo colocado, e a mesma vantagem no 1º turno com a variação ("ampliou" ou "reduziu" X p.p.). É a primeira coisa que se lê.
- Tabela de uma linha por candidato (44px): nome, % no 1º turno, % no 2º turno e variação em p.p. O líder tem faixa lateral na cor do lado (`el-duelo__linha--lider`) e números em negrito; o destaque também aparece em texto ("lidera"), nunca só na cor.
- Em telas a partir de 600px, os votos absolutos aparecem sob cada percentual (`el-duelo__votos`).
- Sem dados no 2º turno: traço "—" no lugar de números e a faixa passa a descrever o 1º turno ("2º turno ainda sem dados apurados"). Não calcule vantagem com dado parcial como se fosse final.
- Candidato sem disputa no 2º turno recebe "—", sem variação.
- Todos os percentuais são sobre votos válidos: veja a regra no README geral.


Correção da regra (rodada 10b): o "não voto" só existe na base Eleitores aptos. Na base Votos válidos, nenhum elemento da tela mostra não voto: nem barra de composição, nem legenda, nem a opção "Não voto" em "Mapa: quem", nem a linha do Duelo. A barra de composição na base Votos válidos soma 100% com os candidatos e "Outros"; na base Eleitores aptos soma 100% incluindo o não voto. Uma tela nunca mistura as duas bases (por exemplo, líder sobre válidos e barra com não voto sobre aptos).

- Ordem fixa dos finalistas do 2º turno de presidente: Lula sempre à esquerda e Flávio Bolsonaro sempre à direita, qualquer que seja o resultado, o turno ou a base. Quem está à frente é dito por texto ou ícone, nunca pela posição.
