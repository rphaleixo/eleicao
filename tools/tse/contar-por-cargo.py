#!/usr/bin/env python3
"""Fase 0: conta linhas da votação nominal por município e zona por ano, cargo e turno (somente leitura, usa o cache já baixado),
e compara o esquema de colunas entre anos. Uso: python3 -I tools/tse/contar-por-cargo.py perfil.json cache_dir saida.json"""
import collections, csv, io, json, sys, zipfile

perfil, cache, saida = sys.argv[1:4]
csv.field_size_limit(1 << 24)
P = json.load(open(perfil))
CARGO = ["DS_CARGO", "DESCRICAO_CARGO", "DS_CARGO_PERGUNTA"]
TURNO = ["NR_TURNO", "NUM_TURNO"]
res, esquemas = {}, {}
for arq, v in sorted(P.items(), key=lambda kv: kv[1]["ano"]):
    if v["tipo"] != "nominal": continue
    z = zipfile.ZipFile(f"{cache}/{arq}")
    membros = [i for i in z.infolist() if i.filename.lower().endswith(".csv") and not i.is_dir()]
    brasil = [i for i in membros if "BRASIL" in i.filename.upper()]
    usar = brasil or [i for i in membros if i.filename.upper().endswith(".TXT") is False] or membros
    cont = collections.Counter(); cols = None
    for info in usar or [i for i in z.infolist() if not i.is_dir() and "leiame" not in i.filename.lower()]:
        with z.open(info) as f:
            rd = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")
            if cols is None: cols = rd.fieldnames
            cc = next((c for c in CARGO if c in (rd.fieldnames or [])), None); tc = next((c for c in TURNO if c in (rd.fieldnames or [])), None)
            for x in rd:
                cont[(x.get(cc, "?") if cc else "?", x.get(tc, "?") if tc else "?")] += 1
    res[v["ano"]] = {f"{c}|T{t}": n for (c, t), n in sorted(cont.items())}
    esquemas[v["ano"]] = cols
    print(v["ano"], sum(cont.values()), file=sys.stderr, flush=True)
json.dump({"contagem": res, "colunas": esquemas}, open(saida, "w"), ensure_ascii=False, indent=1)
