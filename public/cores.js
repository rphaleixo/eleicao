// Cores dos partidos, padronizadas pela predefinição "Cor de partido político (BRA)" da Wikipédia.
// Para federações usa-se a cor do primeiro partido da lista.
// UP: o preto da predefinição (#000000) foi suavizado para #4A4A4F, que continua visível no tema escuro.
// Sem cor na predefinição: Democrata (mantida a cor anterior). Agir usa a do PTC (nome anterior do partido).
const CORES = {
  agir: "#01369E", avante: "#2EABB1", cidadania: "#EC008C", dc: "#C89721", democrata: "#13617C",
  mdb: "#009959", missao: "#FCBE26", mobiliza: "#DD3333", ptb: "#005533", pnm: "#CF7676", pmn: "#CF7676",
  novo: "#EC671C", pcb: "#A8231C", pcdob: "#800314", pco: "#9F030A", pdt: "#FE8E6D", pl: "#30306C",
  pode: "#00D663", podemos: "#00D663", pp: "#54B8EA", prd: "#007C3C", prtb: "#0047AB", psb: "#FFCC00",
  psd: "#FFA400", psdb: "#0F2BC5", psol: "#68018D", pstu: "#C92127", pt: "#C0122D", pv: "#01652F",
  rede: "#3CA08C", republicanos: "#005CA9", solidariedade: "#F37021", uniao: "#00A0DF", up: "#4A4A4F",
};
const SEM_COR = "#8a94a3";

const limpar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function corPartido(sigla) {
  const primeiro = String(sigla ?? "").split("/")[0];
  return CORES[limpar(primeiro)] ?? SEM_COR;
}

/** Cor do texto sobre um fundo `hex`: escura quando o fundo é claro (amarelos, laranjas), branca nos demais. */
export function corTextoSobre(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  if (!m) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1a1a1a" : "#fff";
}

/** Ajusta o texto das etiquetas de partido (.chip) conforme a cor de fundo. Chamar depois de desenhar a tela. */
export function ajustarContrasteChips(raiz) {
  raiz.querySelectorAll(".chip[style*='--cor']").forEach((el) => {
    const cor = /--cor:\s*(#[0-9a-f]{6})/i.exec(el.getAttribute("style") ?? "")?.[1];
    if (!cor) return;
    const t = corTextoSobre(cor);
    el.style.color = t;
    el.style.textShadow = t === "#fff" ? "" : "none";
  });
}
