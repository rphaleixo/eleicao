// Tema do site: Auto (segue o aparelho), Claro ou Escuro. A escolha vai em data-theme no elemento raiz e é guardada no aparelho.
export const TEMAS = [["auto", "Auto"], ["claro", "Claro"], ["escuro", "Escuro"]];

/** Lê a escolha guardada; sem armazenamento (ou valor estranho), vale Auto. */
export function lerTema() {
  try { const v = localStorage.getItem("tema"); return TEMAS.some(([k]) => k === v) ? v : "auto"; } catch { return "auto"; }
}

/** Aplica a escolha no <html>: Auto tira o atributo para valer o que o aparelho pede. */
export function aplicarTema(escolha, raiz = globalThis.document?.documentElement) {
  const t = TEMAS.some(([k]) => k === escolha) ? escolha : "auto";
  if (raiz) { if (t === "auto") raiz.removeAttribute("data-theme"); else raiz.setAttribute("data-theme", t); }
  return t;
}

/** Guarda a escolha (sem erro se não houver armazenamento) e aplica. */
export function escolherTema(escolha, raiz) {
  const t = aplicarTema(escolha, raiz);
  try { localStorage.setItem("tema", t); } catch { /* sem armazenamento: vale só nesta visita */ }
  return t;
}

/** O controle Auto, Claro, Escuro (componente Tema). */
export const controleTema = (atual = lerTema()) => `<div class="el-tema" role="group" aria-label="Tema">${TEMAS.map(([k, n]) => `<button type="button" data-tema="${k}" aria-pressed="${k === atual}">${n}</button>`).join("")}</div>`;
