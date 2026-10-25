Faixa de 44px que fica presa logo abaixo do topo e do seletor de turno, com as escolhas ativas da tela (onde, base dos percentuais, o que o mapa mostra). Um toque em "Ajustar" abre o painel por cima do conteúdo, sem rolar a página.

Use em Comparar turnos, Geografia e Nulos, onde o resultado depende de várias premissas.

- Presa com `position: sticky` em `--alt-fixa` (topo 48 + turno 48 = 96px). Ela ocupa 44px fixos: os controles que antes ocupavam cerca de 300px no começo da tela saem do fluxo.
- A lista rola na horizontal se faltar espaço; cada premissa tem rótulo pequeno e valor.
- O painel abre sobre o conteúdo (`max-height: 70vh`, rola por dentro). Aplicar fecha o painel; mudar uma escolha atualiza a tela e a faixa na hora.
- `aria-expanded` no botão; o painel usa `hidden` quando fechado.
- Todos os controles ficam no painel, na ordem: onde, município, base dos percentuais, mapa.


O valor da base escolhida muda o que as demais seções mostram. Correção da regra (rodada 10b): o "não voto" só existe na base Eleitores aptos. Na base Votos válidos, nenhum elemento da tela mostra não voto: nem barra de composição, nem legenda, nem a opção "Não voto" em "Mapa: quem", nem a linha do Duelo. A barra de composição na base Votos válidos soma 100% com os candidatos e "Outros"; na base Eleitores aptos soma 100% incluindo o não voto. Uma tela nunca mistura as duas bases (por exemplo, líder sobre válidos e barra com não voto sobre aptos).
