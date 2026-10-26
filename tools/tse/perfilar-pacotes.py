#!/usr/bin/env python3
"""Fase 0: baixa os pacotes do núcleo (votação nominal/partido/detalhe por município e zona e cadastro de candidatos) para um
diretório de cache, calcula SHA-256 e perfila cada CSV/TXT interno (linhas, codificação, separador, colunas). Só leitura do TSE;
não escreve em banco. Retoma de onde parou (pula o que já está no perfil).
Uso: python3 -I tools/tse/perfilar-pacotes.py tamanhos.json cache_dir perfil.json [tipos,separados,por,virgula]"""
import hashlib, json, os, sys, time, urllib.request, zipfile

tamanhos, cache, saida = sys.argv[1:4]
tipos = (sys.argv[4] if len(sys.argv) > 4 else "nominal,partido,detalhe,cadastro").split(",")
UA = {"User-Agent": "Mozilla/5.0"}
os.makedirs(cache, exist_ok=True)
perfil = json.load(open(saida)) if os.path.exists(saida) else {}

def baixar(url, destino):
    for i in range(4):
        try:
            h = hashlib.sha256()
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(destino, "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    f.write(b); h.update(b)
            return h.hexdigest()
        except Exception as e:
            print("  erro", e, file=sys.stderr); time.sleep(3 * (i + 1))
    raise RuntimeError("falhou " + url)

def detectar(amostra):
    try: amostra.decode("utf-8"); cod = "utf-8"
    except UnicodeDecodeError: cod = "latin-1"
    txt = amostra.decode(cod, errors="replace")
    cab = txt.splitlines()[0] if txt else ""
    sep = max([";", ",", "\t", "|"], key=cab.count)
    return cod, sep, [c.strip().strip('"') for c in cab.split(sep)]

def perfilar_zip(caminho):
    saida = []
    with zipfile.ZipFile(caminho) as z:
        for info in z.infolist():
            if info.is_dir(): continue
            with z.open(info) as f:
                amostra = f.read(1 << 20)
                cod, sep, cols = detectar(amostra)
                linhas = amostra.count(b"\n")
                while True:
                    b = f.read(1 << 22)
                    if not b: break
                    linhas += b.count(b"\n")
            saida.append({"membro": info.filename, "bytes_descomprimidos": info.file_size, "linhas": max(linhas - 1, 0),
                          "codificacao": cod, "separador": sep, "colunas": cols})
    return saida

for x in json.load(open(tamanhos)):
    if x["tipo"] not in tipos or x["arquivo"] in perfil: continue
    destino = os.path.join(cache, x["arquivo"])
    print(x["ano"], x["tipo"], x["arquivo"], x["bytes"], file=sys.stderr, flush=True)
    h = baixar(x["url"], destino)
    try: membros = perfilar_zip(destino)
    except Exception as e: membros = [{"erro": str(e)}]
    perfil[x["arquivo"]] = {"ano": x["ano"], "tipo": x["tipo"], "url": x["url"], "bytes": os.path.getsize(destino), "sha256": h,
                            "last_modified": x["last_modified"], "membros": membros}
    json.dump(perfil, open(saida, "w"), ensure_ascii=False, indent=1)
print("ok", len(perfil), "arquivos", file=sys.stderr)
