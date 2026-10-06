// Endereço da página (#/aba/estado/...), com a leitura e a montagem em um só lugar.
export const ABAS_IDS = ["andamento", "presidente", "governadores", "senadores", "camara", "partidos", "cenarios", "geo", "nulos", "estados"];
export const CARGOS_ESTADO = ["resumo", "governador", "senador", "dep-federal", "dep-estadual", "presidente", "mapa"];
const COM_MUNICIPIO = ["governador", "senador", "presidente"];

/** Lê o endereço. Aceita os endereços antigos (#/governador/SP, #/dep-federal/BR). */
export function lerRota(hash, { ufs, ufPadrao }) {
  const [, a, u, c3, c4] = String(hash || "").split("/");
  let aba = a, cargo = "resumo", uf = (u || "BR").toUpperCase(), terceiro = c3, mun = "";
  if (a === "eleitos") aba = "senadores"; // endereço antigo da lista de senadores eleitos
  else if (a === "governador" && uf === "BR") aba = "governadores";
  else if (a === "senador" && uf === "BR") aba = "senadores";
  else if (a === "governador" || a === "senador" || a === "dep-estadual") { aba = "estados"; cargo = a; }
  else if (a === "dep-federal") { if (uf === "BR") aba = "camara"; else { aba = "estados"; cargo = "dep-federal"; } }
  if (!ABAS_IDS.includes(aba)) aba = "andamento";
  if (aba === "cenarios") return { aba, uf: "BR", cargo, mun: "", ...(u ? { cenario: u.toLowerCase() } : {}) }; // #/cenarios/psol-pt
  if (aba === "partidos") { let partido = ""; try { partido = decodeURIComponent(u || ""); } catch { /* endereço malformado */ } return { aba, uf: "BR", cargo, mun: "", ...(partido ? { partido } : {}) }; } // #/partidos/PT: o 2º trecho é o partido

  if (aba === "estados") {
    if (!ufs[uf]) uf = ufPadrao;
    if (a === "estados") { if (CARGOS_ESTADO.includes(c3)) cargo = c3; terceiro = c4; }
    mun = COM_MUNICIPIO.includes(cargo) && /^\d{5}$/.test(terceiro || "") ? terceiro : "";
    return { aba, uf, cargo, mun };
  }
  const zzOk = aba === "presidente" || aba === "andamento";
  if (aba === "camara" || aba === "governadores" || aba === "senadores" || !(uf === "BR" || ufs[uf] || (uf === "ZZ" && zzOk))) uf = "BR";
  mun = aba === "presidente" && uf !== "BR" && uf !== "ZZ" && /^\d{5}$/.test(c3 || "") ? c3 : "";
  return { aba, uf, cargo, mun };
}

export function montarRota({ aba, uf, cargo, mun, partido, cenario }) {
  if (aba === "cenarios") return "#/cenarios" + (cenario ? "/" + cenario : "");
  if (aba === "partidos") return "#/partidos" + (partido ? "/" + encodeURIComponent(partido) : "");
  if (aba === "estados") return "#/" + ["estados", uf, cargo !== "resumo" ? cargo : "", cargo !== "resumo" ? mun : ""].filter(Boolean).join("/");
  return "#/" + [aba, uf, mun].filter(Boolean).join("/");
}
