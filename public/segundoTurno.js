// Disputas definidas para o 2º turno, com os dois candidatos e o resultado de cada um no 1º turno.
import { DISPUTAS_SEGUNDO_TURNO, DATA_SEGUNDO_TURNO } from "./segundo-turno.js";
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { pct } from "./formato.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = DATA_SEGUNDO_TURNO.split("-").reverse().join("/");

// As fotos vêm do 1º turno (sempre publicadas); no 2º turno o TSE pode demorar a publicar as dele.
const foto = (d, c) => d.cargo === "presidente" ? `/api/ele2026/6257/fotos/br/${c.id}.jpeg` : `/api/ele2026/6259/fotos/${d.uf.toLowerCase()}/${c.id}.jpeg`;
export const tituloDisputa = (d) => (d.cargo === "presidente" ? "Presidente da República" : `Governo · ${UFS[d.uf] ?? d.uf}`);
export const hrefDisputa = (d) => (d.cargo === "presidente" ? "#/presidente" : `#/estados/${d.uf}/governador`);

const ERRO_FOTO = "if(!this.dataset.t&&this.src.includes('/api/ele')){this.dataset.t=1;this.src='https://resultados.tse.jus.br/oficial/'+this.src.split('/api/')[1]}else{this.onerror=null;this.src='img/sem-foto.png'}";

/** O resultado do 2º turno de uma disputa, quando já há seções apuradas: { pct (seções), por número do candidato }. */
export function resultado2(d2, d) {
  if (!d2 || !(d2.pctSecoes > 0)) return null;
  const por = {};
  for (const c of d.candidatos) { const x = d2.candidatos?.find((k) => String(k.numero) === String(c.numero)); if (x) por[c.numero] = x.pct; }
  return Object.keys(por).length === d.candidatos.length ? { pctSecoes: d2.pctSecoes, por } : null;
}

function lado(d, c, valor) {
  return `<div class="el-duplo__lado" style="--cor:${corPartido(c.partido)}"><img class="el-duplo__foto" loading="lazy" alt="" src="${foto(d, c)}" onerror="${ERRO_FOTO}"><span><span class="el-duplo__nome">${esc(c.nome)}</span><span class="el-chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span><span class="el-duplo__pct">${pct(valor)}</span></span></div>`;
}

/**
 * Cartão compacto de uma disputa (componente DisputaCompacta, el-duplo): os dois finalistas na mesma linha.
 * Sem dados do 2º turno, o número é o do 1º e o rodapé diz isso; com dados, o número grande é o do 2º e o do 1º vai para o rodapé.
 */
export function duplo(d, d2 = null) {
  const [a, b] = d.candidatos, r2 = resultado2(d2, d);
  const pe = r2
    ? `1º turno: ${pct(a.pct)} × ${pct(b.pct)} · 2º turno: ${pct(r2.pctSecoes)} das seções · <u>Ver apuração ›</u>`
    : `Resultado do 1º turno · ${pct(d.pctApurado)} das seções · <u>Ver apuração ›</u>`;
  return `<a class="el-duplo" href="${hrefDisputa(d)}" data-ver-completa><span class="el-duplo__topo"><span>${esc(tituloDisputa(d))}</span><span class="el-selo el-selo--segundo"><i aria-hidden="true"><span>2º</span></i>2º turno</span></span>
    <span class="el-duplo__corpo">${lado(d, a, r2 ? r2.por[a.numero] : a.pct)}<span class="el-duplo__x" aria-hidden="true">×</span>${lado(d, b, r2 ? r2.por[b.numero] : b.pct)}</span>
    <span class="el-duplo__pe">${pe}</span></a>`;
}

/** Cards das disputas. `cargo`: "presidente", "governador" ou nenhum (todas). `dados2`: Map "cargo/UF" -> resultado do 2º turno, quando já existe. */
export function blocoDisputas(cargo = null, dados2 = null, lista = DISPUTAS_SEGUNDO_TURNO) {
  const itens = lista.filter((d) => !cargo || d.cargo === cargo);
  if (!itens.length) return "";
  const cards = itens.map((d) => duplo(d, dados2?.get?.(`${d.cargo}/${d.uf}`) ?? null)).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Disputas do 2º turno</h2><span class="muted">${dataBR}</span></div>
    <p class="muted">${itens.length === 1 ? "A disputa definida" : `As ${itens.length} disputas definidas`} no 1º turno de 04/10/2026. Não há 2º turno para Senado nem para deputados.</p>
    <div class="duplo-lista">${cards}</div></section>`;
}
