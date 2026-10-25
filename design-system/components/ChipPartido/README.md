Etiqueta com a sigla do partido (ou da federação) na cor do partido.

Use ao lado do nome do candidato, em linhas de ranking, cartões de disputa, legendas de bancada e no Placar. Os 34 partidos da predefinição de cores do Brasil (Wikipédia) são tokens `partido-<sigla>`: `partido-pt`, `partido-pl`, `partido-mdb`, `partido-pcdob`, `partido-uniao`, e assim por diante. PNM e PMN dividem uma cor; Pode e Podemos, outra.

O consumidor fornece: a sigla e o nome do token em `--cor` (por exemplo `style="--cor: var(--partido-pt)"`). Para federação, use a cor do primeiro partido da lista. No app, `corPartido()` de `cores.js` devolve o mesmo valor.

- Texto branco por padrão. Nos partidos de fundo claro (Missão, PDT, Pode, Podemos, PP, PSB, PSD) use `el-chip--clara`, com texto `#1a1a1a`: é a regra do app (luminância relativa do fundo acima de 0,4).
- Sem cor definida cai em `sem-cor`. Sem partido, o chip tracejado.
- A cor do partido identifica, mas não decide a leitura de lado (A ou B) nem a situação: isso é papel da marca ▲ ou ●, e do selo.
- Os mesmos tokens pintam a borda da foto, a barra do candidato e os trechos da bancada. Cores muito escuras (PL, UP) têm pouco contraste sobre o `cartao` do tema escuro como preenchimento: a barra continua acompanhada do número e do nome.