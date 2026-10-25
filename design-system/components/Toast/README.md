Aviso flutuante e pequeno para estados temporários (lentidão, conexão, atualização falhou) que não devem empurrar o conteúdo.

Use no lugar de faixas de aviso no fluxo da página para: "Está demorando mais que o normal", dados desatualizados, erro ao atualizar, "Voltou a conectar". Para erro que impede a tela inteira, continue usando `Erro`/`Aviso` dentro do conteúdo. O consumidor fornece: a mensagem curta, a ação (ex.: "Tentar agora") e se some sozinho.

- Posição fixa (`el-toasts`): canto inferior direito a partir de 1024px, com 16px de margem e até 360px de largura; no celular, de lado a lado com 16px, logo acima da barra inferior (57px + 12px + área segura). Nunca ocupa espaço no fluxo: a altura da página não muda quando ele entra ou sai.
- Não cobre a barra inferior, os controles de zoom do mapa nem o botão de fechar de uma gaveta aberta; se houver conflito, sobe.
- É `role="status"` com `aria-live="polite"`: o leitor de tela anuncia, mas o foco não vai para o aviso. Não é um modal: não bloqueia a tela nem prende o foco.
- Máximo de um aviso por vez; um novo substitui o anterior com o mesmo assunto. Não repete: depois de dispensado, o mesmo aviso só volta se o estado mudar.
- Fecha com o "×" de 44px. Avisos de lentidão e erro ficam até a situação se resolver ou o usuário dispensar; avisos de sucesso ("Voltou a conectar") somem em 4 segundos. Nada de contagem regressiva visível.
- Texto de duas linhas no máximo, com o fato em negrito e uma frase de apoio. Ação em texto de 44px de altura, nunca só ícone. Status nunca só por cor: o ícone "!" e a palavra acompanham a borda âmbar.
- Reduz o movimento: sem animação quando o aparelho pede `prefers-reduced-motion`.
