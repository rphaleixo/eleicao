#!/usr/bin/env python3
"""Fase 0: confere se o SQ_CANDIDATO da votação nominal (município e zona) existe no cadastro do mesmo ano.
Lê em fluxo (não carrega o arquivo inteiro). Somente leitura. Sem dados pessoais na saída.
Uso: python3 -I tools/tse/conferir-sq-candidato.py cache_dir saida.csv anos..."""
import csv, io, sys, zipfile
cache, saida = sys.argv[1:3]
csv.field_size_limit(1 << 24)
VAZIO = {"", "-1", "-3", "-4", "#NE", "#NE#", "#NULO", "#NULO#"}

def sqs(nome_zip):
    z = zipfile.ZipFile(f"{cache}/{nome_zip}")
    ms = [i for i in z.infolist() if i.filename.lower().endswith(".csv")]
    ms = [i for i in ms if "BRASIL" in i.filename.upper()] or ms
    vistos, linhas, vazias = set(), 0, 0
    for info in ms:
        with z.open(info) as f:
            rd = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")
            for x in rd:
                linhas += 1; v = (x.get("SQ_CANDIDATO") or "").strip()
                if v in VAZIO: vazias += 1
                else: vistos.add(v)
    return vistos, linhas, vazias

with open(saida, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["ano", "linhas_votacao", "sq_distintos_na_votacao", "linhas_sem_sq", "sq_do_cadastro", "pct_sq_da_votacao_presentes_no_cadastro", "sq_da_votacao_fora_do_cadastro"])
    for ano in map(int, sys.argv[3:]):
        cad, _, _ = sqs(f"consulta_cand_{ano}.zip"); vot, n, vz = sqs(f"votacao_candidato_munzona_{ano}.zip")
        fora = len(vot - cad)
        w.writerow([ano, n, len(vot), vz, len(cad), round(100 * (len(vot) - fora) / max(len(vot), 1), 3), fora]); f.flush()
        print(ano, n, len(vot), fora, file=sys.stderr, flush=True)
