"""Gera a carga complementar (bens declarados e histórico de candidaturas) para o D1.

Uso: python3 tools/gerar-seed-extras.py <pasta_bem> <pasta_historico> <saida> <primeiro_numero>
Os arquivos continuam a numeração da carga anterior; o indice.json passa a listar o total.
"""
import csv, os, sys, json

pasta_bem, pasta_hist, saida, inicio = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
os.makedirs(saida, exist_ok=True)
NULOS = {"", "#NE", "#NULO", "#NULO#", "-1", "-3", "-4"}
def nz(v): return None if v is None or v.strip() in NULOS else v.strip()
def txt(v):
    v = nz(v); return "NULL" if v is None else "'" + v.replace("'", "''") + "'"
def inteiro(v):
    v = nz(v)
    try: return str(int(float(v)))
    except (TypeError, ValueError): return "NULL"
def ler(f):
    with open(f, encoding="latin1", newline="") as fh: return list(csv.DictReader(fh, delimiter=";"))
def linhas(tabela, colunas, valores, por_linha):
    cab = f"INSERT OR REPLACE INTO {tabela} ({colunas}) VALUES "
    for i in range(0, len(valores), por_linha):
        yield cab + ",".join("(" + ",".join(v) + ")" for v in valores[i:i + por_linha]) + ";"

bens = ler(f"{pasta_bem}/bem_candidato_2026_BRASIL.csv")
hist = [r for r in ler(f"{pasta_hist}/historico_candidatura_2026_BRASIL.csv")
        if not (r["ANO_ELEICAO"] == "2026" and r["SQ_CANDIDATO"] == r["SQ_CANDIDATO_ATUAL"])]  # a própria candidatura já está em "candidatura"

todas = list(linhas("bem", "sq,ordem,tipo_cod,tipo,descricao,valor,atualizado_em",
    [[inteiro(r["SQ_CANDIDATO"]), inteiro(r["NR_ORDEM_BEM_CANDIDATO"]), inteiro(r["CD_TIPO_BEM_CANDIDATO"]), txt(r["DS_TIPO_BEM_CANDIDATO"]), txt(r["DS_BEM_CANDIDATO"]),
      repr(float((r["VR_BEM_CANDIDATO"] or "0").replace(",", "."))), txt(r["DT_ULT_ATUAL_BEM_CANDIDATO"])] for r in bens], 25))
todas += linhas("historico", "sq_atual,sq_anterior,turno,ano,eleicao,abrangencia,uf,ue,municipio,cargo,cargo_nome,numero,nome_urna,partido,situacao,julgamento,resultado",
    [[inteiro(r["SQ_CANDIDATO_ATUAL"]), inteiro(r["SQ_CANDIDATO"]), inteiro(r["NR_TURNO"]) if nz(r["NR_TURNO"]) else "1", inteiro(r["ANO_ELEICAO"]), inteiro(r["CD_ELEICAO"]),
      txt(r["TP_ABRANGENCIA_ELEICAO"]), txt(r["SG_UF"]), txt(r["SG_UE"]), txt(r["NM_UE"]), inteiro(r["CD_CARGO"]), txt(r["DS_CARGO"]), inteiro(r["NR_CANDIDATO"]), txt(r["NM_URNA_CANDIDATO"]),
      txt(r["SG_PARTIDO"]), txt(r["DS_SITUACAO_CANDIDATURA"]), txt(r["DS_SITUACAO_JULGAMENTO"]), txt(r["DS_SIT_TOT_TURNO"])] for r in hist], 25)

n = inicio - 1
for i in range(0, len(todas), 40):
    n += 1
    open(f"{saida}/{n:03d}.sql", "w").write("\n".join(todas[i:i + 40]) + "\n")
json.dump({"arquivos": n, "bens": len(bens), "historico": len(hist)}, open(f"{saida}/indice.json", "w"))
print(n - inicio + 1, "arquivos;", len(bens), "bens;", len(hist), "históricos")
