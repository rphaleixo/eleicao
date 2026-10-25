Apuração Eleições 2026 é o design system de um site de resultados de eleições pensado para o celular: um painel por cargo, com o mesmo padrão visual de situação em todas as telas. Os números vêm dos arquivos públicos do TSE e o site é independente: só o site do TSE é oficial.

## Fundamentos de conteúdo

- Escreva em português do Brasil, em frases curtas e na terceira pessoa: "Candidata A é eleita governadora de Santa Catarina". Sem emoji e sem exclamação.
- Números: ponto nos milhares, vírgula nos decimais (56.104.503; 54,30%). Percentuais sempre com 2 casas decimais, sobre votos válidos (base `vvc` do TSE), a menos que a base "votos totais" esteja escolhida e escrita na tela.
- Hora com segundos e data completa em quadros de projeção: "Status em 18:42:05, 25/10/2026, com 92,41% das urnas apuradas". Horário de Brasília.
- A situação é uma palavra do TSE, nunca da emissora: Aguardando dados, Em apuração, Eleito, 2º turno. Projeção e cenário são sempre rotulados "Projeção" ou "Cenário" e nunca se parecem com resultado oficial.
- "Não voto" é abstenções mais brancos mais nulos. Dep. Federal e Deputado Federal viram sempre "Deputado Federal"; "E se…" vira "Cenários".
- Rótulos de seção em caixa-alta no estilo `kicker` ("GOVERNADOR · 2º TURNO"); nomes de território em `titulo-display`; o resto em caixa normal.
- Fonte e aviso no rodapé: "Fonte: arquivos de divulgação de resultados do TSE. Site independente, sem vínculo com o TSE."

## Fundamentos visuais

- Estrutura: uma coluna de blocos empilhados, do dado mais agregado ao mais detalhado (placar, apuração, lista de disputas, tabela). Todo bloco é independente e tem o mesmo desenho: `cartao` com borda `linha` e raio `raio-cartao`, padding `esp-16`, intervalo `esp-14` entre blocos.
- Cor forte só para o que decide: o painel de destaque (`destaque-a` para `destaque-b`), a situação (`eleito`, `segundo-turno`) e o acento de ação (`acento`). O resto fica em `fundo`, `cartao`, `linha` e `texto-suave`.
- Temas: `claro` (primeiro) e `escuro`. No app, escolha o tema por `prefers-color-scheme` e grave em `data-theme` na raiz. O painel de destaque e a barra de topo são sempre escuros: marque-os com `data-theme="escuro"` para que `lado-a`, `lado-b`, `sobre-topo` e `ao-vivo` se resolvam sobre o fundo escuro.
- Situação nunca depende só da cor: ✓ e verde para eleito; "2º" e âmbar para 2º turno; "~" e tracejado para projeção; ponto azul para em apuração; cinza para aguardando; "−" e `perigo` para barrado ou queda.
- Cores de partido: os 34 partidos da predefinição de cores do Brasil são tokens `partido-<sigla>` (`partido-pt`, `partido-pl`, `partido-mdb`…). Pintam o chip, a borda da foto, a barra do candidato, os trechos da bancada e o líder no mapa. Use sempre o token, nunca o hexadecimal; partido sem cor usa `sem-cor`; federação usa a cor do primeiro partido.
- Lados de uma disputa de dois: o candidato A tem a marca ▲ e o B a marca ●; demais candidatos usam ■. A cor de cada lado é a do partido; sem partido ou com cores parecidas, use `lado-a` (azul) e `lado-b` (laranja), um par seguro para daltonismo. Atribua o lado ao candidato e mantenha em toda a eleição.
- Tipografia: títulos e números de destaque em `display` (Bebas Neue, caixa-alta, `placar-xl`, `placar-lg`, `titulo-display`, `kicker`); texto em `text` (Special Gothic); votos e percentuais em `num` (Arial Narrow, tabular). Ligue `font-variant-numeric: tabular-nums` em todo número que muda. Se as fontes não carregarem, as pilhas caem para Arial Narrow e fontes do sistema.
- Espaçamento: use apenas `esp-4` a `esp-32`; o 14px de `esp-14` é o da página e dos intervalos de cartão.
- Raios: `raio-cartao` nos cartões, `raio-xl` nos controles agrupados, `raio-lg` em botões e siglas, `raio-sm` em chips e fotos, `raio-pilula` em abas e selos.
- Sombra só em dois lugares: `sombra-painel` no Placar e `sombra-chave` na opção ativa do controle segmentado. Cartões separam-se do fundo por borda, não por sombra.
- Alvos de toque de 44px (abas, campos) e 40px (controle segmentado). Linhas de lista, 56px.
- Foco: anel sólido de 3px em `acento`, deslocado 2px, em todo controle.
- Movimento: o ponto ao vivo pulsa e as barras de progresso crescem em 0,5s. Ambos respeitam `prefers-reduced-motion`. Nenhum número anima a cada atualização.
- Contraste: texto em 4,5:1 ou mais sobre os fundos que a nota do token nomeia, nos dois temas. Lado A e lado B diferem em matiz (azul e laranja) e, no tema claro, em marca de forma; não dependa do vermelho contra o verde.
- Mobile primeiro: abas rolam na horizontal, tabelas rolam com a primeira coluna presa, a grade de disputas passa de uma para três colunas em `minmax(260px, 1fr)`.

## Ícones e marcas

- Não há biblioteca de ícones. A situação usa glifos de texto dentro de um círculo: ✓ eleito, 2º segundo turno, ~ projeção, ● em apuração, − barrado.
- Marcas de lado: ▲ lado A, ● lado B, ■ demais, desenhadas em CSS (`el-marca--a`, `--b`, `--c`), para daltônicos.
- Não há logotipo: o nome do site entra em `titulo-display`. Nunca use marca de órgão público nem a do TSE.

## Como cada componente entra

- Antes da apuração, Aguardando ocupa o lugar do Placar; depois, o Placar abre a tela de um cargo, a Apuracao vem logo abaixo e a Faixa anuncia a definição mais recente sob o Topo. Definicoes guarda o histórico.
- CartaoDisputa e LinhaEstado listam várias disputas; MapaBrasil e SeletorEstado escolhem o estado; LinhaCandidato lista candidatos dentro de uma disputa e FichaCandidato abre ao toque; ChipPartido e Selo acompanham o nome.
- Abas navegam entre cargos e filtram listas; Segmentado troca o turno e a base dos percentuais.
- Bancada e Hemiciclo mostram composição; Clausula, Cenarios, Tabela, Comparacao e GraficoEvolucao comparam e projetam; Campo escolhe município e candidato; Aviso explica método e projeção. BarraInferior é a navegação do celular e MenuLateral a do desktop (a partir de 1024px), com as mesmas áreas na mesma ordem. Moldura mostra onde cada peça fica em cada tamanho de tela.
- Estados e controles: Carregando, Erro, Vazio, VerMais, BarraStatus, Painel (recolhível, para o cálculo e as notas), Chave (liga e desliga), Tema (auto, claro, escuro), Anel (progresso) e Rodape (fonte e avisos).
- Mapas e dados: MapaMunicipio pinta um estado por município (escalas `escala-1..5` e `divergente-1..5`, hachura para sem dados); Nulos mostra os números digitados e os locais de votação; Desempenho divide votos em candidatos e legenda; Podio, Cadeiras e QuantoFalta resumem os destaques, a composição e o que falta apurar; Busca e FiltroRegiao encontram e recortam.

## Do CSS atual para os tokens

Ao migrar o `style.css` do app, troque as variáveis atuais por estas:

| variável atual | token |
| --- | --- |
| `--bg` | `fundo` |
| `--card` | `cartao` |
| `--txt` | `texto` |
| `--muted` | `texto-suave` |
| `--line` | `linha` |
| `--barra` | `trilho` |
| `--acento` | `acento` |
| `--acento-txt` | `sobre-acento` |
| `--topo`, `--topo-txt` | `topo`, `sobre-topo` |
| `--vivo` | `ao-vivo` |
| `--sit-eleito`, `--ok` | `eleito` |
| `--sit-segundo` | `segundo-turno` |
| `--aviso-bg`, `--aviso` | `aviso-fundo`, `aviso-texto` |
| `--hero-a`, `--hero-b` | `destaque-a`, `destaque-b` |
| `--abst`, `--aus` | `ausencia` |
| `#c0392b` solto | `perigo` |
| `#1a8f4e` e `#c77700` soltos | `eleito` e `segundo-turno` |
| `#8a94a3` (SEM_COR) | `sem-cor` |

As cores de partido continuam em `cores.js`: o design system só usa a variável `--cor` para recebê-las.

## Linguagem de redação

O sistema evita o visual de painel genérico (cartões macios, pílulas, trilho cinza). Cartões têm cantos de 3px e filete de 3px no topo; abas são um índice numerado em Bebas Neue; o segmentado é uma régua com marcadores quadrados; regiões formam um placar de células coladas; filtros usam caixa marcada; selos são etiquetas retas; campos têm filete inferior. Pílulas e círculos ficam só para pontos e marcas redondas (ao vivo, ●).

## Not synced

Lido do repositório rphaleixo/eleicao (commit 61d490b): as variáveis de cor do `style.css`, as 34 cores de partido de `cores.js`, o desenho dos estados de `mapa-brasil.js`, as posições do mapa de blocos de `seletor.js` e as convenções do documento de handoff. Não vieram: a escala de tamanhos de fonte original (0,75 a 2rem, 14 valores) foi consolidada em 12 estilos; o par azul e laranja de `lado-a` e `lado-b`, as marcas de forma, o Placar, o cartão de disputa, a faixa de definição, o estado antes da apuração e a barra inferior são propostas novas a partir das referências (CNN, G1, UOL, Jornal Razão). Componentes feitos à mão em CSS e SVG puros, sem biblioteca. A segunda e a terceira rodadas cobriram o restante do inventário do app: mapa por município, nulos, desempenho dos partidos, pódio, busca, filtros de região, cadeiras e barrados e o quanto falta apurar. O gráfico de barras editável de partidos usa o Desempenho com o Segmentado. Os municípios nas prévias são ilustrativos (diagrama de Voronoi sobre o contorno real do estado). Nada foi aplicado ao app. As cores de partido muito escuras (PL, UP) têm pouco contraste sobre o `cartao` do tema escuro como preenchimento de barra; o texto delas continua legível porque o chip leva texto branco.


Rodada 9b (novos componentes): BlocosEstados (mapa em blocos, visão padrão dos estados), Carrossel (espiada à direita e indicador), AjusteMapa (controles raros recolhidos). Tokens novos: foto-p (48px) e foto-g (96px), proporção 3:4. Placar chapado.
