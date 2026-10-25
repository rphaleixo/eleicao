Escolha do tema: Auto (segue o aparelho), Claro ou Escuro.

Use no topo ou no menu. O app hoje só segue o aparelho; este controle deixa a pessoa fixar um tema, útil à noite de apuração.

- Troca o atributo `data-theme` do `html` e guarda a escolha no aparelho, com tratamento para quando o armazenamento não existe.
- A opção ativa inverte (fundo `texto`, letra `fundo`), e o rótulo é sempre escrito.
Onde fica (rodada 10b): o controle Auto, Claro, Escuro precisa estar sempre ao alcance, sem ocupar altura do topo. No desktop, no pé do `MenuLateral`, acima da fonte dos dados. No celular, no alto da folha "Mais" da `BarraInferior` e também no `Rodape`. Nunca no topo de 48px. O padrão é Auto (segue o aparelho). A escolha é guardada com tratamento para quando não há armazenamento e aplicada em `data-theme` (`claro` ou `escuro`) no elemento raiz, nunca num cabeçalho isolado.
