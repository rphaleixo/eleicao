// Leitura do Registro Digital do Voto (RDV) de uma urna: formato binário ASN.1 BER do TSE.
const COM_NUMERO = new Set([1, 3, 5]); // presidente, governador, senador: guardamos o número digitado; nos demais cargos, só o total por tipo de voto
const COM_DIGITOS = new Set([4, 7]); // nulo comum e nulo por repetição (o eleitor votou duas vezes no mesmo candidato ao Senado)

function* tlvs(b, i, fim) {
  while (i < fim) {
    const tag = b[i++], classe = tag >> 6, composto = (tag >> 5) & 1;
    let num = tag & 31;
    if (num === 31) { num = 0; let x; do { x = b[i++]; num = (num << 7) | (x & 127); } while (x & 128); }
    let len = b[i++];
    if (len & 128) { const n = len & 127; len = 0; for (let k = 0; k < n; k++) len = len * 256 + b[i++]; }
    yield { classe, composto, num, ini: i, fim: i + len };
    i += len;
  }
}
const inteiro = (b, n) => { let v = 0; for (let i = n.ini; i < n.fim; i++) v = v * 256 + b[i]; return v; };

/** Percorre o RDV e chama `voto(cargo, tipo, digitos)` para cada voto (digitos = número digitado, ou "" quando o voto não guarda número). */
function percorrer(b, voto) {
  const caminhar = (ini, fim, cargo, prof) => {
    const filhos = [...tlvs(b, ini, fim)];
    for (const n of filhos) if (n.classe === 2 && n.num === 1 && !n.composto) cargo = inteiro(b, n);
    for (const n of filhos) {
      if (!n.composto || prof > 14) continue;
      const sub = [...tlvs(b, n.ini, n.fim)];
      const tipo = sub.find((c) => c.classe === 0 && c.num === 10 && !c.composto);
      if (tipo && sub.length <= 2 && !sub.some((c) => c.composto)) { // um voto: tipo e, quando houver, o número digitado
        const dig = sub.find((c) => c.classe === 0 && c.num === 18);
        voto(cargo, inteiro(b, tipo), dig ? new TextDecoder().decode(b.subarray(dig.ini, dig.fim)) : "");
      } else caminhar(n.ini, n.fim, cargo, prof + 1);
    }
  };
  caminhar(0, b.length, null, 0);
}

/** Soma, por cargo, os tipos de voto e (nos cargos majoritários) os números digitados nos nulos. */
export function resumirRdv(b) {
  const out = {};
  percorrer(b, (cargo, t, texto) => {
    const c = (out[cargo] ??= {});
    if (COM_NUMERO.has(cargo) && texto && COM_DIGITOS.has(t)) { const d = (c[t] ??= {}); d[texto] = (d[texto] ?? 0) + 1; } else c[t] = (c[t] ?? 0) + 1;
  });
  return out;
}

/** Votos de um cargo em uma urna: por candidato (nominais, pelo número), brancos e nulos (todos os tipos de nulo). */
export function votosDoCargo(b, cargo) {
  const r = { candidatos: {}, brancos: 0, nulos: 0, total: 0 };
  percorrer(b, (c, t, texto) => {
    if (c !== cargo) return;
    r.total++;
    if (t === 2) r.candidatos[texto] = (r.candidatos[texto] ?? 0) + 1;
    else if (t === 3 || t === 5) r.brancos++;
    else if (t === 4 || t === 6 || t === 7 || t === 8 || t === 9) r.nulos++;
  });
  return r;
}
