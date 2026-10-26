#!/usr/bin/env python3
"""Fase 0: mede a qualidade das chaves de identidade (CPF, título, nascimento) nos cadastros de candidatos do TSE e quantas pessoas
se repetem entre eleições (mesmo CPF). Só leitura; baixa consulta_cand_AAAA.zip do CDN do TSE para um diretório de cache.
Uso: python3 tools/tse/qualidade-candidatos.py 2018 2022 2026   (anos; cache em /tmp/tse-cand ou $TSE_CACHE)"""
import csv, io, os, sys, urllib.request, zipfile, collections

CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_%d.zip"
CACHE = os.environ.get("TSE_CACHE", "/tmp/tse-cand")
SEM = {"", "-1", "-3", "-4", "#NULO#", "#NE#"}  # valores que o TSE usa no lugar de "não divulgado"

def carregar(ano):
    os.makedirs(CACHE, exist_ok=True)
    z = os.path.join(CACHE, "consulta_cand_%d.zip" % ano)
    if not os.path.exists(z):
        req = urllib.request.Request(CDN % ano, headers={"User-Agent": "Mozilla/5.0"})
        open(z, "wb").write(urllib.request.urlopen(req, timeout=600).read())
    with zipfile.ZipFile(z) as f:
        nome = next(n for n in f.namelist() if n.upper().endswith("_BRASIL.CSV"))  # todos os estados num arquivo só
        return list(csv.DictReader(io.TextIOWrapper(f.open(nome), encoding="latin-1", newline=""), delimiter=";"))

def cpf(x):
    v = x["NR_CPF_CANDIDATO"].strip()
    return None if v in SEM else v.zfill(11)  # em 2012 vieram CPFs de 10 dígitos (zeros à esquerda perdidos)

anos = [int(a) for a in sys.argv[1:]] or [2018, 2022, 2026]
por_ano = {}
for ano in anos:
    linhas = carregar(ano)
    por_ano[ano] = linhas
    tit = [x for x in linhas if x.get("NR_TITULO_ELEITORAL_CANDIDATO", "").strip() not in SEM]
    nasc = [x for x in linhas if x.get("DT_NASCIMENTO", "").strip()]
    c = [x for x in linhas if cpf(x)]
    n = len(linhas) or 1
    print(f"{ano}: {len(linhas)} candidaturas | CPF {100*len(c)/n:.1f}% | título {100*len(tit)/n:.1f}% | nascimento {100*len(nasc)/n:.1f}%")
for a, b in zip(anos, anos[1:]):
    ca = {cpf(x) for x in por_ano[a] if cpf(x)}; cb = {cpf(x) for x in por_ano[b] if cpf(x)}
    print(f"CPFs em comum {a} x {b}: {len(ca & cb)}")
trocas = collections.defaultdict(set)
for ano, linhas in por_ano.items():
    for x in linhas:
        if cpf(x): trocas[cpf(x)].add((ano, x["SG_PARTIDO"]))
varias = [v for v in trocas.values() if len({a for a, _ in v}) > 1]
print(f"pessoas em mais de uma eleição: {len(varias)} | com mais de um partido: {sum(1 for v in varias if len({p for _, p in v}) > 1)}")
