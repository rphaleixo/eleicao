# Prompt para a sessão nova (copie tudo abaixo da linha)

---

Você está continuando um projeto do Raphael Aleixo (Product Manager, não programa; escreva em português, em linguagem simples, sem negrito no corpo do texto, só em títulos; explique o contexto antes de decisões técnicas; diga com clareza o que NÃO conseguiu verificar; faça somente o que for pedido; não gere documentação sem perguntar antes).

## Situação em uma frase

O site de apuração das eleições 2026 (https://eleicao.aleixo.workers.dev, repositório GitHub `rphaleixo/eleicao`, publicado pela Cloudflare Workers Builds a cada push na `main`) está pronto e no ar. O trabalho de agora é outro: montar, na Cloudflare paga, um banco histórico de eleições presidenciais e municipais desde quando for possível, com o histórico unificado de candidatos (a mesma pessoa em várias eleições, com a linha do tempo de partidos salva na própria pessoa).

## Leia primeiro, nesta ordem

1. `docs/historico-plano.md`: o plano completo. A Parte A resume o que o site já faz e as regras de produto que não podem quebrar; a Parte B é o trabalho novo (decisões já tomadas, o que o TSE publica, medidas reais, limites do D1, arquitetura, modelo de dados, fases, riscos).
2. `docs/tse/LEIA-ME.md`: lista os arquivos de apoio.
3. `docs/tse/catalogo-tse.json`: manifesto dos pacotes e URLs do TSE (resultados, candidatos, eleitorado).
4. `tools/tse/catalogo.py` e `tools/tse/qualidade-candidatos.py`: scripts da Fase 0 já escritos e testados (somente leitura).
5. `README.md` do repositório.

## Decisões já tomadas pelo Raphael (não reabrir)

- CPF e título de eleitor só como hash com segredo (HMAC); nunca exibidos nem expostos em API.
- O cadastro de candidatos entra com todos os cargos. Os votos entram primeiro para Presidente, Governador, Senador e Prefeito (Fase 2). Os proporcionais (Deputado Federal, Estadual, Distrital e Vereador) entram na Fase 2b, depois da Fase 2 conferida, ciclo a ciclo, em banco próprio. Seção eleitoral é a Fase 4 (majoritários primeiro).
- Os novos bancos ficam na mesma conta Cloudflare do app.
- O histórico de partidos fica salvo na própria pessoa (tabela `pessoa_partido`), derivado das candidaturas. A tela deve dizer "visto em 2018 e 2022", nunca "filiado de 2018 a 2022".
- Não alterar o site existente (pasta `public/`, `worker/`) nem as regras de produto sem pedido explícito. O trabalho novo vive em `tools/tse/`, em migrações próprias e, na Fase 3, em rotas novas.

## O que foi medido e o que NÃO foi verificado

Medido (detalhes na Parte B do plano): catálogo do TSE de 1933 a 2026; resultados por município e zona de 1994 a 2026 e por seção de 1998 em diante; boletim de urna de 2012 em diante; o arquivo de 2022 por município e zona tem 9.377.845 linhas, das quais Presidente 81.679, Governador 58.770, Senador 50.439 e proporcionais cerca de 9,19 milhões; cobertura de CPF, título e nascimento por ano (99,6% a 100% de 2006 a 2026; 97,1% em 1998); armadilhas (CPF de 10 dígitos em 2012, CPF `-1` em 2014 e `-4` na minoria de 2018 em diante, homônimos); D1 pago (50 milhões de escritas por mês incluídos, 10 GB por banco, 100 parâmetros por comando).

Não verificado: cadastros de 1996, 2000, 2002 (o download falhou) e 2004; colunas dos arquivos de votação anteriores a 2006 (por exemplo se existe `SQ_CANDIDATO`); preços e limites do R2; se o endereço do R2 (`*.r2.cloudflarestorage.com`) é alcançável pela rede deste ambiente (da sessão antiga não conectou); o "DivulgaCandContas" do TSE (respondeu "Access Denied" do ambiente antigo).

## Credenciais

O Raphael criou um token de API da Cloudflare (permissões: Account, D1, Edit e Account, Workers R2 Storage, Edit) e as variáveis `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no ambiente. Nunca imprima, grave em arquivo, comite ou cole o valor do token em lugar nenhum. Antes de qualquer coisa:

1. Confirme que as duas variáveis existem (por exemplo `[ -n "$CLOUDFLARE_API_TOKEN" ] && echo ok`), sem mostrar o valor.
2. Verifique o token com `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` e mostre só o campo de status, nunca o token.
3. Se faltar variável ou o token for rejeitado, pare e diga ao Raphael o que fazer (ele cria as variáveis no menu do ambiente da sessão, em "Edit", em "Network secrets" ou variáveis de ambiente; uma sessão nova lê as variáveis). Se um host for bloqueado pela rede do ambiente, leia a documentação do ambiente (rede) e peça a liberação ao Raphael.

## O que fazer agora: Fase 0 (somente leitura)

Não crie banco, bucket nem tabela antes de o Raphael aprovar o relatório da Fase 0.

1. Rode `python3 tools/tse/catalogo.py` para atualizar o manifesto se necessário e confira que o portal do TSE responde (use User-Agent de navegador).
2. Para cada pacote relevante de resultados (Presidente, Governador, Senador, Prefeito; e, só para medir, os proporcionais) de 1994 a 2026, baixe os arquivos para um cache local (ou R2, se for alcançável) e anote em tabela: pacote, arquivo, tamanho, hash SHA-256, número de linhas, codificação (latin1 ou UTF-8), separador e lista de colunas. Compare as colunas entre anos e liste as diferenças.
3. Confirme os pontos não verificados acima. Em especial: existe `SQ_CANDIDATO` nos arquivos de votação de 1994 a 2004? Como se liga o voto à candidatura nessas épocas?
4. Rode `python3 tools/tse/qualidade-candidatos.py` para todos os anos disponíveis (1994 a 2026, incluindo 1996, 2000, 2002 e 2004) e amplie o relatório: taxa de ligação por CPF, por título (quando o CPF está mascarado) e por nome e nascimento (só como sugestão), trajetórias mais longas e fila de conflitos (mesmo CPF com nascimentos diferentes; CPFs diferentes com mesmo título e nascimento; homônimos).
5. Verifique se o R2 é alcançável da rede deste ambiente e se o token consegue criar um banco D1 de teste e apagá-lo (se o Raphael autorizar um teste de criação; caso contrário, apenas verifique o token).
6. Entregue ao Raphael um relatório curto, em tabelas e em linguagem simples: linhas e tamanho por pacote, taxa de ligação por ano, conflitos, o que ainda não deu para verificar, a estimativa final de escritas por fase e o custo esperado. Peça aprovação antes da Fase 1.

## Como trabalhar no repositório

- Branch de trabalho: `claude/kind-volta-3eevxf`. Ao terminar uma entrega: `git push origin HEAD:claude/kind-volta-3eevxf` e `git push origin HEAD:main` (faça `git pull --no-rebase origin main` antes, porque outra instância atualiza `design-system/`). Se a branch de trabalho já tiver sido mesclada e fechada, siga as regras de git do ambiente da sessão.
- Testes do site: `node --test tests/*.test.js` (252 passando; não devem quebrar). Testes novos do trabalho histórico ficam em `tests/historico/` ou em arquivo próprio.
- A carga em massa usa sempre os arquivos em lote do CDN do TSE (`cdn.tse.jus.br`), nunca a API de consulta nem os JSON ao vivo (o TSE responde 429 e "Access Denied" por volume).
- Para rodar Node com a rede do ambiente: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Cada fase termina com: relatório de qualidade, testes automáticos (integridade, reconciliação e ligação de pessoa), hashes de commit e confirmação de que nada do site existente quebrou.
- A documentação final só depois de perguntar ao Raphael.

## Primeira resposta esperada

Confirme, em poucas linhas, que leu o plano, que as variáveis existem (sem mostrar valores), e diga qual será o primeiro passo da Fase 0. Depois execute a Fase 0.
