"""Gera public/mapa-brasil.js a partir da malha de estados do IBGE.

Uso:
  curl -o malha.svg "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=image/svg%2Bxml&qualidade=minima&intrarregiao=UF"
  python3 tools/gerar-mapa.py malha.svg public/mapa-brasil.js

Converte os caminhos relativos do IBGE (comandos M, l, h, Z) em pontos de 0,01 grau, remove pontos repetidos
e guarda o centro do maior polígono de cada estado, para escrever a sigla.
"""
import json, re, sys

COD = {'11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB',
       '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'}


def subcaminhos(d):
    for sp in re.split(r'(?=M)', d):
        sp = sp.strip()
        if not sp:
            continue
        toks = re.findall(r'[MhlZz]|-?\d+(?:\.\d+)?', sp)
        pts, i, cmd, x, y = [], 0, None, 0, 0
        while i < len(toks):
            t = toks[i]
            if t in 'MhlZz':
                cmd = t; i += 1; continue
            if cmd == 'h':
                x += float(t); i += 1
            else:
                a, b = float(toks[i]), float(toks[i + 1]); i += 2
                if cmd == 'M':
                    x, y, cmd = a, b, 'l'
                else:
                    x += a; y += b
            pts.append((x, y))
        yield pts


def main(entrada, saida):
    svg = open(entrada).read()
    res, todos_x, todos_y = {}, [], []
    for pid, d in re.findall(r'<path id="(\d+)" d="([^"]+)"', svg):
        uf, enc, melhor = COD[pid], [], None
        for pts in subcaminhos(d):
            q = [(round(px / 100), round(-py / 100)) for px, py in pts]
            dd = [q[0]] + [p for i, p in enumerate(q[1:], 1) if p != q[i - 1]]
            if len(dd) < 3:
                continue
            enc.append('M%d %d' % dd[0] + ''.join('l%d %d' % (dd[i][0] - dd[i - 1][0], dd[i][1] - dd[i - 1][1]) for i in range(1, len(dd))) + 'z')
            area = abs(sum(dd[i][0] * dd[(i + 1) % len(dd)][1] - dd[(i + 1) % len(dd)][0] * dd[i][1] for i in range(len(dd)))) / 2
            if melhor is None or area > melhor[0]:
                melhor = (area, dd)
            todos_x += [p[0] for p in dd]; todos_y += [p[1] for p in dd]
        xs, ys = [p[0] for p in melhor[1]], [p[1] for p in melhor[1]]
        res[uf] = {'d': ''.join(enc), 'c': [round((min(xs) + max(xs)) / 2), round((min(ys) + max(ys)) / 2)]}
    vb = (min(todos_x) - 20, min(todos_y) - 20, max(todos_x) - min(todos_x) + 40, max(todos_y) - min(todos_y) + 40)
    js = ('// Mapa dos estados do Brasil (malha do IBGE, simplificada). Unidades de 0,01 grau; y = -latitude.\n'
          '// Fonte: servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF. Veja tools/gerar-mapa.py.\n'
          'export const VIEWBOX = "%d %d %d %d";\nexport const ESTADOS = %s;\n' % (vb + (json.dumps(res, ensure_ascii=False, separators=(',', ':')),)))
    open(saida, 'w').write(js)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
