// Linguagem visual única para eleição definida, candidato eleito e 2º turno.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const TEXTO_SIT = { eleito: "Eleito", segundo: "2º turno" };

/** Selo do candidato: ✓ Eleito (verde) ou ② 2º turno (âmbar). Vazio se não houver situação. */
export function seloSit(c, { curto = false, rotulo = "Eleito" } = {}) {
  if (c?.sit === "eleito") return `<span class="selo-sit eleito" title="${esc(rotulo)}"><i aria-hidden="true">✓</i>${curto ? "" : esc(rotulo)}</span>`;
  if (c?.sit === "segundo") return `<span class="selo-sit segundo" title="Vai ao 2º turno"><i aria-hidden="true">2º</i>${curto ? "" : "turno"}</span>`;
  return "";
}

/** Selo da eleição no cabeçalho de um cartão: "Definida" (verde) ou "2º turno" (âmbar). */
export function seloEleicao(d) {
  const sit = situacaoEleicao(d);
  if (sit === "eleito") return `<span class="selo-sit eleito" title="Eleição definida"><i aria-hidden="true">✓</i>Definida</span>`;
  if (sit === "segundo") return `<span class="selo-sit segundo" title="Vai ao 2º turno"><i aria-hidden="true">2º</i>turno</span>`;
  return "";
}

/** Eleito na projeção (ainda não confirmado pelo TSE): contorno tracejado. */
export const seloProjetado = ({ curto = false } = {}) => `<span class="selo-sit projetado" title="Eleito na projeção, ainda sem confirmação do TSE"><i aria-hidden="true">✓</i>${curto ? "" : "Projeção"}</span>`;

/** Texto do selo de um eleito: "Eleito por QP", "Eleito por média"... ou só "Eleito". */
export const rotuloEleito = (c) => (/^eleito\b/i.test(String(c?.situacao ?? "").trim()) ? String(c.situacao).trim() : "Eleito");

/** Classe CSS que destaca a linha/cartão do candidato. */
export const classeSit = (c) => (c?.sit ? ` sit-${c.sit}` : "");

/** Situação da eleição como um todo: "eleito" (definida), "segundo" (vai ao 2º turno) ou "". */
export function situacaoEleicao(d) {
  if (!d?.candidatos) return "";
  if (d.candidatos.some((c) => c.sit === "eleito")) return "eleito";
  if (d.candidatos.some((c) => c.sit === "segundo")) return "segundo";
  return "";
}

/** Faixa de destaque: "Eleição definida: X eleito" ou "2º turno: A × B". */
export function faixaDefinicao(d) {
  const sit = situacaoEleicao(d);
  if (!sit) return "";
  const nomes = d.candidatos.filter((c) => c.sit === sit).map((c) => esc(c.nome));
  if (sit === "eleito") return `<div class="faixa-def eleito" role="status"><i aria-hidden="true">✓</i><span><b>Eleição definida</b>${nomes.length ? ` · ${nomes.join(" e ")} ${nomes.length > 1 ? "eleitos" : "eleito"}` : ""}</span></div>`;
  return `<div class="faixa-def segundo" role="status"><i aria-hidden="true">2º</i><span><b>Vai ao 2º turno</b>${nomes.length ? ` · ${nomes.join(" × ")}` : ""}</span></div>`;
}

/** Legenda para as telas com vários estados. O Senado não tem 2º turno. */
export const legendaSituacao = (comSegundoTurno = true) => `<p class="legenda-sit"><span class="selo-sit eleito"><i aria-hidden="true">✓</i>Eleito</span>${comSegundoTurno ? `<span class="selo-sit segundo"><i aria-hidden="true">2º</i>2º turno</span>` : ""}<span class="muted">Eleição definida ou em andamento</span></p>`;
