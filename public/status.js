// Linha de status dos quadros com projeção: situação da apuração, horário da última atualização e % das urnas apuradas.
import { pct } from "./formato.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const TEXTO_ANDAMENTO = { n: "Apuração não iniciada", p: "Em apuração", f: "Totalização finalizada" };

/** "04/10/2026 18:41:45" -> "18:41, 04/10/2026". Texto fora desse formato é devolvido como veio. */
export function formatarQuando(texto) {
  const m = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(texto ?? "").trim());
  return m ? `${m[2]}:${m[3]}, ${m[1]}` : String(texto ?? "").trim();
}

/** @param {{andamento?:string, pct?:number, quando?:string}} o */
export function statusProjecao({ andamento = "n", pct: p, quando = "" } = {}) {
  const classe = andamento === "f" ? "f" : andamento === "p" ? "p" : "n";
  const hora = formatarQuando(quando);
  const partes = [hora ? `Status em ${hora}` : "", p != null && Number.isFinite(Number(p)) ? `${pct(p)} das urnas apuradas` : ""].filter(Boolean).join(" · ");
  return `<p class="status-proj"><span class="selo ${classe === "n" ? "" : classe}">${esc(TEXTO_ANDAMENTO[classe])}</span>${partes ? `<span class="status-txt">${esc(partes)}</span>` : ""}</p>`;
}
