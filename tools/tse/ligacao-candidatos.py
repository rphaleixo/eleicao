#!/usr/bin/env python3
"""Fase 0: mede a ligação de candidatos entre eleições a partir dos consulta_cand_AAAA.zip já baixados (somente leitura).
Ordem: (1) CPF completado a 11 dígitos; (2) título de eleitor (quando o CPF não existe ou está mascarado); (3) nome + nascimento,
só como sugestão (não liga). Conflitos: mesmo CPF com nascimentos diferentes; CPFs diferentes com o mesmo título; homônimos.
Nada de CPF/título em claro no relatório (só contagens e, para trajetórias, nome público + anos + cargos).
Uso: python3 -I tools/tse/ligacao-candidatos.py cache_dir relatorio.json [anos...]"""
import collections, csv, io, json, re, sys, unicodedata, zipfile

cache, saida = sys.argv[1:3]
csv.field_size_limit(1 << 24)
SEM = {"", "-1", "-3", "-4", "#NULO#", "#NE#", "#NULO", "NULO", "0", "00000000000"}
CAMPOS = {"sq": ["SQ_CANDIDATO", "SEQUENCIAL_CANDIDATO"], "cpf": ["NR_CPF_CANDIDATO", "CPF_CANDIDATO"],
          "tit": ["NR_TITULO_ELEITORAL_CANDIDATO", "NUM_TITULO_ELEITORAL_CANDIDATO", "TITULO_ELEITORAL_CANDIDATO"],
          "nasc": ["DT_NASCIMENTO", "DATA_NASCIMENTO"], "nome": ["NM_CANDIDATO", "NOME_CANDIDATO"],
          "partido": ["SG_PARTIDO", "SIGLA_PARTIDO"], "cargo": ["DS_CARGO", "DESCRICAO_CARGO"], "uf": ["SG_UF", "SIGLA_UF", "SG_UE"]}

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()

def coluna(cols, nomes):
    for n in nomes:
        if n in cols: return n
    return None

def linhas_do_ano(ano):
    z = zipfile.ZipFile(f"{cache}/consulta_cand_{ano}.zip")
    membros = [i for i in z.infolist() if i.filename.lower().endswith((".csv", ".txt")) and not i.is_dir()]
    brasil = [i for i in membros if "BRASIL" in i.filename.upper()]
    usar = brasil or membros  # todos os estados num arquivo só, quando existir
    vistos = set()
    for info in usar:
        raw = z.open(info).read()
        try: txt = raw.decode("utf-8")
        except UnicodeDecodeError: txt = raw.decode("latin-1")
        cab = txt.split("\n", 1)[0]
        sep = max([";", ",", "\t"], key=cab.count)
        for x in csv.DictReader(io.StringIO(txt, newline=""), delimiter=sep):
            yield x

def ler_ano(ano):
    out, mapa = [], None
    for x in linhas_do_ano(ano):
        if mapa is None:
            cols = set(x.keys()); mapa = {k: coluna(cols, v) for k, v in CAMPOS.items()}
        g = lambda k: (x.get(mapa[k]) or "").strip() if mapa[k] else ""
        cpf = g("cpf"); cpf = None if cpf in SEM or not cpf.isdigit() else cpf.zfill(11)
        tit = g("tit"); tit = None if tit in SEM or not tit.isdigit() else tit.zfill(12)
        out.append((ano, g("sq"), cpf, tit, g("nasc") if g("nasc") not in SEM else "", norm(g("nome")), g("partido"), g("cargo"), g("uf")))
    return out, mapa

anos = [int(a) for a in sys.argv[3:] if a.isdigit()]
todas, rel_anos = [], {}
for ano in anos:
    try: linhas, mapa = ler_ano(ano)
    except Exception as e:
        rel_anos[ano] = {"erro": str(e)}; print(ano, "ERRO", e, file=sys.stderr); continue
    n = len(linhas) or 1
    rel_anos[ano] = {"candidaturas": len(linhas), "pct_cpf": round(100 * sum(1 for l in linhas if l[2]) / n, 2),
                     "pct_titulo": round(100 * sum(1 for l in linhas if l[3]) / n, 2),
                     "pct_nascimento": round(100 * sum(1 for l in linhas if l[4]) / n, 2),
                     "pct_sq": round(100 * sum(1 for l in linhas if l[1]) / n, 2), "colunas_nao_achadas": [k for k, v in mapa.items() if not v]}
    todas += linhas; print(ano, rel_anos[ano], file=sys.stderr, flush=True)

# título -> CPFs conhecidos
tit_cpfs = collections.defaultdict(set)
for _, _, cpf, tit, *_ in todas:
    if cpf and tit: tit_cpfs[tit].add(cpf)
conf_tit = sum(1 for v in tit_cpfs.values() if len(v) > 1)

SO_CPF = "--so-cpf" in sys.argv  # prova de reconciliação: ignora o título (só candidaturas com CPF próprio)

def pessoa(l):
    _, _, cpf, tit, *_ = l
    if cpf: return "c" + cpf, "cpf"
    if SO_CPF: return None, "sem_chave"
    if tit:
        c = tit_cpfs.get(tit)
        if c and len(c) == 1: return "c" + next(iter(c)), "titulo->cpf"
        return "t" + tit, "titulo"
    return None, "sem_chave"

pessoas = collections.defaultdict(list)
metodo = collections.defaultdict(collections.Counter)
sem_chave = []
for l in todas:
    pid, m = pessoa(l); metodo[l[0]][m] += 1
    if pid: pessoas[pid].append(l + (m,))  # índice 9 = como a pessoa foi achada (cpf, titulo->cpf, titulo)
    else: sem_chave.append(l)

# sugestão (nome + nascimento) para quem ficou sem chave
idx = collections.defaultdict(set)
for pid, ls in pessoas.items():
    for l in ls:
        if l[4] and l[5]: idx[(l[5], l[4])].add(pid)
sug = collections.Counter()
for l in sem_chave:
    if l[4] and l[5] and idx.get((l[5], l[4])): sug[l[0]] += 1

em_conflito = [ls for ls in pessoas.values() if len({l[4] for l in ls if l[4] and len(l[4]) >= 8}) > 1]
nasc_conf = len(em_conflito)
# de onde vem cada conflito (para explicar diferenças entre este número e o de conflitos-nascimento.py, que só usa candidaturas com CPF 1998-2022/2026)
nasc_origem = {"total": nasc_conf,
               "com_candidatura_ligada_so_por_titulo_via_cpf": sum(1 for ls in em_conflito if any(l[9] == "titulo->cpf" for l in ls)),
               "com_candidatura_de_2024": sum(1 for ls in em_conflito if any(l[0] == 2024 for l in ls)),
               "so_candidaturas_com_cpf_proprio_e_sem_2024": sum(1 for ls in em_conflito if all(l[9] == "cpf" and l[0] != 2024 for l in ls))}
por_nome = collections.defaultdict(set)
for pid, ls in pessoas.items():
    for l in ls:
        if l[5]: por_nome[l[5]].add(pid)
homonimos = sum(1 for v in por_nome.values() if len(v) > 1)
mudou_nome = sum(1 for ls in pessoas.values() if len({l[5] for l in ls}) > 1)

dist_anos = collections.Counter(len({l[0] for l in ls}) for ls in pessoas.values())
com_mais = [ls for ls in pessoas.values() if len({l[0] for l in ls}) > 1]
mudou_partido = sum(1 for ls in com_mais if len({l[6] for l in ls}) > 1)
topo = sorted(pessoas.values(), key=lambda ls: -len({l[0] for l in ls}))[:8]
trajetorias = [{"nome": ls[0][5], "anos": sorted({l[0] for l in ls}), "cargos": sorted({l[7] for l in ls}), "partidos": sorted({l[6] for l in ls})} for ls in topo]

rel = {"anos": rel_anos,
       "metodo_por_ano": {a: dict(c) for a, c in metodo.items()},
       "sugestao_nome_nascimento_por_ano": dict(sug),
       "pessoas_ligadas": len(pessoas), "candidaturas_total": len(todas), "candidaturas_sem_chave": len(sem_chave),
       "conflitos_origem_nascimento": nasc_origem,
       "conflitos": {"mesmo_cpf_nascimentos_diferentes": nasc_conf, "titulos_com_cpfs_diferentes": conf_tit,
                     "nomes_completos_homonimos_entre_pessoas": homonimos, "pessoas_com_nome_diferente_entre_anos": mudou_nome},
       "trajetorias": {"pessoas_em_mais_de_um_ano": len(com_mais), "distribuicao_anos_distintos": dict(sorted(dist_anos.items())),
                       "mudaram_de_partido": mudou_partido, "mais_longas": trajetorias}}
json.dump(rel, open(saida, "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: rel[k] for k in rel if k != "anos"}, ensure_ascii=False, indent=1))
