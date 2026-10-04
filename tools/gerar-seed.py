"""Gera os arquivos SQL de carga do banco de candidatos a partir dos CSV do TSE.

Uso: python3 tools/gerar-seed.py <pasta_dos_csv_extraidos> <saida> <arquivo_da_chave>
O CPF nunca é gravado: vira um HMAC-SHA256 com a chave do arquivo (fora do repositório).
"""
import csv, hmac, hashlib, os, sys, secrets

origem, saida, arq_chave = sys.argv[1:4]
if not os.path.exists(arq_chave):
    open(arq_chave, "w").write(secrets.token_hex(32))
chave = open(arq_chave).read().strip().encode()
os.makedirs(saida, exist_ok=True)

def ler(pasta, nome):
    with open(f"{origem}/{pasta}/{nome}", encoding="latin1", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

NULOS = {"", "#NE", "#NULO", "#NULO#", "-1", "-3", "-4"}
def nz(v): return None if v is None or v.strip() in NULOS else v.strip()
def txt(v):
    v = nz(v)
    return "NULL" if v is None else "'" + v.replace("'", "''") + "'"
def inteiro(v):
    v = nz(v)
    try: return str(int(float(v)))
    except (TypeError, ValueError): return "NULL"
def real(v):
    v = nz(v)
    try: return repr(float(v))
    except (TypeError, ValueError): return "NULL"

cand = ler("consulta_cand_2026", "consulta_cand_2026_BRASIL.csv")
comp = {r["SQ_CANDIDATO"]: r for r in ler("consulta_cand_complementar_2026", "consulta_cand_complementar_2026_BRASIL.csv")}
colig = ler("consulta_coligacao_2026", "consulta_coligacao_2026_BRASIL.csv")
vagas = ler("consulta_vagas_2026", "consulta_vagas_2026_BRASIL.csv")

pessoas, cands = {}, []
for r in cand:
    cpf = "".join(ch for ch in r["NR_CPF_CANDIDATO"] if ch.isdigit())
    if len(cpf) == 11:
        pid, mask = hmac.new(chave, cpf.encode(), hashlib.sha256).hexdigest()[:32], 0
    else:  # CPF mascarado pelo TSE: a pessoa só é identificada por esta candidatura
        pid, mask = "sq" + r["SQ_CANDIDATO"], 1
    ano = r["DT_NASCIMENTO"][-4:]
    pessoas.setdefault(pid, (pid, mask, r["NM_CANDIDATO"], ano, r["DS_GENERO"], r["DS_COR_RACA"], r["DS_GRAU_INSTRUCAO"], r["DS_OCUPACAO"], r["SG_UF_NASCIMENTO"]))
    c = comp.get(r["SQ_CANDIDATO"], {})
    cands.append((r, c, pid))

def linhas(tabela, colunas, valores, por_linha):
    cab = f"INSERT OR REPLACE INTO {tabela} ({colunas}) VALUES "
    for i in range(0, len(valores), por_linha):
        yield cab + ",".join("(" + ",".join(v) + ")" for v in valores[i:i + por_linha]) + ";"

todas = []
todas += linhas("vaga", "uf,cargo,qt,posse", [[txt(r["SG_UF"]), inteiro(r["CD_CARGO"]), inteiro(r["QT_VAGA"]), txt(r["DT_POSSE"])] for r in vagas], 50)
todas += linhas("agremiacao", "uf,cargo,sq_coligacao,partido,nr_partido,tp_agremiacao,nome,federacao,composicao,situacao,destinacao_votos",
    [[txt(r["SG_UF"]), inteiro(r["CD_CARGO"]), inteiro(r["SQ_COLIGACAO"]), txt(r["SG_PARTIDO"]), inteiro(r["NR_PARTIDO"]), txt(r["TP_AGREMIACAO"]),
      txt(r["NM_COLIGACAO"]), txt(r["SG_FEDERACAO"]), txt(r["DS_COMPOSICAO_COLIGACAO"]), txt(r["DS_SITUACAO"]), txt(r["NM_TIPO_DESTINACAO_VOTOS"])] for r in colig], 25)
todas += linhas("pessoa", "id,cpf_mascarado,nome,ano_nascimento,genero,cor_raca,grau_instrucao,ocupacao,uf_nascimento",
    [[txt(p[0]), str(p[1]), txt(p[2]), inteiro(p[3]), txt(p[4]), txt(p[5]), txt(p[6]), txt(p[7]), txt(p[8])] for p in pessoas.values()], 25)
todas += linhas("candidatura", "sq,pessoa_id,eleicao,turno,cargo,uf,ue,numero,nome_urna,partido,nr_partido,tp_agremiacao,sq_coligacao,federacao,nm_coligacao,situacao,julgamento,situacao_urna,destinacao_votos,idade_posse,reeleicao,substituido,sq_substituido,vr_despesa_max",
    [[inteiro(r["SQ_CANDIDATO"]), txt(pid), inteiro(r["CD_ELEICAO"]), inteiro(r["NR_TURNO"]), inteiro(r["CD_CARGO"]), txt(r["SG_UF"]), txt(r["SG_UE"]), inteiro(r["NR_CANDIDATO"]),
      txt(r["NM_URNA_CANDIDATO"]), txt(r["SG_PARTIDO"]), inteiro(r["NR_PARTIDO"]), txt(r["TP_AGREMIACAO"]), inteiro(r["SQ_COLIGACAO"]), txt(r["SG_FEDERACAO"]), txt(r["NM_COLIGACAO"]),
      txt(r["DS_SITUACAO_CANDIDATURA"]), txt(c.get("DS_SITUACAO_JULGAMENTO")), txt(c.get("DS_SITUACAO_CANDIDATO_URNA")), txt(c.get("NM_TIPO_DESTINACAO_VOTOS")),
      inteiro(c.get("NR_IDADE_DATA_POSSE")), txt(c.get("ST_REELEICAO")), txt(c.get("ST_SUBSTITUIDO")), inteiro(c.get("SQ_SUBSTITUIDO")), real(c.get("VR_DESPESA_MAX_CAMPANHA"))] for r, c, pid in cands], 20)

POR_ARQUIVO = 40
n = 0
for i in range(0, len(todas), POR_ARQUIVO):
    n += 1
    open(f"{saida}/{n:03d}.sql", "w").write("\n".join(todas[i:i + POR_ARQUIVO]) + "\n")
open(f"{saida}/indice.json", "w").write('{"arquivos":%d,"candidaturas":%d,"pessoas":%d}\n' % (n, len(cands), len(pessoas)))
print(n, "arquivos;", len(cands), "candidaturas;", len(pessoas), "pessoas;", len(colig), "agremiações;", len(vagas), "vagas")
