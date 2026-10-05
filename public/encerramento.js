// Quando os dados de uma tela já são os finais, o site para de buscar no servidor.
export const fim = (d) => !d || d.totalizacaoFinal || d.andamento === "f" || d.pctSecoes >= 100;
export const acFinal = (ac) => { const b = ac?.ufs?.br; return !!b && (b.andamento === "f" || (b.ts > 0 && b.st >= b.ts)); };

/**
 * Os dados desta tela são os finais? Vale quando o acompanhamento do TSE dá a apuração como finalizada, o arquivo de cada cargo também,
 * e tudo que chegava em segundo plano já chegou (`spCompletos(chaves)`).
 */
export function telaCompleta(v, rota, spCompletos = () => true) {
  const lista = (l) => Array.isArray(l) && l.length > 0 && l.every((x) => fim(x.d));
  switch (v?.tipo) {
    case "andamento": return acFinal(v.f) && acFinal(v.e) && (rota.uf === "BR" || spCompletos(["det-" + rota.uf]));
    case "presidente": return acFinal(v.ac) && fim(v.d) && lista(v.lista) && spCompletos(["pan-presidente"]);
    case "cargo-por-estado": return acFinal(v.e) && lista(v.lista) && spCompletos(["pan-" + v.cargo]);
    case "nacional-prop": return acFinal(v.ac) && Array.isArray(v.estados) && v.estados.every((x) => fim(x.d)) && spCompletos(["nacional"]);
    case "partidos": return !!v.final && lista(v.gov) && lista(v.sen) && Array.isArray(v.depf) && v.depf.every((x) => fim(x.d)) && Array.isArray(v.depe) && v.depe.every((x) => fim(x.d)) && fim(v.pres);
    case "estados": {
      if (v.cargo === "mapa") return false; // o mapa carrega município a município
      const f = acFinal(v.f), e = acFinal(v.e);
      if (v.cargo === "resumo") return f && e && spCompletos(["detx-" + rota.uf]);
      return (v.cargo === "presidente" ? f : e) && fim(v.d);
    }
    default: return false;
  }
}
