Gaveta que abre por cima da tela, sem trocar de página. No app, ela guarda o conteúdo que antes ficava num painel recolhido "Como calcular" no fim de cada tela.

Por que mudou: o painel no rodapé exigia rolar até o fim da tela para achar as regras e a base dos percentuais. No menu, o acesso é o mesmo em todas as telas e a uma toque.

Como se monta:
- No desktop, o item "Como calcular" fica no `MenuLateral`, abaixo dos grupos (`el-menu__sobre`), acima do tema e da fonte. A gaveta abre pela direita (420px, `el-gaveta--lado`).
- No celular, o item fica na folha "Mais" da `BarraInferior`, e a gaveta sobe pela base (até 85% da altura).
- Em todas as telas, a base ativa aparece logo abaixo do título como `el-base-atual` ("Percentuais sobre votos válidos · alterar"). Tocar nela abre a mesma gaveta. Assim a premissa nunca fica escondida.

Conteúdo, nesta ordem: (1) Base dos percentuais, com `el-visao` (Votos válidos, Eleitores aptos) e a regra em uma linha; (2) Opções (`Chave`, ex.: sem votos sub judice); (3) "Nesta tela": as regras de cálculo da tela de onde foi aberta; (4) Fonte e aviso de site independente. A escolha vale para o app inteiro e é guardada no aparelho.

Acessibilidade: `role="dialog"`, `aria-modal`, o foco vai para o botão fechar ao abrir e volta ao item do menu ao fechar; Esc fecha; o fundo atrás fica inerte. O item do menu mostra `aria-expanded`.

Não duplique: depois da migração, remova o `Painel` "Como calcular" de todas as telas. O `Painel` continua existindo para outros textos recolhíveis.
