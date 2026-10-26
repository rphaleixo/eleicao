#!/usr/bin/env python3
"""Fase 0: descobre qual chave identifica uma candidatura em cada ano (SQ_CANDIDATO sozinho só é único em alguns anos).
Testa SQ; SQ+UE; SQ+UE+cargo; SQ+UE+cargo+turno no cadastro e confere se a votação (município e zona) casa com o cadastro sob a mesma chave.
Lê em fluxo; somente leitura; sem dados pessoais. Uso: python3 -I tools/tse/conferir-chave-candidatura.py cache_dir saida.csv anos..."""
import csv, io, sys, zipfile
cache, saida = sys.argv[1:3]
csv.field_size_limit(1 << 24)

def linhas(nome_zip):
    z = zipfile.ZipFile(f"{cache}/{nome_zip}")
    ms = [i for i in z.infolist() if i.filename.lower().endswith(".csv")]
    ms = [i for i in ms if "BRASIL" in i.filename.upper()] or ms
    for info in ms:
        with z.open(info) as f:
            yield from csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")

def chaves(x):
    sq, ue, cg, tn = (x.get("SQ_CANDIDATO") or "").strip(), (x.get("SG_UE") or "").strip(), (x.get("CD_CARGO") or "").strip(), (x.get("NR_TURNO") or "1").strip()
    return {"sq": (sq,), "sq_ue": (sq, ue), "sq_ue_cargo": (sq, ue, cg), "sq_ue_cargo_turno": (sq, ue, cg, tn)}

with open(saida, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["ano", "linhas_cadastro", "chave", "valores_distintos_no_cadastro", "unica_no_cadastro", "linhas_votacao", "chaves_distintas_votacao", "chaves_da_votacao_fora_do_cadastro"])
    for ano in map(int, sys.argv[3:]):
        cad = {k: set() for k in ("sq", "sq_ue", "sq_ue_cargo", "sq_ue_cargo_turno")}; n = 0
        for x in linhas(f"consulta_cand_{ano}.zip"):
            n += 1
            for k, v in chaves(x).items(): cad[k].add(v)
        vot = {k: set() for k in cad}; nv = 0
        for x in linhas(f"votacao_candidato_munzona_{ano}.zip"):
            nv += 1
            for k, v in chaves(x).items(): vot[k].add(v)
        for k in cad:
            w.writerow([ano, n, k, len(cad[k]), "sim" if len(cad[k]) == n else "nao", nv, len(vot[k]), len(vot[k] - cad[k])]); f.flush()
        print(ano, {k: len(v) for k, v in cad.items()}, "linhas", n, file=sys.stderr, flush=True)
