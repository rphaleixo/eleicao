#!/usr/bin/env python3
"""Fase 0 (começo): baixa o catálogo de pacotes do portal de dados abertos do TSE e grava o manifesto em docs/tse/catalogo-tse.json.
Só leitura. Usa User-Agent de navegador (sem ele o portal às vezes responde 403). Uso: python3 tools/tse/catalogo.py"""
import json, sys, time, datetime, urllib.request

B = "https://dadosabertos.tse.jus.br/api/3/action/"
UA = {"User-Agent": "Mozilla/5.0"}

def get(u, tentativas=4):
    for i in range(tentativas):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))["result"]
        except Exception as e:
            if i == tentativas - 1: raise
            time.sleep(2 * (i + 1))

nomes = [n for n in get(B + "package_list") if n.startswith(("resultados-", "candidatos-", "eleitorado-"))]
cat = {"gerado_em": datetime.datetime.now(datetime.timezone.utc).isoformat(), "fonte": B, "pacotes": {}}
for n in nomes:
    d = get(B + "package_show?id=" + n)
    cat["pacotes"][n] = {"titulo": d.get("title"), "modificado": d.get("metadata_modified"),
        "recursos": [{"nome": r.get("name"), "formato": r.get("format"), "url": r.get("url"), "id": r.get("id"), "modificado": r.get("last_modified")} for r in d["resources"]]}
    print(n, len(d["resources"]), file=sys.stderr)
destino = sys.argv[1] if len(sys.argv) > 1 else "docs/tse/catalogo-tse.json"
json.dump(cat, open(destino, "w"), ensure_ascii=False, indent=1)
print(len(nomes), "pacotes,", sum(len(p["recursos"]) for p in cat["pacotes"].values()), "recursos ->", destino)
