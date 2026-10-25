Ficha do candidato em diálogo: foto, nome, partido, cargo, situação, abas (Resumo, Perfil, Patrimônio, Trajetória) e campos em grade.

Use ao tocar em qualquer `LinhaCandidato`. O diálogo ocupa a largura da tela no celular (máximo de 720px) e rola por dentro, com o botão de fechar sempre visível.

O consumidor fornece: os dados do cadastro de candidatos (D1, nunca com CPF ou título em claro), o resultado na apuração, o partido e o token de cor.

- Foto de 96px com borda de 3px na cor do partido (`partido-*`); no celular, 72px.
- Abas em `role="tablist"` com a seleção marcada em `acento`; setas do teclado trocam de aba.
- Campos em `dl`: rótulo em `legenda` e `texto-suave`, valor em `corpo`; números em `num-md`.
- Fechar com o botão de 44px, `Esc` ou toque fora. Devolva o foco à linha que abriu a ficha.
- Mostre o selo de situação sempre com a palavra; não use só a cor da borda da foto.