#!/usr/bin/env python3
"""Fase 0: classifica os conflitos 'mesmo CPF, nascimentos diferentes' dos cadastros (somente leitura; sem CPF no relatório).
Tipos: formato (mesma data escrita de outro jeito), dia/mês trocados, só o ano muda (diferença em anos), data totalmente diferente.
Uso: python3 -I tools/tse/conflitos-nascimento.py cache_dir saida.json anos..."""
import collections, csv, io, json, re, sys, zipfile
cache, saida = sys.argv[1:3]
csv.field_size_limit(1 << 24)
SEM = {"", "-1", "-3", "-4", "#NULO#", "#NE#", "#NULO", "#NE", "NULO", "0"}
por_cpf = collections.defaultdict(dict)  # cpf -> {ano: set(nasc)}
formatos = collections.defaultdict(collections.Counter)

def data(s):
    s = s.strip()
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", s)
    if m: return (int(m[3]), int(m[2]), int(m[1])), "dd/mm/aaaa"
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m: return (int(m[1]), int(m[2]), int(m[3])), "aaaa-mm-dd"
    return None, "outro"

for ano in map(int, sys.argv[3:]):
    z = zipfile.ZipFile(f"{cache}/consulta_cand_{ano}.zip")
    ms = [i for i in z.infolist() if i.filename.lower().endswith(".csv")]
    usar = [i for i in ms if "BRASIL" in i.filename.upper()] or ms
    for info in usar:
        raw = z.open(info).read().decode("latin-1")
        cab = raw.split("\n", 1)[0]; sep = max([";", ","], key=cab.count)
        for x in csv.DictReader(io.StringIO(raw, newline=""), delimiter=sep):
            cpf = (x.get("NR_CPF_CANDIDATO") or x.get("CPF_CANDIDATO") or "").strip()
            nasc = (x.get("DT_NASCIMENTO") or x.get("DATA_NASCIMENTO") or "").strip()
            if cpf in SEM or not cpf.isdigit() or nasc in SEM: continue
            d, f = data(nasc); formatos[ano][f] += 1
            if d: por_cpf[cpf.zfill(11)].setdefault(ano, set()).add(d)

tipos = collections.Counter(); pares = collections.Counter(); difanos = collections.Counter()
for cpf, anos in por_cpf.items():
    todas = set().union(*anos.values())
    if len(todas) < 2: continue
    ds = sorted(todas); a, b = ds[0], ds[-1]
    if sorted((a[1], a[2])) == sorted((b[1], b[2])) and a[0] == b[0]: t = "dia_mes_trocados"
    elif (a[1], a[2]) == (b[1], b[2]): t = "so_o_ano_muda"; difanos[min(b[0] - a[0], 10)] += 1
    elif a[0] == b[0] and a[1] == b[1]: t = "so_o_dia_muda"
    elif a[0] == b[0]: t = "mesmo_ano_mes_e_dia_diferentes"
    else: t = "data_totalmente_diferente"
    tipos[t] += 1
    ys = sorted(anos); pares[(ys[0], ys[-1])] += 1
json.dump({"formatos_por_ano": {a: dict(c) for a, c in formatos.items()}, "tipos": dict(tipos),
           "so_o_ano_muda_diferenca_em_anos": dict(sorted(difanos.items())),
           "pares_primeiro_ultimo_ano_top": [[f"{a}-{b}", n] for (a, b), n in pares.most_common(12)],
           "cpfs_com_data_e_algum_ano": len(por_cpf)}, open(saida, "w"), indent=1, ensure_ascii=False)
print(open(saida).read())
