#!/usr/bin/env python3
"""Fase 0: gera as tabelas pequenas de resultado em docs/tse/fase0/ a partir dos arquivos de trabalho (perfil, tamanhos, cargos,
ligação, conflitos) e do cache de cadastros. NÃO grava CPF, título, nomes de candidatos nem os arquivos baixados.
Uso: python3 -I tools/tse/gerar-tabelas-fase0.py dir_trabalho cache_dir"""
import collections, csv, io, json, os, sys, zipfile

W, CACHE = sys.argv[1:3]
OUT = "docs/tse/fase0"
os.makedirs(OUT, exist_ok=True)
csv.field_size_limit(1 << 24)
L = lambda n: json.load(open(f"{W}/{n}"))
perfil, tam, tam20, cargos, lig, conf = L("perfil.json"), L("tamanhos.json"), L("tamanhos-2020.json"), L("cargos.json"), L("ligacao.json"), L("conflitos.json")

def membros_ok(v): return [m for m in v["membros"] if "erro" not in m and m.get("separador")]
def dados(v):
    ms = [m for m in membros_ok(v) if len(m["colunas"]) > 5]
    br = [m for m in ms if "BRASIL" in m["membro"].upper()]
    return br or ms

# 1. inventário
with open(f"{OUT}/inventario.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["ano", "tipo", "arquivo", "url", "bytes_zip", "sha256", "last_modified", "baixado", "linhas_de_dados", "codificacao", "separador", "n_colunas"])
    for x in sorted(tam + tam20, key=lambda x: (x["tipo"], x["ano"], x["arquivo"])):
        if x["tipo"] == "cadastro" and x["ano"] == 2020 and x in tam: continue
        p = perfil.get(x["arquivo"])
        if p:
            ds = dados(p); n = sum(m["linhas"] for m in ds)
            w.writerow([x["ano"], x["tipo"], x["arquivo"], x["url"], x["bytes"], p["sha256"], x["last_modified"], "sim", n,
                        "/".join(sorted({m["codificacao"] for m in ds})), "/".join(sorted({m["separador"] for m in ds})),
                        "/".join(str(c) for c in sorted({len(m["colunas"]) for m in ds}))])
        else:
            w.writerow([x["ano"], x["tipo"], x["arquivo"], x["url"], x["bytes"], "", x["last_modified"], "nao (so tamanho)", "", "", "", ""])

# 2. colunas por esquema
esq, por_ano = {}, {}
for arq, p in perfil.items():
    ds = dados(p)
    if not ds: continue
    cols = ds[0]["colunas"]; chave = "%s:%s" % (p["tipo"], hash(tuple(cols)) & 0xffff)
    esq.setdefault(chave, cols); por_ano.setdefault(p["tipo"], {})[p["ano"]] = chave
dif = {}
for tipo, anos in por_ano.items():
    ant = None
    for a in sorted(anos):
        cols = esq[anos[a]]
        if ant is not None and cols != ant[1]:
            dif[f"{tipo}:{ant[0]}->{a}"] = {"entrou": [c for c in cols if c not in ant[1]], "saiu": [c for c in ant[1] if c not in cols]}
        ant = (a, cols)
json.dump({"observacao": "1989 e 1990 (TXT) nao tem cabecalho; layout posicional de 26 campos (cargo no 13o).",
           "esquema_por_ano": por_ano, "esquemas": esq, "diferencas_entre_anos_consecutivos": dif},
          open(f"{OUT}/colunas-por-ano.json", "w"), ensure_ascii=False, indent=1, sort_keys=True)

# 3. contagem por cargo/turno
with open(f"{OUT}/contagem-por-cargo.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["ano", "cargo", "turno", "linhas_votacao_nominal_munzona", "grupo_do_plano"])
    for ano, d in sorted(cargos["contagem"].items()):
        for k, n in d.items():
            c, t = k.split("|")
            g = "fase2_majoritario" if c in ("Presidente", "Governador", "Senador", "Prefeito") else ("fase2b_proporcional" if c in ("Deputado Federal", "Deputado Estadual", "Deputado Distrital", "Vereador") else "nao_classificado(1989/1990 TXT)")
            w.writerow([ano, c, t, n, g])

# 4. cobertura de CPF/título com valores mascarados contados à parte
SEMVAL = {"", "-1", "-3", "-4", "#NE", "#NE#", "#NULO", "#NULO#"}
cob = []
for ano, r in sorted(lig["anos"].items(), key=lambda kv: int(kv[0])):
    z = zipfile.ZipFile(f"{CACHE}/consulta_cand_{ano}.zip")
    ms = [i for i in z.infolist() if i.filename.lower().endswith(".csv")]
    usar = [i for i in ms if "BRASIL" in i.filename.upper()] or ms
    mc, mt = collections.Counter(), collections.Counter(); n = 0
    for info in usar:
        raw = z.open(info).read().decode("latin-1"); cab = raw.split("\n", 1)[0]; sep = max([";", ","], key=cab.count)
        for x in csv.DictReader(io.StringIO(raw, newline=""), delimiter=sep):
            n += 1
            c = (x.get("NR_CPF_CANDIDATO") or x.get("CPF_CANDIDATO") or "").strip(); t = (x.get("NR_TITULO_ELEITORAL_CANDIDATO") or x.get("NUM_TITULO_ELEITORAL_CANDIDATO") or "").strip()
            if not c.isdigit(): mc[c if c in SEMVAL else "outro_nao_numerico"] += 1
            if not t.isdigit(): mt[t if t in SEMVAL else "outro_nao_numerico"] += 1
    cob.append((ano, r, mc, mt))
with open(f"{OUT}/cobertura-cpf-titulo.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["ano", "candidaturas", "pct_cpf_preenchido", "pct_titulo_preenchido", "pct_nascimento", "cpf_nao_preenchido_valores", "titulo_nao_preenchido_valores", "ligadas_por_cpf", "ligadas_por_titulo_via_cpf_conhecido", "ligadas_so_por_titulo", "sem_chave", "sugestao_nome_nascimento_entre_sem_chave"])
    for ano, r, mc, mt in cob:
        m = lig["metodo_por_ano"].get(str(ano), {})
        w.writerow([ano, r["candidaturas"], r["pct_cpf"], r["pct_titulo"], r["pct_nascimento"],
                    ";".join(f"{k}={v}" for k, v in mc.most_common()), ";".join(f"{k}={v}" for k, v in mt.most_common()),
                    m.get("cpf", 0), m.get("titulo->cpf", 0), m.get("titulo", 0), m.get("sem_chave", 0), lig["sugestao_nome_nascimento_por_ano"].get(str(ano), 0)])

# 5. ligação (resumo sem nomes) e conflitos
t = dict(lig["trajetorias"]); t.pop("mais_longas", None)
t["mais_longas_anonimas"] = [{"anos_distintos": len(x["anos"]), "cargos_distintos": len(x["cargos"]), "partidos_distintos": len(x["partidos"])} for x in lig["trajetorias"]["mais_longas"]]
json.dump({"regra": "CPF (11 digitos) > titulo > sugestao nome+nascimento (nao liga). Mascarados (-1,-3,-4,#NE) contam como nao preenchidos.",
           "pessoas_com_chave": lig["pessoas_ligadas"], "candidaturas_total_1994_2026": lig["candidaturas_total"],
           "candidaturas_sem_chave": lig["candidaturas_sem_chave"], "conflitos_brutos": lig["conflitos"], "trajetorias": t},
          open(f"{OUT}/ligacao-resumo.json", "w"), ensure_ascii=False, indent=1)
json.dump(conf, open(f"{OUT}/conflitos-nascimento.json", "w"), ensure_ascii=False, indent=1)
print(sorted(os.listdir(OUT)), sum(os.path.getsize(f"{OUT}/{n}") for n in os.listdir(OUT)) // 1024, "KB")
