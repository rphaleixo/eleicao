Tela própria "Evolução" (menu lateral, grupo Acompanhar): o gráfico minuto a minuto do resultado em tamanho grande, com os filtros das outras telas, leitura do ponto tocado e tabela dos últimos minutos. O botão "Tela cheia" abre o gráfico num `dialog` que ocupa a janela inteira (`el-cheia`).

Use quando o leitor quer acompanhar a virada ao longo da noite sem rolar a Apuração. O consumidor fornece: a série por minuto do escopo escolhido (percentuais dos candidatos, não voto, % apurado e a hora), o turno atual e as opções de lugar que o histórico realmente cobre.

- Filtros (`el-evolucao__filtros`): Onde (Brasil, regiões, estados que o histórico suporta; não mostre opção sem série), Base (Votos válidos ou Eleitores aptos; em Votos válidos a linha de não voto não existe), Período (Tudo, Última hora, Últimos 15 minutos), Linhas (Candidatos + não voto, só candidatos) e Eixo (Eixo completo, Ampliar). O turno é o do seletor de turno do alto da página. Filtros em linha que quebram no celular; seletores com no mínimo 150px e alvo de 44px.
- Eixo ampliado: mínimo = menor valor menos 5 p.p., máximo = maior valor mais 5 p.p., em múltiplos de 5, e o texto "Eixo ampliado: 15% a 45%" sempre à vista (ver `GraficoEvolucao`). A emenda do intervalo sem apuração (17h15 às 19h no 2º turno) continua, com a legenda abaixo do eixo.
- Gráfico: altura de 56% da janela, entre 300px e 620px; texto do eixo sempre com 11px ou mais, nunca escalado com o SVG. Linhas de 2,6px, não voto tracejado, cada série com nome escrito na leitura (cor nunca é a única legenda).
- Leitura (`el-evolucao__leitura`): hora, percentual de cada série e a diferença em p.p. e em votos do ponto tocado; sem toque, mostra o último ponto.
- Tabela dos últimos minutos abaixo do gráfico: hora, cada lado, não voto e % apurado, com números tabulares e duas casas decimais; é também a alternativa acessível ao gráfico.
- Tela cheia (`dialog.el-cheia`): barra de topo de 52px com título e "Fechar" de 44px, gráfico ocupando o resto, filtros resumidos no rodapé. No celular em pé, sugira girar o aparelho com uma linha de texto, sem forçar. Fecha com o botão e com Esc, devolve o foco ao botão "Tela cheia" e não guarda a escolha. Como todo `dialog`, `:not([open])` fica `display: none`.
- Não há rolagem horizontal; no celular o gráfico ocupa a largura toda com 16px de recuo.
- Preview com dados de exemplo.
- Desenhe o SVG com a largura real do quadro (recalcule o `viewBox` ao redimensionar) ou escreva os rótulos em HTML; nunca estique com `preserveAspectRatio="none"`, que achata o texto.
