# Handoff: aplicar o design system "Apuração Eleições 2026" no app

Para o Claude Code que implementa o repositório rphaleixo/eleicao. Quem pede é o Aleixo, que não programa: explique o que for fazendo em linguagem simples e peça aprovação ao fim de cada etapa. Este pacote foi montado a partir do repositório no commit 61d490b; confira o estado atual do código antes de cada etapa e não presuma que um arquivo ainda existe.

## 1. O que muda e o que não muda

Muda: aparência (cores, fontes, cantos, controles), a navegação (menu, abas, turno, região, busca) e o desenho das telas.

Não muda, a menos que o Aleixo peça: dados, cálculos, regras de eleito e projeção, rotas (`#/aba/estado/município`, incluindo os endereços antigos que `rota.js` aceita), a atualização a cada 10 segundos, o aviso de projeção de deputados, o modo `/ese` e o comportamento do 2º turno (recarrega a página). Os testes (`npm test`) devem continuar passando ao fim de cada etapa.

Princípios do design system: mobile primeiro, nada de informação só por cor (sempre ícone ou palavra junto), alvos de toque de 44px, foco visível, `prefers-reduced-motion` respeitado, texto sobre fundo com contraste de pelo menos 4,5:1 nos dois temas.

## 2. O que vem no pacote

Versão visual navegável do design system (para o Aleixo consultar; é privada e o Claude Code provavelmente não consegue abri-la, por isso o conteúdo está todo neste pacote): https://claude.ai/code/artifact/07806f07-5ec0-4e34-bc46-917e44871cf5

- `tokens.json`: cores (tema `claro` e `escuro`, incluindo 34 cores de partido `partido-<sigla>`, escalas `escala-1..5` e `divergente-1..5`), espaçamentos, cantos, sombras e tipografia. É a fonte única dos valores.
- `components/bundle.css`: todo o CSS dos componentes, classes com prefixo `el-`, usando só os tokens como variáveis CSS (`var(--fundo)`, `var(--acento)`…).
- `components/<Nome>/README.md` e `preview.html`: quando usar, o que o componente precisa receber, e um exemplo visual. Abra o `preview.html` para ver o componente pronto; o HTML dele é o modelo de marcação.
- `fonts/`: Bebas Neue (títulos e números grandes) e Special Gothic (texto).
- `README.md`: manual de marca e de uso, com a tabela das variáveis antigas e dos tokens novos.

Não há `tokens.css` no pacote. Gere um (por script pequeno ou à mão) com as variáveis do tema claro em `:root` e as do escuro em `[data-theme="escuro"]`, mais `prefers-color-scheme: dark` quando o tema estiver em Auto. Nomes: `--<nome do token>` (ex.: `--fundo`), `--font-display`, `--font-text`, `--font-num`.

## 3. Etapas, em ordem

Cada etapa é um commit ou PR próprio, com a conferência no fim. Não pule etapas e não misture duas.

Etapa 0, preparação. Coloque o pacote no repositório (sugestão: `public/ds/`), carregue as fontes com `@font-face`, gere o `tokens.css` e importe-o junto com o `bundle.css` no `index.html`, antes do `style.css`. Nada visível muda ainda. Pronto quando: a página abre igual, sem erro no console, as fontes carregam.

Etapa 1, camada visual global. Troque as variáveis do `style.css` pelas do design system, usando a tabela do README ("Do CSS atual para os tokens"). Troque a fonte do `body` e dos títulos, os cantos (agora quase retos), os cartões (filete de 3px no topo), os selos (etiquetas retas) e os campos (filete inferior). As cores de partido saem de `cores.js` e passam a vir dos tokens `partido-<sigla>`. Não altere o HTML. Pronto quando: todas as telas abrem, legíveis nos dois temas, sem texto cortado.

Etapa 2, controles. Troque abas, segmentado, filtros e a chave de "sem sub judice" pelos componentes `Abas`, `Segmentado`, `FiltroRegiao`, `Chave`. Copie a marcação dos `preview.html`. Pronto quando: tudo continua funcionando com teclado e toque, todos os controles com 44px de altura (os minis de 32px e os chips de 36px devem sumir).

Etapa 3, navegação e moldura. É a etapa mais importante para a experiência. Siga o componente `Moldura`:
- Topo de 48px com o carimbo de atualização dentro dele (`Topo`); a faixa separada (`BarraStatus`) só aparece em falha de conexão ou apuração encerrada.
- Uma linha de turno (1º, 2º, Comparar) e escopo (Brasil › região › estado), de 44px.
- Celular: `BarraInferior` fixa com as áreas principais (Brasil, Presidente, Governadores, Deputados) e "Mais". Desktop (1024px ou mais): `MenuLateral` de 240px com as 8 áreas, e coluna lateral de 320px para mapa e destaques, conteúdo central de até 720px.
- Orçamento de altura: o que vem antes do primeiro resultado soma no máximo uns 140px no celular. As abas de cargo saem do topo do celular e viram subníveis dentro de cada área.
- "Válidos × Totais" e "sem sub judice" vão para o `Painel` "Como calcular", fechado por padrão, abaixo do resultado.
- A aba "Estados" vira "Meu estado": guarda o último estado escolhido, mantém as setas de vizinhos e o índice de cargos.
Pronto quando: em 360px de largura, o primeiro resultado aparece sem rolar a página; todas as rotas antigas ainda abrem a tela certa.

Etapa 4, busca única. `Busca` no topo, com candidato e cidade, "Usar minha localização" (só pede permissão ao toque) e cidades populares. Substitui o `select` de município (5.570 opções). Pronto quando: achar uma cidade e um candidato leva no máximo 2 toques depois de digitar.

Etapa 5, telas, uma por vez e nesta ordem: início (Marcha da apuração), Presidente, Governadores, tela de um estado, Deputados (cadeiras, partidos, desempenho), Senadores, Partidos, Geografia (`MapaMunicipio`), Nulos, Cenários, Comparar turnos, ficha do candidato. Em cada uma use os componentes do pacote (`Placar`, `CartaoDisputa`, `LinhaCandidato`, `Podio`, `Cadeiras`, `Hemiciclo`, `Bancada`, `Tabela`, `Comparacao`, `QuantoFalta`, `Clausula`, `GraficoEvolucao`, `Anel`, `Selo`, `Aviso`…). Peça ao Aleixo para aprovar cada tela, no celular e no desktop, antes de seguir.

Etapa 6, estados e acabamento: `Carregando`, `Erro`, `Vazio`, `VerMais` (paginação de 50 em 50), `Rodape`, `Tema` (Auto, Claro, Escuro, guardado com tratamento para quando não há armazenamento). Pronto quando: nenhuma tela mostra "Carregando…" solto ou mensagem técnica de erro.

Etapa 7, só se o Aleixo pedir: dividir o `app.js` em módulos e atualizar só os números que mudam, em vez de trocar o HTML inteiro a cada 10 segundos. É a mudança mais arriscada; não a antecipe.

## 4. Cuidados específicos deste app

- O HTML das telas é trocado inteiro a cada atualização. Qualquer componente com estado (painel aberto, chave, campo digitado, rolagem de lista) precisa sobreviver a isso: o código já preserva a rolagem das faixas e não redesenha com um campo em foco; mantenha e estenda esse cuidado.
- Cores de partido muito escuras (PL, UP) têm pouco contraste como preenchimento de barra no tema escuro; o design system usa contorno branco e marcador em ladrilho. Siga os componentes e não troque por cor lisa.
- O lado A e o lado B de uma disputa usam azul e laranja (seguros para daltonismo) por padrão, ou as cores dos partidos com marcadores ▲ e ●. Não use vermelho contra verde.
- No 2º turno só há Presidente e seis governos (AC, AM, DF, ES, RN e TO; o RJ elegeu governador no 1º turno); Senado e deputados não aparecem. A navegação nova deve esconder, não deixar item morto.
- Mapas: o desenho dos estados vem de `mapa-brasil.js` (já usado no `MapaBrasil`). Os municípios do `MapaMunicipio` vêm do `/api/malha`; as prévias usam municípios ilustrativos, não dados reais.
- Texto: títulos em maiúsculas só nos rótulos de seção (Bebas Neue); corpo sem negrito corrido, negrito só em títulos e destaques curtos. Português do Brasil, números com ponto de milhar e vírgula decimal.

## 4b. Decisões de navegação (rodada 8)

As dez áreas do app, na ordem do menu lateral, em quatro grupos: Acompanhar (Apuração, a Marcha); Cargos (Presidente, Governadores, Senadores, Deputados); Estado (Meu estado, a antiga aba Estados); Análises (Partidos, Cenários, Geografia, Nulos). "E se…" passa a se chamar Cenários; "Dep. Federal" passa a Deputado Federal. Comparar turnos não é uma área: é o terceiro botão do seletor de turno (1º turno, 2º turno, Comparar), no alto de todas as telas.

Barra inferior do celular, cinco destinos: Apuração, Presidente, Governadores, Meu estado e Mais (Senadores, Deputados, Partidos, Cenários, Geografia, Nulos). No 1º turno, troque Governadores por Deputados na barra. Áreas que não existem no turno não aparecem.

O orçamento de altura de 140px inclui a linha de escopo recolhida de 46px: topo 48 + turno e escopo 44 + escopo 46 = 138px. O seletor de estado e região é o `FiltroRegiao` em escopo recolhido, que abre o `SeletorEstado` e as setas de vizinhos.

As telas Geografia, Nulos e Comparar turnos são montadas com as peças existentes, conforme as receitas nos README de `MapaMunicipio` e `Comparacao`; os controles do mapa vão num `Painel` "Ajustar mapa", fechado por padrão.

## 5. Conferência ao fim de cada etapa

1. `npm test` passa (o `package.json` do repositório define `node --test`).
2. Abrir nas larguras 360, 390, 768 e 1280px, nos temas claro e escuro, sem rolagem horizontal da página.
3. Percorrer a tela só com teclado: foco visível, ordem lógica.
4. Conferir em cada tela o 1º e o 2º turno e uma apuração em andamento e uma encerrada.
5. Mostrar ao Aleixo capturas de tela do antes e do depois, em linguagem simples, e esperar a aprovação.

## 6. Pontos que ainda dependem do Aleixo

As telas completas de referência (início, estado, ficha do candidato) não foram montadas no design system; os componentes e a `Moldura` existem, mas a composição das telas é decidida na etapa 5, com a aprovação dele. As medidas da `Moldura` (menu de 240px, conteúdo de até 720px, coluna lateral de 320px, orçamento de 140px) são propostas e podem ser ajustadas quando se vir a tela real. A ordem das áreas no menu e as 4 áreas principais da barra inferior também são sugestões.


## Rodada 9b (achados do site publicado)
Recopiar `design-system/components/bundle.css` para `public/ds/bundle.css` e regenerar `tokens.css` (tokens novos foto-p e foto-g). Itens: selo com SVG centrado; BlocosEstados como visão padrão da lista de estados (botão Lista alterna para LinhaEstado compacta, duas colunas a partir de 480px); estado sem dados mostra "Aguardando"; governo decidido no 1º turno mostra "Eleito no 1º turno"; Podio igual para Presidente e Governador, fotos 3:4 de um único tamanho, posição escondida quando há zero votos; Carrossel com espiada só à direita e "1 de 5"; AjusteMapa para os controles do mapa; Placar chapado; seletor de turno 44px com máximo de 480px; desktop com 720px + 320px e sem título repetido no topo; filete mais suave no escuro.


Rodada 10: Comparar turnos usa PremissasFixas (faixa de 44px presa abaixo do turno com painel Ajustar) e Duelo (vantagem do líder sobre o 2º, com a vantagem do 1º turno e a variação, uma linha de 44px por candidato). Correção de dados importante: Regra de base dos percentuais (vale para todo o sistema): votos válidos são os votos dados a candidatos e legendas. Brancos, nulos e abstenções ficam de fora do denominador. Os percentuais por candidato sobre votos válidos somam 100%. "Não voto" é a soma de abstenções, brancos e nulos; aparece só como barra à parte ou na base "Eleitores aptos" (comparecimento), nunca dentro do cálculo de votos válidos. O seletor de base tem dois valores: Votos válidos e Eleitores aptos. Se a fonte do TSE trouxer um campo de votos válidos que já inclua brancos, não use: recalcule somando candidatos e legendas.
