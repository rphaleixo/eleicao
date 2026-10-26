// Auditoria de largura: abre cada tela em vários tamanhos de celular e acusa o que estoura (rolagem horizontal da página, texto que passa da caixa).
// 300 e 320 px fazem o papel de um celular de 390 px com a fonte do sistema aumentada (cerca de 1,2 a 1,3 vez).
// Uso: BASE=http://localhost:8798 ROTAS="#/andamento,#/turnos/BR" LARGURAS=300,320,360,390,412 node tools/auditar-largura.mjs
import { createRequire } from "node:module";
const require = createRequire(process.env.NODE_TOOLS ?? "/node-tools/node_modules/");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:8798", turno = process.env.TURNO ?? "2";
const rotas = (process.env.ROTAS ?? "#/andamento,#/evolucao,#/presidente,#/governadores,#/estados/RJ,#/turnos/BR,#/partidos,#/cenarios,#/geo").split(",");
const larguras = (process.env.LARGURAS ?? "300,320,360,390,412").split(",").map(Number);
const proxy = process.env.PROXY_ORIGEM ?? "https://eleicao.aleixo.workers.dev";
const cache = new Map();
async function pegar(u) { if (cache.has(u)) return cache.get(u); let r; for (let i = 0; i < 6; i++) { try { r = await fetch(u); if (r.status !== 429 && r.status < 500) break; } catch {} await new Promise((s) => setTimeout(s, 700 * (i + 1))); } const o = r ? { status: r.status, body: Buffer.from(await r.arrayBuffer()), ct: r.headers.get("content-type") || "application/json" } : { status: 502, body: Buffer.from(""), ct: "text/plain" }; if (o.status === 200 && !/eventos|historico|resultados-/.test(u)) cache.set(u, o); return o; }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
let total = 0;
for (const w of larguras) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, colorScheme: "dark" });
  await ctx.route("**/api/**", async (route) => { const o = await pegar(route.request().url().replace(/^http:\/\/localhost:\d+/, proxy)); route.fulfill({ status: o.status, contentType: o.ct, body: o.body }); });
  const p = await ctx.newPage();
  for (const r of rotas) {
    await p.goto(`${base}/?turno=${turno}${r}`); await p.waitForTimeout(Number(process.env.ESPERA ?? 9000));
    const achados = await p.evaluate(() => {
      const W = document.documentElement.clientWidth, out = [];
      if (document.documentElement.scrollWidth > W + 1) out.push(`página rola na horizontal (${document.documentElement.scrollWidth} > ${W})`);
      const rolavel = (e) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === "auto" || o === "scroll") return true; } return false; };
      for (const e of document.querySelectorAll("#conteudo *, header *, nav *")) {
        const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        if (r.right > W + 1 && !rolavel(e) && !e.closest("svg")) { out.push(`passa da tela: <${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 40)}"> "${(e.innerText || "").slice(0, 24).replace(/\n/g, " ")}" (direita ${Math.round(r.right)})`); }
        else if (e.scrollWidth > e.clientWidth + 1 && cs.overflowX === "visible" && !e.matches(".link, .f-limpar, .btn-mais, .chip-exterior") && e.children.length === 0 && (e.innerText || "").trim().length > 2 && cs.display !== "inline" && !e.closest("svg")) out.push(`texto passa da caixa: <${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 40)}"> "${(e.innerText || "").slice(0, 24).replace(/\n/g, " ")}" (${e.scrollWidth} > ${e.clientWidth})`);
      }
      return [...new Set(out)].slice(0, 12);
    });
    total += achados.length;
    console.log(`${w}px ${r}: ${achados.length ? achados.length + " problema(s)" : "ok"}`);
    for (const a of achados) console.log("   -", a);
  }
  await ctx.close();
}
await b.close();
console.log(total ? `\n${total} achado(s) no total` : "\nnenhum achado");
process.exit(total ? 1 : 0);
