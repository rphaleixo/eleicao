#!/usr/bin/env python3
"""Fase 0: lista o tamanho (HEAD, sem baixar) dos pacotes de votação e de cadastro do TSE usados no plano.
Só leitura. Uso: python3 -I tools/tse/inventario-tamanhos.py [saida.json]"""
import json, re, sys, time, urllib.request

CAT = "docs/tse/catalogo-tse.json"
UA = {"User-Agent": "Mozilla/5.0"}
ANOS = [1989, 1990, 1994, 1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]
PADROES = [("nominal", r"votacao_candidato_(munzona|uf)_"), ("partido", r"votacao_partido_(munzona|uf)_"),
           ("detalhe", r"detalhe_votacao_(munzona|uf)_"), ("secao_detalhe", r"detalhe_votacao_secao_"),
           ("secao_presidente", r"votacao_secao_\d{4}_BR"), ("secao_uf", r"votacao_secao_\d{4}_[A-Z]{2}\.")]

def head(url):
    for i in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA, method="HEAD"), timeout=60)
            return int(r.headers.get("Content-Length", -1)), r.headers.get("Last-Modified")
        except Exception as e:
            err = str(e)
            time.sleep(2 * (i + 1))
    return None, err

if len(sys.argv) > 2: ANOS = [int(a) for a in sys.argv[2].split(",")]  # opcional: só alguns anos
cat = json.load(open(CAT))["pacotes"]
saida = []
for ano in ANOS:
    for pac in ("resultados-%d" % ano, "candidatos-%d" % ano, "candidatos-%d-subtemas" % ano):  # 2020 usa o sufixo -subtemas
        p = cat.get(pac)
        if not p: continue
        for r in p["recursos"]:
            url = r["url"] or ""
            nome = url.split("/")[-1]
            tipo = None
            if pac.startswith("candidatos-"):  # inclui candidatos-AAAA-subtemas
                if re.match(r"consulta_cand_\d{4}\.zip", nome): tipo = "cadastro"
                elif re.match(r"consulta_cand_complementar_\d{4}\.zip", nome): tipo = "cadastro_compl"
                elif re.match(r"bem_candidato_\d{4}\.zip", nome): tipo = "bens"
            else:
                for t, pat in PADROES:
                    if re.search(pat, nome): tipo = t; break
            if not tipo or not url.endswith(".zip"): continue
            tam, lm = head(url)
            saida.append({"ano": ano, "tipo": tipo, "arquivo": nome, "url": url, "bytes": tam, "last_modified": lm})
            print(ano, tipo, nome, tam, file=sys.stderr)
            time.sleep(0.15)
json.dump(saida, open(sys.argv[1] if len(sys.argv) > 1 else "/dev/stdout", "w"), ensure_ascii=False, indent=1)
