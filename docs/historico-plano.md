# Passagem de bastão: do site de apuração 2026 ao banco histórico de eleições

Este documento separa duas coisas.

1. Parte A: o trabalho que já foi feito (o site de apuração das eleições 2026). Está pronto e no ar. Esta conversa nova não precisa refazê-lo.
2. Parte B: o trabalho novo (banco histórico de eleições presidenciais e municipais, com histórico unificado de candidatos). Foi só planejado e medido. Nada foi criado no banco. A conversa nova começa aqui.

Quem lê isto numa sessão nova: comece pela Parte B, seção "Como começar a nova sessão". Leia a Parte A só para saber o que o site já faz e quais regras de produto não podem quebrar.

Estado do repositório quando este documento foi escrito: último commit `af606dc`, 252 testes passando (`node --test tests/*.test.js`), site publicado em https://eleicao.aleixo.workers.dev, branch de trabalho `claude/kind-volta-3eevxf` (o que vai para a `main` também vai para essa branch).

---

# Parte A. O que já foi feito (site de apuração 2026)

## A.1 O produto

Site mobile-first, sem build, que mostra a apuração das eleições brasileiras de 2026 lendo os JSON do TSE por um Worker da Cloudflare que faz de proxy e cache. Cadeia: Claude, GitHub `rphaleixo/eleicao`, Cloudflare Workers Builds (cada push para a `main` publica).

Estrutura do repositório:
- `public/`: o app (módulos ES, rotas por hash `#/aba/estado/município`, `public/app.js` é o arquivo central). `public/ds/bundle.css` e `public/ds/tokens.css` vêm do design system. `public/style.css` guarda só as regras do app.
- `worker/`: o proxy do TSE, o cache, o cron de 1 minuto e o histórico por minuto no KV `eleicao-historico`.
- `design-system/`: pasta de referência mantida por outra instância do Claude (HANDOFF.md, componentes com README e preview). O `public/ds/bundle.css` é uma cópia de `design-system/components/bundle.css`. Não editar o bundle: ele vem do design system.
- `tools/`: scripts (gerar tokens, medir alinhamento, medir toast, medir requisições do Comparar, coletar exterior, importar dados).
- `tests/`: 252 testes.

## A.2 Telas e recursos que existem

Apuração (Marcha), Evolução (gráfico minuto a minuto, em tela própria e em tela cheia), Presidente, Governadores, Senadores, Deputados, Meu estado, Partidos, Cenários, Geografia, Nulos e Comparar turnos (1º × 2º), nos dois turnos (no 2º turno só existem as áreas que fazem sentido).

Principais recursos já entregues:
- Seletor de turno, escopo recolhido (Brasil, região, estado), busca única de candidato e cidade, tema claro/escuro/automático, gaveta "Como calcular".
- Pódio "Candidatos por votos" com vantagem em votos e p.p. nas duas caixas; tabela do Comparar com linha de vantagem de Lula sobre Flávio e coluna Variação em votos e p.p.
- Comparar turnos por região (soma de votos dos estados, nunca média de percentuais), "Não voto" detalhado em abstenções, brancos e nulos, busca de cidade no painel "Onde".
- Gráfico de evolução com a emenda do intervalo sem apuração (votação prorrogada até as 19h no 2º turno de 2026), zoom do eixo ("Eixo completo | Ampliar") e texto sempre com 11px ou mais.
- Toasts fixos para avisos temporários (lentidão, falha ao atualizar, voltou a conectar), sem mudar a altura da página.
- Mapa de estados em três visões (Blocos, Mapa, Lista) e agrupamento por regiões.
- Web Analytics da Cloudflare no `index.html`.

## A.3 Regras de produto que não podem quebrar

- Votos válidos = votos em candidatos + legendas. Brancos, nulos e abstenções ficam fora. Os candidatos somam 100%.
- "Não voto" (abstenções + brancos + nulos) só existe na base "Eleitores aptos". Uma tela nunca mistura as duas bases.
- Todo percentual com duas casas decimais.
- Status nunca só por cor. Cantos retos. Filete de 3px no topo dos cartões.
- Nenhum horário de divulgação fixo no código. O 2º turno "começa" quando o TSE publica pelo menos uma seção apurada.
- Governos no 2º turno de 2026: AC, AM, DF, ES, RN, TO.
- Lula sempre à esquerda e Flávio Bolsonaro sempre à direita onde os dois aparecem lado a lado. A posição 1º/2º continua por votos.
- Preferências do dono do projeto: explicações em linguagem simples, sem negrito no corpo do texto, documentação só no final e perguntando antes, fazer somente o que foi pedido, dizer com clareza o que não foi verificado.

## A.4 Como o app lê os dados do TSE hoje

- Arquivos `-u.json` (resultado) e `-ab.json` (andamento) do TSE, por um Worker com allowlist. Códigos de eleição de 2026: 6257/6259 (1º turno federal e estadual) e 6258/6260 (2º turno).
- O TSE aplica 429 e "Access Denied" por volume de pedidos. Por isso qualquer carga em massa deve usar os arquivos em lote do CDN, nunca a API de consulta.
- O Worker grava um histórico por minuto no KV, só quando algo muda (Brasil, estados e exterior para Presidente, e estados para Governador).
- O app só pede arquivos de `public/dados/` que constam em `public/dados/indice.json`.

## A.5 Como trabalhar no repositório

- Testes: `node --test tests/*.test.js`. Fixam `location = { search: "?turno=1" }` para não depender da data.
- Prints e medições de tela usam Playwright (`/node-tools/node_modules`, Chromium em `/opt/pw-browsers/chromium`) e um servidor local de teste. Os scripts usados estavam no scratchpad da sessão antiga; recriar quando necessário. Para rodar Node com a rede do ambiente: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Fluxo de commit: ao terminar uma entrega, `git push origin HEAD:claude/kind-volta-3eevxf` e `git push origin HEAD:main`. Se a `main` tiver commits do design system, fazer `git pull --no-rebase origin main` antes.
- O design system muda por mensagens de outra instância; sempre copiar `design-system/components/bundle.css` para `public/ds/bundle.css` depois do pull.

## A.5.1 Pendências antigas deliberadamente não feitas

- Gráfico de evolução "por urna" (comparar no mesmo percentual de seções apuradas): aguarda decisão do dono entre usar os snapshots por minuto ou uma coleta externa dos arquivos auxiliares do TSE.
- Deslizar o dedo entre turnos.

---

# Parte B. O trabalho novo: banco histórico de eleições e candidatos

Esta parte só foi planejada e medida. Não existe banco, bucket, migração nem script de carga ainda. Nada disto foi aplicado à Cloudflare.

## B.1 Objetivo

Gravar, na conta paga da Cloudflare (sem o limite de 100 mil linhas por dia do plano gratuito), o histórico de eleições presidenciais e municipais desde quando for possível, e permitir ver as informações de um candidato em várias eleições, com o histórico de partidos salvo na própria pessoa.

## B.2 Decisões já tomadas pelo dono do projeto

1. CPF e título de eleitor só como hash, nunca exibidos nem expostos em API.
2. O cadastro de candidatos entra com todos os cargos. Os votos entram primeiro só para Presidente e Prefeito. (Depois, por decisão posterior: Governador e Senador entram junto na Fase 2; os proporcionais na Fase 2b.)
3. Os novos bancos ficam na mesma conta Cloudflare do app.
4. Seção eleitoral depois da Fase 3. Governador e proporcionais devem ser incluídos também (momento definido em B.7).
5. O histórico de partidos de um candidato fica salvo na própria pessoa.
6. Documentação foi autorizada agora, só para esta passagem de bastão.

## B.3 O que o TSE publica (verificado)

Fonte: portal de dados abertos do TSE (API CKAN em https://dadosabertos.tse.jus.br/api/3/action/), arquivos em `cdn.tse.jus.br`. Do sandbox, `curl` funciona nesses endereços; a ferramenta de busca de páginas da sessão antiga não alcançava o portal.

Resultados (`resultados-AAAA`):
- 1945, 1950, 1955, 1960 e 1989: só por UF, TXT (votação nominal, em partido e detalhe da apuração).
- 1994 e 1996: por município e zona, CSV (nominal, partido, detalhe).
- 1998 em diante: por município e zona e também por seção eleitoral, CSV, um arquivo por UF. Em 1998 há "Presidente - Votação por seção" e "Detalhe da apuração por seção".
- 2012 em diante: boletim de urna por UF (TXT em 2012 e 2016, CSV em 2018, 2022 e 2024), com hash.
- 2022, 2024 e 2026: "arquivos transmitidos para totalização" e logs do sistema de preparação das urnas. Não foram abertos.
- 2022: "Histórico de totalização - Presidente" (1º e 2º turno): 8.436 linhas no 1º turno, só do Brasil, votos acumulados por candidato. Não há série por estado.
- Existem também pacotes de eleições suplementares (2022 e 2024) e de "correspondências esperadas e efetivadas".
- Padrão de URL dos arquivos: `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_AAAA.zip`; por seção, `.../odsele/votacao_secao/votacao_secao_AAAA_UF.zip` (e `_BR` para Presidente); detalhe, `.../odsele/detalhe_votacao_munzona/...` e `.../detalhe_votacao_secao/...`; histórico 2022, `.../eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_1T_2022.zip`.

Candidatos (`candidatos-AAAA`): o catálogo lista todos os anos de eleição de 1933 a 2026. Cada ano traz o cadastro (`consulta_cand_AAAA.zip`, um CSV por UF mais um `_BRASIL.csv` com tudo), bens (`bem_candidato`), coligações, vagas e, em vários anos, motivo de cassação, fotos, propostas e certidões. A partir de 2018 há também o complementar (`consulta_cand_complementar`).

Eleitorado (`eleitorado-AAAA`): catálogo de 2014 a 2026 (mais "eleitorado atual").

Não existe, no catálogo, nenhuma base de filiação partidária com datas de entrada e saída. Existe o "DivulgaCandContas" do TSE (ficha do candidato), mas respondeu "Access Denied" do sandbox e não foi testado.

## B.4 Medidas reais

Tamanhos de arquivos compactados: município e zona 1994 = 42 MB; 2022 = 643 MB (todos os cargos); 2024 = 48 MB; seção 2022 Presidente (`_BR`) = 271 MB; seção 2022 SP = 901 MB; seção 2024 SP = 476 MB; seção 2000 SP = 58 MB; seção 1998 Presidente = 2,8 MB; histórico 2022 do 1º turno = 1,6 MB.

Linhas do arquivo `votacao_candidato_munzona_2022_BRASIL.csv` (50 colunas), por cargo e turno:

| Cargo (2022) | Linhas |
|---|---|
| Presidente 1º turno | 69.113 |
| Presidente 2º turno | 12.566 |
| Governador 1º turno | 52.786 |
| Governador 2º turno | 5.984 |
| Senador | 50.439 |
| Deputado Federal | 3.756.403 |
| Deputado Estadual | 5.419.572 |
| Deputado Distrital | 10.982 |
| Total | 9.377.845 |

Ou seja: os majoritários (Presidente, Governador, Senador) são cerca de 2% do arquivo, e os proporcionais são cerca de 98%.

Cadastro de candidatos (candidaturas por ano, todos os cargos): 2008 = 382.079; 2012 = 483.741; 2014 = 26.263; 2018 = 29.287; 2022 = 29.322; 2026 = 21.017; 1994 = 12.035; 1998 = 15.092; 2006 = 19.303; 2010 = 22.577. Os de 2016, 2020 e 2024 não foram abertos e, como 2008 e 2012, devem ser da ordem de centenas de milhares (eleições municipais).

Qualidade das chaves de identidade (percentual de candidaturas com valor válido): CPF 100% em 1994, 2006, 2008, 2010 e 2026; 99,8% em 2012; 99,9% em 2014 e 2022; 99,6% em 2018; 97,1% em 1998. Título de eleitor e data de nascimento têm cobertura equivalente (título: 99,4% em 1998). Cadastros de 1996, 2000, 2002 e 2004 não foram verificados (o download de 2002 falhou).

Armadilhas encontradas:
- Em 2012 vieram CPFs de 10 dígitos (zeros à esquerda perdidos): completar com zeros até 11.
- Em 2014 os candidatos a Presidente (e 28 candidatos no total) vieram com CPF `-1`; o título de eleitor está disponível. De 2018 em diante há uma minoria com `-4`.
- Entre 2018 e 2026, 2.609 dos 64.838 CPFs apareceram com nome completo diferente; 7.882 dos 11.202 candidatos que concorreram mais de uma vez mudaram de partido. Logo, nome, nome de urna e partido pertencem à candidatura, não à pessoa.
- Só entre 2018 e 2022, 259 nomes completos coincidem entre pessoas diferentes (homônimos): nunca ligar por nome sozinho.
- Mesmo CPF em eleições diferentes: 2014 e 2018 = 5.582; 2018 e 2022 = 6.413; 2022 e 2026 = 6.393; 2012 e 2014 = 9.382.

## B.5 Limites e preços da Cloudflare (D1 pago)

Fonte: páginas de preços e de limites do D1 na documentação da Cloudflare.
- Escritas: 50 milhões por mês incluídos, depois US$ 1 por milhão. Cada índice conta como escrita extra.
- Leituras: 25 bilhões por mês incluídos.
- Armazenamento: 5 GB incluídos, depois US$ 0,75 por GB ao mês.
- Cada banco: no máximo 10 GB (não aumenta). Até 50.000 bancos por conta e 1 TB no total.
- 100 parâmetros por consulta, 100 KB por comando, 30 segundos por consulta, importação de até 5 GB por arquivo. Cada banco processa uma consulta por vez.
- Recuperação por Time Travel por 30 dias.
- Preços e limites do R2 não foram verificados.

## B.6 Arquitetura proposta

- R2, bucket `eleicoes-bruto`: ZIPs originais, hash, manifesto e (para 2026) os snapshots por minuto.
- D1 `historico-nucleo`: dimensões (eleição, cargo, partido, município), pessoa, candidatura, votos por município e zona dos majoritários, detalhe e resumos.
- D1 separados para os proporcionais (um por ciclo ou por faixa de anos) e para seção eleitoral (um por eleição), sempre abaixo de 10 GB.
- Worker existente com rotas `/api/hist/*` (ficha da pessoa, busca por nome, resultado por eleição e escopo), com cache.
- A carga roda fora do Worker (script Node em container ou GitHub Actions): lê o ZIP em fluxo, converte a codificação (latin1 nos arquivos antigos), gera SQL em lotes e importa por `wrangler d1 execute --file`. Um Worker não descompacta 600 MB e o limite de 100 parâmetros por comando torna `INSERT` direto lento.

Modelo de dados (resumo):
- `eleicao`, `cargo`, `partido` (número, sigla da época, sigla sucessora, por exemplo PMDB para MDB e PFL para DEM para União), `municipio` (código TSE, UF, nome, código IBGE, validade).
- `pessoa` (id interno, hash do CPF, hash do título, nome completo, nascimento, UF e município de nascimento, partido atual, número de trocas), `pessoa_nome` (todos os nomes e nomes de urna, com ano) e `pessoa_partido` (linha do tempo de partidos: partido, primeiro ano visto, último ano visto, eleição de origem).
- `candidatura` (pessoa, eleição, `SQ_CANDIDATO`, cargo, UF, município, número, nome de urna, partido, coligação, situação do registro e resultado, gênero, instrução, ocupação, cor/raça, bens).
- `votacao_munzona`, `votacao_partido_munzona`, `detalhe_munzona` (aptos, comparecimento, abstenção, brancos, nulos), `resumo_candidatura`, `resumo_municipio`.
- `carga_log` (pacote, hash, linhas, status), `ligacao_manual`, `conflito_identidade`.
- Chaves numéricas, tabelas sem `rowid` nas de votos e poucos índices.

Ligação de pessoa entre eleições, nesta ordem: (1) CPF completado até 11 dígitos; (2) título de eleitor quando o CPF está mascarado; (3) nome completo mais data de nascimento, só como sugestão para revisão; (4) lista curada à mão (presidenciáveis anteriores a 1994 e casos residuais). Conflitos (mesmo CPF com nascimentos diferentes; CPFs diferentes com mesmo título e nascimento; homônimos) vão para `conflito_identidade` e não são resolvidos em silêncio.

Histórico de partidos: cada candidatura dá o partido daquele ano; trechos seguidos do mesmo partido se juntam, uma troca abre um trecho novo. A tela deve dizer "visto em 2018 e 2022", nunca "filiado de 2018 a 2022", porque entre as eleições não se sabe quando houve a troca.

Privacidade: guardar só hash com segredo (HMAC) do CPF e do título. Nenhuma tela ou API mostra CPF, título ou e-mail. Campos exibidos: nome, nome de urna, ano de nascimento, UF de nascimento.

## B.7 Fases e ordem (já ajustada pelas decisões)

- Fase 0 (somente leitura): ler o catálogo e montar o manifesto (pacote, recurso, URL, tamanho, data de modificação); baixar para a R2 (ou cache local) com hash; contar linhas e comparar o esquema de colunas entre anos; medir a ligação de candidatos (taxa por ano, trajetórias, fila de conflitos); verificar os cadastros de 1996, 2000, 2002 e 2004 e as colunas dos anos antigos (por exemplo se existe `SQ_CANDIDATO` nos arquivos de votação anteriores a 2006); confirmar se o R2 é alcançável da rede do ambiente. Aceite: relatório em tabela, sem escrita em banco.
- Fase 1: criar bancos e migrações versionadas no repositório; carregar dimensões e o cadastro de candidatos de todos os cargos de 1994 a 2026; rodar a ligação e gerar `pessoa`, `pessoa_nome` e `pessoa_partido`. Aceite: toda candidatura ligada a uma pessoa ou na fila de conflitos; contagens do banco iguais às dos CSVs; testes de integridade.
- Fase 2: votos de Presidente, Governador e Senador de 1994 a 2022 (e 2026 quando o portal publicar o definitivo) e de Prefeito de 1996 a 2024, por município e zona, nos dois turnos, mais detalhe e resumos. Estimativa: cerca de 190 mil linhas por ciclo geral em 2022, na ordem de 1,5 milhão no total. Conferências: soma de candidatos, legendas, brancos e nulos igual ao comparecimento de cada município e zona; totais por UF e Brasil iguais aos oficiais (total de Lula no 1º turno de 2022 como âncora); curva do histórico de 2022 como referência.
- Fase 2b: Deputado Federal, Estadual e Distrital (e Vereador nos municipais), votação em partido e detalhe, para o quociente eleitoral e os eleitos. Só 2022 tem 9,2 milhões de linhas de proporcionais; os oito ciclos gerais podem passar de 40 milhões, perto dos 50 milhões de escritas incluídos por mês. Carregar ciclo a ciclo, em banco próprio, e decidir antes se os votos nominais ficam por município (somando as zonas) ou por zona; sugestão: por município no D1 e por zona só nos arquivos brutos da R2.
- Fase 3: API (`/api/hist/pessoa/:id`, `/api/hist/busca?q=`, `/api/hist/eleicao/:ano/:cargo/:uf`) e telas no app: ficha do candidato com linha do tempo de candidaturas e de partidos, busca que lista as eleições, mapa por município da votação do mesmo candidato em eleições diferentes e comparação 2022 × 2026 por município. Cada tela nova é combinada com o dono do projeto e com a instância do design system antes de entrar.
- Fase 4 (opcional): seção eleitoral, primeiro para majoritários (Presidente, Governador, Senador e Prefeito). Proporcionais por seção só se houver pergunta concreta. Um banco D1 por eleição, ou Parquet na R2. Contar as linhas reais antes.
- Fase 5: 2026 ao vivo, com snapshots por minuto na R2 e série por município no D1 só quando o valor muda; o CSV definitivo do TSE substitui os dados ao vivo.
- Fase 6: operação (verificação semanal de `metadata_modified`, cópia de segurança do D1 para a R2, painel de custo e contagem).

Como entregar cada fase: scripts em `tools/tse/`, testes em `tests/`, relatório de qualidade e hashes de commit. Documentação final só depois de perguntar.

## B.8 Riscos

- Mudança de layout entre anos: mapear colunas na Fase 0 e ter um leitor por época.
- Códigos de município do TSE diferentes do IBGE, e municípios e zonas que mudaram.
- Siglas de partido que mudam: guardar a da época e a sucessora.
- CPF errado ou duplicado: nunca ligar por nome sozinho.
- Volume dos proporcionais e das seções: medir antes e carregar em lotes.
- Bloqueio do TSE por volume de pedidos: usar só os arquivos em lote do CDN.
- Índices custam escrita: poucos índices.

## B.9 Como começar a nova sessão

Pré-requisitos que dependem do dono do projeto:
1. Criar o token da Cloudflare: painel da Cloudflare, perfil, "API Tokens", "Create Token", "Create Custom Token", nome `eleicao-historico`. Permissões: Account, D1, Edit; Account, Workers R2 Storage, Edit. Não incluir "Workers Scripts" (o app continua publicado pelo GitHub). Account Resources: só a conta do projeto. Deixar "Client IP Address Filtering" vazio (o IP da sessão muda) e definir uma validade (por exemplo 90 dias).
2. Copiar também o Account ID (página inicial da conta, em Workers & Pages, painel da direita).
3. No app do Claude Code, no menu do ambiente (título da sessão), "Edit": criar `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` em "Network secrets" (ou "API credentials", ou como variáveis de ambiente). Nunca colar o token na conversa. Uma sessão nova lê as variáveis; a sessão antiga não.
4. Se o endereço do R2 (`*.r2.cloudflarestorage.com`) estiver bloqueado pela política de rede do ambiente, liberá-lo ali (o teste feito da sessão antiga não conseguiu conectar). A API `api.cloudflare.com` respondeu.

Passos da nova sessão:
1. Ler este documento (Parte B) e o `README.md`.
2. Conferir que `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` existem no ambiente (sem imprimir o valor) e que o token tem acesso (`GET https://api.cloudflare.com/client/v4/user/tokens/verify`).
3. Rodar a Fase 0 (somente leitura). Trazer ao dono do projeto a tabela real de linhas e tamanho por pacote, a taxa de ligação por ano e a fila de conflitos, antes de criar qualquer banco.
4. Só depois da aprovação, seguir para a Fase 1.

Regra para a nova sessão: não alterar o site existente (Parte A) nem as regras de produto sem pedido explícito. O trabalho novo vive em `tools/tse/`, migrações próprias e, na Fase 3, em rotas novas.
