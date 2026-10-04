// Mapa por município: desenho (IBGE) e votação de cada município (um arquivo do TSE por município, carregados aos poucos).

/** Lê o SVG do IBGE: { viewBox, caminhos: Map(códigoIBGE -> d) }. */
export function lerMalha(svg) {
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "";
  const caminhos = new Map();
  for (const m of svg.matchAll(/<path id="(\d+)" d="([^"]+)"/g)) caminhos.set(m[1], m[2]);
  return { viewBox: vb, caminhos };
}

const memoria = new Map(); // "cargo/uf/cod" -> { t, d }
const execucoes = new Map(); // "cargo/uf" -> { emVoo, t }
export const chaveMun = (cargo, uf, cod) => `${cargo}/${uf}/${cod}`;
export const lerMun = (cargo, uf, cod) => memoria.get(chaveMun(cargo, uf, cod))?.d;
export const progresso = (cargo, uf, municipios) => municipios.filter((m) => memoria.has(chaveMun(cargo, uf, m.cod))).length;
export function limparMunicipios() { memoria.clear(); execucoes.clear(); }

/**
 * Carrega os municípios de um estado, no máximo `concorrencia` por vez. O que já foi carregado há menos de `ttl` ms não é pedido de novo;
 * município sem arquivo (404) só é tentado de novo depois de `ttlVazio` ms. `aoProgresso` é chamado no máximo uma vez a cada `intervalo` ms.
 */
export async function carregarMunicipios({ cargo, uf, municipios, buscar, aoProgresso = () => {}, ttl = 60_000, ttlVazio = 300_000, concorrencia = 10, intervalo = 800 }) {
  const chave = `${cargo}/${uf}`;
  if (execucoes.get(chave)?.emVoo) return;
  const agora = Date.now();
  const fila = municipios.filter((m) => { const e = memoria.get(chaveMun(cargo, uf, m.cod)); return !e || agora - e.t > (e.d ? ttl : ttlVazio); });
  if (!fila.length) return;
  execucoes.set(chave, { emVoo: true });
  let timer = null;
  const avisar = () => { if (timer) return; timer = setTimeout(() => { timer = null; aoProgresso(); }, intervalo); };
  const trabalhador = async () => {
    while (fila.length) {
      const m = fila.shift();
      let d = null;
      try { d = await buscar(cargo, uf, m.cod); } catch { d = null; }
      memoria.set(chaveMun(cargo, uf, m.cod), { t: Date.now(), d });
      avisar();
    }
  };
  try { await Promise.all(Array.from({ length: Math.min(concorrencia, fila.length) }, trabalhador)); }
  finally { execucoes.set(chave, { emVoo: false }); clearTimeout(timer); timer = null; aoProgresso(); }
}
