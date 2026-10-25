// Toast (componente Toast do design system): aviso temporário fixo, fora do fluxo da página, então a altura nunca muda.
// Um por vez; o novo substitui o anterior. Depois de dispensado, o mesmo aviso só volta se o estado mudar.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let atual = null; // { assunto, estado }
let relogio = null;
const dispensados = new Map(); // assunto -> estado em que foi dispensado
const caixa = () => globalThis.document?.getElementById?.("toasts") ?? null;

function limpar() { clearTimeout(relogio); relogio = null; atual = null; const c = caixa(); if (c) c.innerHTML = ""; }

/**
 * @param {{assunto:string, estado?:string, titulo:string, apoio?:string, acao?:{rotulo:string, atributo:string}, sucesso?:boolean}} t
 *   `estado` identifica a situação: dispensado um aviso, ele só volta quando o estado muda. `sucesso`: some sozinho em 4 s.
 * @returns {boolean} se o aviso foi mostrado
 */
export function mostrarToast({ assunto, estado = "", titulo, apoio = "", acao = null, sucesso = false }) {
  if (dispensados.has(assunto) && dispensados.get(assunto) === estado) return false;
  if (atual?.assunto === assunto && atual.estado === estado) return true; // já está na tela
  dispensados.delete(assunto);
  limpar();
  atual = { assunto, estado };
  const c = caixa();
  if (c) c.innerHTML = `<div class="el-toast${sucesso ? " el-toast--ok" : ""}" role="status" aria-live="polite" data-toast="${esc(assunto)}"><span class="el-toast__icone" aria-hidden="true">${sucesso ? "✓" : "!"}</span><div class="el-toast__texto"><b>${esc(titulo)}</b>${esc(apoio)}</div><button type="button" class="el-toast__fechar" data-toast-fechar aria-label="Dispensar aviso">×</button>${acao ? `<div class="el-toast__acoes"><button type="button" ${acao.atributo}>${esc(acao.rotulo)}</button></div>` : ""}</div>`;
  if (sucesso) relogio = setTimeout(() => { if (atual?.assunto === assunto) limpar(); }, 4000);
  return true;
}

/** A situação se resolveu: tira o aviso desse assunto (se for o que está na tela) e esquece que foi dispensado. */
export function resolverToast(assunto) {
  dispensados.delete(assunto);
  if (atual?.assunto === assunto) limpar();
}

/** O "×": dispensa o aviso atual. */
export function dispensarToast() {
  if (!atual) return;
  dispensados.set(atual.assunto, atual.estado);
  limpar();
}

export const assuntoAtual = () => atual?.assunto ?? null;
