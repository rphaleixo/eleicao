// Log das definições da eleição (eleito, 2º turno), da mais recente para a mais antiga.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hhmm = (s) => new Date(s * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const CARGO = { presidente: "Presidente", governador: "Governo", senador: "Senado" };

const nome = (c) => `<b style="--cor:${corPartido(c.p)}" class="link-cand" data-sq="${esc(c.id)}" role="button" tabindex="0">${esc(c.n)}</b> <span class="muted">(${esc(c.p)})</span>`;

/** Texto da definição: "Fulano é eleito" ou "2º turno entre A × B". */
export function textoEvento(e) {
  const cs = e.c ?? [];
  return e.tipo === "segundo" ? `definição de 2º turno entre ${cs.map(nome).join(" × ")}` : `${cs.map(nome).join(" e ")} ${cs.length > 1 ? "são eleitos" : "é eleito"}`;
}

/** Mais recentes primeiro. */
export const ordenarEventos = (itens) => [...(itens ?? [])].sort((a, b) => b.t - a.t || String(a.k).localeCompare(String(b.k)));

/** Bloco do log. `dados` = resposta de /api/eventos ({itens, acompanhados, fechados}) ou null enquanto carrega. */
export function blocoEventos(dados) {
  if (!dados) return `<section class="card"><h2>Definições da eleição</h2><p class="muted">Carregando…</p></section>`;
  const itens = ordenarEventos(dados.itens);
  const linhas = itens.map((e) => `<li class="ev ${e.tipo}"><span class="ev-hora">${e.a ? "até " : ""}${hhmm(e.t)}</span>
    <span class="ev-corpo"><span class="ev-onde">${CARGO[e.cargo] ?? esc(e.cargo)}${e.cargo === "presidente" ? "" : ` · ${esc(e.uf)}`}</span> ${textoEvento(e)}</span></li>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Definições da eleição</h2><span class="muted">${itens.length}</span></div>
    ${itens.length ? `<ul class="log-eventos">${linhas}</ul>` : `<p class="muted">Nenhuma definição ainda. Aqui aparecem, da mais recente para a mais antiga, os candidatos eleitos e os 2º turnos confirmados desde o início da apuração.</p>`}
    <p class="muted nota">A hora é a em que o site registrou a definição (verificação a cada poucos minutos). Itens com "até" já estavam definidos quando o registro começou.${dados.acompanhados ? ` Cargos acompanhados: ${dados.acompanhados}; já definidos: ${dados.fechados}.` : ""}</p></section>`;
}
