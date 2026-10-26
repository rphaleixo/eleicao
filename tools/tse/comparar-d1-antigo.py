#!/usr/bin/env python3
"""Fase 0: compara o D1 antigo (eleicao-candidatos), exportado antes por leitura (SELECT) para JSON local, com os arquivos atuais
do TSE de 2026. Mostra o que dá para regerar e o que difere. Só contagens: nenhum nome, CPF ou título na saída.
Uso: python3 -I tools/tse/comparar-d1-antigo.py dir_export_d1 dir_zips_tse_2026 saida.json"""
import collections, csv, io, json, sys, zipfile, unicodedata
d1, tse, saida = sys.argv[1:4]
csv.field_size_limit(1 << 24)

def ler(zipnome):
    z = zipfile.ZipFile(f"{tse}/{zipnome}")
    m = [i for i in z.infolist() if i.filename.lower().endswith(".csv") and "BRASIL" in i.filename.upper()] or [i for i in z.infolist() if i.filename.lower().endswith(".csv")]
    return list(csv.DictReader(io.TextIOWrapper(z.open(m[0]), encoding="latin-1", newline=""), delimiter=";"))

def db(n): return json.load(open(f"{d1}/{n}.json"))["result"][0]["results"]
N = lambda s: unicodedata.normalize("NFKD", str(s if s is not None else "")).encode("ascii", "ignore").decode().strip().upper()
SEM = {"", "-1", "-3", "-4", "#NE", "#NE#", "#NULO", "#NULO#"}
rel = {}

# candidatura + pessoa
cand = {str(x["SQ_CANDIDATO"]): x for x in ler("consulta_cand_2026.zip")}
comp = {str(x["SQ_CANDIDATO"]): x for x in ler("consulta_cand_complementar_2026.zip")}
velho = {str(r["sq"]): r for r in db("candidatura")}
ambos = set(velho) & set(cand)
rel["candidatura"] = {"no_banco_antigo": len(velho), "no_tse_hoje": len(cand), "em_ambos": len(ambos),
                      "so_no_banco_antigo": len(set(velho) - set(cand)), "so_no_tse_hoje": len(set(cand) - set(velho))}
camp = {  # campo_do_banco: (função que lê o TSE)
    "numero": lambda c, k: c["NR_CANDIDATO"], "nome_urna": lambda c, k: c["NM_URNA_CANDIDATO"], "partido": lambda c, k: c["SG_PARTIDO"],
    "cargo": lambda c, k: c["CD_CARGO"], "uf": lambda c, k: c["SG_UF"], "ue": lambda c, k: c["SG_UE"], "situacao": lambda c, k: c["DS_SITUACAO_CANDIDATURA"],
    "sq_coligacao": lambda c, k: c["SQ_COLIGACAO"], "tp_agremiacao": lambda c, k: c["TP_AGREMIACAO"], "nm_coligacao": lambda c, k: c["NM_COLIGACAO"],
    "julgamento": lambda c, k: comp.get(k, {}).get("DS_SITUACAO_JULGAMENTO", ""), "situacao_urna": lambda c, k: comp.get(k, {}).get("DS_SITUACAO_CANDIDATO_URNA", ""),
    "destinacao_votos": lambda c, k: comp.get(k, {}).get("NM_TIPO_DESTINACAO_VOTOS", ""), "idade_posse": lambda c, k: comp.get(k, {}).get("NR_IDADE_DATA_POSSE", ""),
    "reeleicao": lambda c, k: comp.get(k, {}).get("ST_REELEICAO", ""), "sq_substituido": lambda c, k: comp.get(k, {}).get("SQ_SUBSTITUIDO", ""),
    "p_nome": lambda c, k: c["NM_CANDIDATO"], "ano_nascimento": lambda c, k: c["DT_NASCIMENTO"][-4:], "genero": lambda c, k: c["DS_GENERO"],
    "cor_raca": lambda c, k: c["DS_COR_RACA"], "grau_instrucao": lambda c, k: c["DS_GRAU_INSTRUCAO"], "ocupacao": lambda c, k: c["DS_OCUPACAO"],
    "uf_nascimento": lambda c, k: c["SG_UF_NASCIMENTO"]}
dif = {}
for campo, fn in camp.items():
    iguais = sum(1 for k in ambos if N(velho[k].get(campo)) == N(fn(cand[k], k)))
    dif[campo] = {"iguais": iguais, "diferentes": len(ambos) - iguais}
rel["candidatura"]["campos_comparados_nos_em_ambos"] = dif
# partição de pessoas: o banco antigo agrupa as mesmas candidaturas que o CPF do TSE agruparia?
cpf_de = {k: (cand[k]["NR_CPF_CANDIDATO"].strip().zfill(11) if cand[k]["NR_CPF_CANDIDATO"].strip() not in SEM else None) for k in ambos}
p2c, c2p = collections.defaultdict(set), collections.defaultdict(set)
for k in ambos:
    if cpf_de[k]: p2c[velho[k]["pessoa_id"]].add(cpf_de[k]); c2p[cpf_de[k]].add(velho[k]["pessoa_id"])
rel["pessoa"] = {"pessoas_no_banco_antigo": len(set(r["pessoa_id"] for r in velho.values())),
                 "pessoas_distintas_por_cpf_no_tse_hoje": len({v for v in cpf_de.values() if v}) + sum(1 for v in cpf_de.values() if not v),
                 "pessoa_id_com_mais_de_um_cpf": sum(1 for v in p2c.values() if len(v) > 1), "cpf_com_mais_de_um_pessoa_id": sum(1 for v in c2p.values() if len(v) > 1),
                 "candidaturas_sem_cpf_no_tse_hoje": sum(1 for v in cpf_de.values() if not v)}
# bem
bem_t = {(str(x["SQ_CANDIDATO"]), str(x["NR_ORDEM_BEM_CANDIDATO"])): x for x in ler("bem_candidato_2026.zip")}
bem_v = {(str(r["sq"]), str(r["ordem"])): r for r in db("bem")}
v_t = sum(float(x["VR_BEM_CANDIDATO"].replace(",", ".") or 0) for x in bem_t.values()); v_v = sum(float(r["valor"]) for r in bem_v.values())
rel["bem"] = {"linhas_banco_antigo": len(bem_v), "linhas_tse_hoje": len(bem_t), "chaves_em_ambos": len(set(bem_v) & set(bem_t)), "so_antigo": len(set(bem_v) - set(bem_t)), "so_tse": len(set(bem_t) - set(bem_v)),
              "soma_valor_antigo": round(v_v, 2), "soma_valor_tse_hoje": round(v_t, 2)}
# histórico
h_t = {(str(x["SQ_CANDIDATO_ATUAL"]), str(x["SQ_CANDIDATO"]), str(x["NR_TURNO"])) for x in ler("historico_candidatura_2026.zip") if x["SQ_CANDIDATO_ATUAL"] != x["SQ_CANDIDATO"]}
h_v = {(str(r["sq_atual"]), str(r["sq_anterior"]), str(r["turno"])) for r in db("historico")}
rel["historico"] = {"linhas_banco_antigo": len(h_v), "linhas_tse_hoje_sem_a_propria_2026": len(h_t), "em_ambos": len(h_v & h_t), "so_antigo": len(h_v - h_t), "so_tse": len(h_t - h_v)}
# agremiação e vagas
a_t = {(x["SG_UF"], str(x["CD_CARGO"]), str(x["SQ_COLIGACAO"]), x["SG_PARTIDO"]) for x in ler("consulta_coligacao_2026.zip")}
a_v = {(r["uf"], str(r["cargo"]), str(r["sq_coligacao"]), r["partido"]) for r in db("agremiacao")}
rel["agremiacao"] = {"linhas_banco_antigo": len(a_v), "linhas_tse_hoje": len(a_t), "em_ambos": len(a_v & a_t), "so_antigo": len(a_v - a_t), "so_tse": len(a_t - a_v)}
vg_t = {(x["SG_UF"], str(x["CD_CARGO"])): int(x["QT_VAGA"]) for x in ler("consulta_vagas_2026.zip")}
vg_v = {(r["uf"], str(r["cargo"])): int(r["qt"]) for r in db("vaga")}
rel["vaga"] = {"linhas_banco_antigo": len(vg_v), "linhas_tse_hoje": len(vg_t), "iguais": sum(1 for k in vg_v if vg_t.get(k) == vg_v[k]), "diferentes_ou_ausentes": sum(1 for k in vg_v if vg_t.get(k) != vg_v[k])}
json.dump(rel, open(saida, "w"), ensure_ascii=False, indent=1)
print(json.dumps(rel, ensure_ascii=False, indent=1))
