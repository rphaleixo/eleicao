// Disputas definidas para o 2º turno, com os dois candidatos e o resultado de cada um no 1º turno.
import { DISPUTAS_SEGUNDO_TURNO, DATA_SEGUNDO_TURNO } from "./segundo-turno.js";
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = DATA_SEGUNDO_TURNO.split("-").reverse().join("/");

// As fotos vêm do 1º turno (sempre publicadas); no 2º turno o TSE pode demorar a publicar as dele.
const foto = (d, c) => d.cargo === "presidente" ? `/api/ele2026/6257/fotos/br/${c.id}.jpeg` : `/api/ele2026/6259/fotos/${d.uf.toLowerCase()}/${c.id}.jpeg`;
export const tituloDisputa = (d) => (d.cargo === "presidente" ? "Presidente da República" : `Governo · ${UFS[d.uf] ?? d.uf}`);
export const hrefDisputa = (d) => (d.cargo === "presidente" ? "#/presidente" : `#/estados/${d.uf}/governador`);

function candidato(d, c) {
  return `<span class="dp-cand" style="--cor:${corPartido(c.partido)}"><img class="foto dp-foto" loading="lazy" alt="" src="${foto(d, c)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
    <b>${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>
    <strong>${pct(c.pct)}</strong><small>${fmt(c.votos)} votos no 1º turno</small></span>`;
}

/** Cards das disputas. `cargo`: "presidente", "governador" ou nenhum (todas). */
export function blocoDisputas(cargo = null, lista = DISPUTAS_SEGUNDO_TURNO) {
  const itens = lista.filter((d) => !cargo || d.cargo === cargo);
  if (!itens.length) return "";
  const cards = itens.map((d) => `<li><a class="card-dp" href="${hrefDisputa(d)}" data-ver-completa>
      <span class="dp-topo"><b>${esc(tituloDisputa(d))}</b><span class="dp-selo">2º turno</span></span>
      <span class="dp-duelo">${candidato(d, d.candidatos[0])}<span class="dp-x" aria-hidden="true">×</span>${candidato(d, d.candidatos[1])}</span>
      <span class="dp-rodape">Resultado do 1º turno · ${pct(d.pctApurado)} das seções · <u>Ver apuração ›</u></span></a></li>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Disputas do 2º turno</h2><span class="muted">${dataBR}</span></div>
    <p class="muted">${itens.length === 1 ? "A disputa definida" : `As ${itens.length} disputas definidas`} no 1º turno de 04/10/2026. Não há 2º turno para Senado nem para deputados.</p>
    <ul class="dp-lista">${cards}</ul></section>`;
}
