# Prompt para a sessão nova (copie tudo abaixo da linha)

---

# 0. Instrução obrigatória e inegociável: leia a conversa NA ÍNTEGRA

Antes de qualquer outra coisa, leia o arquivo `docs/conversa-integra.md` do começo ao fim. Ele tem 9.156 linhas e 543 mensagens (214 do usuário e 329 do Claude), de 2026-10-04 a 2026-10-26. Não leia só o começo e o fim. Não leia só o resumo, nem só a busca de palavras. Leia o arquivo inteiro, em blocos (por exemplo, 800 linhas por vez, até a última linha). Ele é a memória do projeto: contém as decisões, as correções que o usuário fez, as preferências dele, os erros que já aconteceram e o porquê de cada regra. Um resumo seu não substitui isso.

Prove que leu: antes de começar a trabalhar, escreva ao usuário um parágrafo curto dizendo (a) quantas mensagens o arquivo tem e a data da primeira e da última, (b) quais foram as 5 viradas ou correções mais importantes que aparecem no meio da conversa (não as do começo nem as do fim) e (c) quais são as preferências do usuário que mais pesam no jeito de trabalhar. Se não conseguir citar com precisão, você ainda não leu: volte e leia.

O arquivo contém só o texto das mensagens: não traz as chamadas de ferramentas nem os resultados dos comandos. Quando a conversa disser "medi", "testei" ou "verifiquei", a evidência está nos arquivos do repositório (plano, scripts e testes) e você deve refazer a medida que for usar, não confiar só na frase.

# 1. O que é este projeto e qual é o seu papel

O usuário é Raphael Aleixo, Product Manager que não programa. Fale em português, em linguagem simples, sem negrito no corpo do texto (negrito só em títulos), explicando o contexto antes de decisões técnicas e dizendo com clareza o que não foi verificado.

Já existe e está pronto um site de apuração das eleições 2026 (https://eleicao.aleixo.workers.dev, repositório `rphaleixo/eleicao`, publicado pela Cloudflare Workers Builds a cada push na `main`). Esse trabalho acabou. Não o refaça e não o altere sem pedido explícito.

O seu trabalho é outro: o trabalho novo descrito na Parte B de `docs/historico-plano.md`. Objetivo: gravar, na conta paga da Cloudflare, o histórico das eleições presidenciais e municipais desde quando for possível, e permitir ver as informações de um candidato em várias eleições, com o histórico de partidos salvo na própria pessoa. Depois, levar isso ao app em telas novas.

# 2. Você assume todo o roadmap a partir daqui? Sim, com portões de aprovação

Você é o dono de todo o roadmap da Parte B (Fases 0, 1, 2, 2b, 3, 4, 5 e 6). Não é só a Fase 0. Mas você não corre sozinho: há paradas obrigatórias, em que você apresenta o resultado e espera a aprovação do usuário antes de seguir.

Portões:
1. Fim da Fase 0 (relatório): só leitura. Nada de criar banco, bucket ou tabela antes de o usuário aprovar o relatório. Esta é a primeira parada.
2. Antes de criar qualquer recurso na Cloudflare (D1 ou R2) e antes de cada carga grande: diga quantas linhas serão gravadas e o custo esperado, e peça o sim.
3. Fim de cada fase: relatório de qualidade, testes, hashes de commit e confirmação de que o site existente não quebrou.
4. Fase 2b (proporcionais) e Fase 4 (seção eleitoral): medir o volume real antes, e só carregar com aprovação.
5. Fase 3 (telas no app): cada tela nova é combinada com o usuário e passa pela instância do design system (a pasta `design-system/` do repositório é mantida por outra instância do Claude; você não edita o bundle de CSS, só o consome). Nada de tela nova sem combinar.
6. Documentação final: só depois de perguntar ao usuário.

Dentro dos portões, avance sozinho: escolha a ordem das tarefas, escreva os scripts e os testes, corrija o que quebrar.

# 3. O que é preciso fazer para chegar às instruções de execução (etapa de preparação, nesta ordem)

Antes de executar qualquer fase, cumpra estes passos:

1. Leia `docs/conversa-integra.md` na íntegra e escreva o parágrafo de prova da seção 0.
2. Leia `docs/historico-plano.md` inteiro (Parte A: o que o site já faz e as regras de produto que não podem quebrar; Parte B: o trabalho novo).
3. Leia `docs/tse/LEIA-ME.md`, `tools/tse/catalogo.py`, `tools/tse/qualidade-candidatos.py` e o `README.md`. O manifesto dos pacotes do TSE está em `docs/tse/catalogo-tse.json`.
4. Confira as credenciais, sem nunca mostrar o valor: as variáveis `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` devem existir no ambiente (por exemplo `[ -n "$CLOUDFLARE_API_TOKEN" ] && echo ok`). Verifique o token com `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` e mostre só o campo de status. Nunca imprima, grave em arquivo, comite nem cole o token em lugar nenhum. Se faltar variável ou o token for rejeitado, pare e diga ao usuário o que fazer: ele cria as variáveis no menu do ambiente da sessão ("Edit", em "Network secrets" ou em variáveis de ambiente) e abre uma sessão nova. Se um endereço for bloqueado pela rede do ambiente (em especial `*.r2.cloudflarestorage.com`), peça ao usuário a liberação.
5. Rode os testes do site (`node --test tests/*.test.js`): 252 devem passar. Isso mostra que o ponto de partida está íntegro.
6. Só então diga ao usuário, em poucas linhas, qual será o primeiro passo da Fase 0, e execute a Fase 0.

# 4. Decisões já tomadas pelo usuário (não reabrir)

- CPF e título de eleitor só como hash com segredo (HMAC). Nunca exibidos nem expostos em API.
- O cadastro de candidatos entra com todos os cargos. Os votos entram primeiro para Presidente, Governador, Senador e Prefeito (Fase 2). Os proporcionais (Deputado Federal, Estadual, Distrital e Vereador) entram na Fase 2b, depois de a Fase 2 estar conferida, ciclo a ciclo, em banco próprio. Seção eleitoral é a Fase 4, majoritários primeiro.
- Os novos bancos ficam na mesma conta Cloudflare do app.
- O histórico de partidos fica salvo na própria pessoa (`pessoa_partido`), derivado das candidaturas. A tela diz "visto em 2018 e 2022", nunca "filiado de 2018 a 2022".

# 5. A Fase 0, em detalhe (somente leitura)

1. Rode `python3 tools/tse/catalogo.py` para atualizar o manifesto (o portal às vezes responde 403 sem User-Agent de navegador; o script já manda um).
2. Para cada pacote relevante de resultados (Presidente, Governador, Senador, Prefeito; e, só para medir, os proporcionais) de 1994 a 2026, baixe os arquivos para um cache local (ou para o R2, se alcançável) e anote em tabela: pacote, arquivo, tamanho, hash SHA-256, número de linhas, codificação (latin1 ou UTF-8), separador e colunas. Compare as colunas entre os anos e liste as diferenças.
3. Resolva o que ainda não foi verificado: existe `SQ_CANDIDATO` nos arquivos de votação de 1994 a 2004? Como se liga o voto à candidatura nessas épocas? Os cadastros de 1996, 2000, 2002 (o download falhou) e 2004. Os preços e limites do R2. A alcançabilidade do R2 a partir deste ambiente. O "DivulgaCandContas" do TSE (respondeu "Access Denied" no ambiente antigo).
4. Rode `python3 tools/tse/qualidade-candidatos.py` para todos os anos e amplie o relatório: taxa de ligação por CPF, por título (quando o CPF está mascarado) e por nome mais nascimento (só como sugestão); trajetórias mais longas; fila de conflitos (mesmo CPF com nascimentos diferentes; CPFs diferentes com mesmo título e nascimento; homônimos).
5. Verifique se o token consegue criar e apagar um banco D1 de teste. Só crie esse banco de teste se o usuário autorizar na hora; caso contrário, só verifique o token.
6. Entregue ao usuário um relatório curto, em tabelas e em linguagem simples: linhas e tamanho por pacote, taxa de ligação por ano, conflitos, o que ainda não deu para verificar, a estimativa de escritas por fase e o custo esperado. Peça aprovação antes da Fase 1.

# 6. Como trabalhar no repositório

- Branch de trabalho: `claude/kind-volta-3eevxf`. Ao terminar uma entrega: `git push origin HEAD:claude/kind-volta-3eevxf` e `git push origin HEAD:main`. Antes, `git pull --no-rebase origin main`, porque outra instância atualiza `design-system/`. Se a branch já tiver sido mesclada e fechada, siga as regras de git do ambiente da sessão.
- O repositório é público: nunca comite segredo, token, CPF, título nem qualquer dado pessoal de candidato em claro.
- Testes do site: `node --test tests/*.test.js` (252 passando; não podem quebrar). Os testes novos ficam em `tests/historico/` ou em arquivo próprio.
- A carga em massa usa sempre os arquivos em lote do CDN do TSE (`cdn.tse.jus.br`), nunca a API de consulta nem os JSON ao vivo: o TSE responde 429 e "Access Denied" por volume.
- Para rodar Node com a rede do ambiente: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Cada fase termina com: relatório de qualidade, testes automáticos (integridade, reconciliação e ligação de pessoa), hashes de commit e confirmação de que o site existente não quebrou.

# 7. Primeira resposta esperada

1. O parágrafo de prova de leitura da seção 0 (mensagens, datas, 5 viradas do meio da conversa e preferências do usuário).
2. Uma confirmação de que leu o plano, de que as duas variáveis existem (sem mostrar valores) e de que os 252 testes passam.
3. O primeiro passo da Fase 0. Depois, execute a Fase 0 e pare no portão 1.
