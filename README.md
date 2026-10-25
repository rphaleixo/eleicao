# Apuração Eleições 2026

Site independente que acompanha as eleições brasileiras de 2026 em tempo real, pensado para o celular. Lê os arquivos públicos de divulgação do TSE e mostra presidente, governadores, senadores e deputados, do país ao município, com projeções de cadeiras, cenários, comparações entre turnos e mapas. Sem vínculo com o TSE: só o site do TSE é oficial.

Produção: https://eleicao.censomusicalrj.workers.dev

## Como funciona

- Publicação: GitHub (`rphaleixo/eleicao`) → Cloudflare Workers Builds. Todo push no `main` publica.
- Front-end em `public/`: módulos JavaScript puros, sem build. `app.js` guarda o estado; cada tela tem um módulo. Endereços por hash: `#/aba/estado/município`.
- Worker em `worker/index.js`: proxy do TSE que só aceita caminhos conhecidos, com cache de borda. Um cron de 1 minuto grava o histórico da apuração no KV (gráficos e marcha). Rotas: `/api/historico`, `/api/eventos`, `/api/resultados-presidente`, `/api/resultados-governador`, `/api/candidato`, `/api/malha/{UF|BR}`, `/api/senadores-mandato`. O D1 guarda o cadastro de candidatos (nunca CPF ou título em claro).
- Turno: `?turno=1` ou `?turno=2`. A partir de 25/10 o site abre no 2º turno. Códigos de eleição do TSE: 1º turno federal 6257 e estadual 6259; 2º turno 6258 e 6260. A lista de municípios vem sempre do 1º turno.
- `/ese`: página só com os cenários "e se…".

## Telas

No topo: 1º turno, 2º turno e Comparar. Abas: Marcha da apuração, Presidente, Governadores, Senadores, Deputados, Partidos, E se…, Geografia, Nulos, Estados. A tela Comparar turnos mostra Lula, Flávio Bolsonaro, outros e não voto nos dois turnos, por país, estado e município, em quadro, barras e mapa.

## Dados

| Fonte | O que traz |
| --- | --- |
| Resultado `-u` do TSE (`resultados.tse.jus.br/oficial/ele2026/{eleição}/dados/...`) | Candidatos, votos, brancos, nulos, aptos, abstenção, % de seções, do país ao município |
| Andamento `-ab` (país e cada estado) | % de seções por estado; no arquivo do estado, aptos, comparecimento e abstenção de cada município |
| `config/mun-e006257-cm.json` | Municípios com código do TSE e do IBGE |
| IBGE (malhas, via `/api/malha`) | Contorno dos municípios |
| Dados abertos do TSE (`cdn.tse.jus.br/estatistica/sead/odsele`) | Votação por município e zona, por seção, e coordenadas dos locais de votação; saem dias depois da eleição |
| Registro digital do voto (`.../arquivo-urna/3220/...`) | Um arquivo por urna, com o número digitado em cada voto nulo |

Arquivos guardados no repositório (`public/dados/`): `presidente-t1-municipios.json` (1º turno por município), `presidente-t1-exterior.json` (1º turno nas 186 cidades do exterior) e `exterior-paises.json` (agrupamento das cidades por país, feito à mão, não oficial), `nulos-rj.json` e `nulos-rj-mapa.json` (números digitados nos nulos do RJ).

## Regras do projeto

- Percentuais com 2 casas decimais. % de candidato = votos ÷ votos válidos na base do TSE (`vvc`). Base alternativa: votos totais, com brancos, nulos e abstenções como "candidatos".
- Status visual único: eleito (verde, ✓), 2º turno (âmbar), projeção (tracejado).
- Cadeiras de deputado: quociente eleitoral, quociente partidário e sobras, com as regras de 2026 (10% do quociente para o candidato; sobras com partido a 80% e candidato a 20%, e rodada final livre, conforme as ADIs 7228, 7263 e 7325 do STF). Cláusula de desempenho conforme a EC 97/2017.
- Cenários e projeções são sempre rotulados como tais.
- Segurança: nunca expor CPF ou título; chaves e CSVs brutos ficam fora do repositório; nunca desligar a verificação TLS.

## Cuidados com o TSE

O TSE bloqueia por 10 minutos IPs com mais de 100 pedidos por segundo ou com muitos erros 404. Por isso o proxy valida os caminhos e o 2º turno só é pedido a partir das 17h (Brasília) de 25/10. Trabalho pesado fica em `tools/`, não no Worker.

## Scripts

Precisam do Node 18 ou mais novo e não instalam nada.

| Comando | Para quê |
| --- | --- |
| `node --test tests/*.test.js` | Roda os testes |
| `node tools/nulos-digitados.mjs rj --ritmo 40` | Conta os números digitados nos nulos de um estado, urna a urna. Retoma de onde parou |
| `node tools/preparar-nulos-mapa.mjs rj --urnas … --locais … --resumo … --saida …` | Gera o arquivo do mapa de nulos |
| `node tools/importar-presidente-munzona.mjs --candidatos … --detalhe … --turno 1 --municipios …` | Gera `presidente-tN-municipios.json` a partir dos dados abertos do TSE |

## Limites conhecidos

- Nulos por número digitado: só o RJ. No presidente fica 387 nulos (0,13%) abaixo do total do TSE; governador e senador batem.
- Seção não é sempre uma urna: seções agregadas votam na urna de outra seção.
- Zonas eleitorais não têm contorno oficial.
- 2º turno por município ao vivo: desde a largada, o site lê o andamento dos 27 estados e busca só os municípios que já têm seções apuradas (um arquivo por município, 6 por vez). Municípios parciais aparecem no mapa com o % apurado. Quando a apuração terminar, gerar `presidente-t2-municipios.json` para a tela abrir na hora.
