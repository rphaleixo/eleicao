// Cores dos partidos (mesma paleta usada pelos grandes portais de apuração).
// Para federações usa-se a cor do primeiro partido da lista.
const CORES = {
  agir: "#5387C5", avante: "#4C8790", cidadania: "#C63C94", dc: "#AB7C24", democrata: "#13617C",
  mdb: "#4F9960", missao: "#D8942F", mobiliza: "#C36969", ptb: "#C36969", pnm: "#C36969",
  novo: "#4083A6", pcb: "#E54B5A", pcdob: "#B3263A", pco: "#923D00", pdt: "#2569AD", pl: "#272D97",
  pode: "#658C4C", podemos: "#658C4C", pp: "#5AA0C8", prd: "#009B95", prtb: "#2152AB", psb: "#C6491D",
  psd: "#A0A00B", psdb: "#3683CD", psol: "#C5A020", pstu: "#B35454", pt: "#D60828", pv: "#098428",
  rede: "#6D6D6D", republicanos: "#3C678A", solidariedade: "#D86F3A", uniao: "#485986", up: "#454545",
};
const SEM_COR = "#8a94a3";

const limpar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function corPartido(sigla) {
  const primeiro = String(sigla ?? "").split("/")[0];
  return CORES[limpar(primeiro)] ?? SEM_COR;
}
