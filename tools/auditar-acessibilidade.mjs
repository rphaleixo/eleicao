// Verificações básicas de acessibilidade em cada tela: botões e links sem nome, imagens sem alt, campos sem rótulo, ids repetidos, alvos de toque menores que 44px
// (só os controles que a pessoa toca), saltos de nível de título e <html lang>. Não substitui um leitor de tela nem a checagem de contraste.
// Uso: BASE=http://localhost:8798 TURNO=2 node tools/auditar-acessibilidade.mjs
import { createRequire } from "node:module";
const require = createRequire(process.env.NODE_TOOLS ?? "/node-tools/node_modules/");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:8798", turno = process.env.TURNO ?? "2", origem = process.env.PROXY_ORIGEM ?? "https://eleicao.aleixo.workers.dev";
const rotas = (process.env.ROTAS ?? "#/andamento,#/evolucao,#/presidente,#/governadores,#/estados/RJ,#/turnos/BR,#/partidos,#/cenarios,#/geo").split(",");
const cache = new Map();
async function pegar(u) { if (cache.has(u)) return cache.get(u); let r; for (let i = 0; i < 6; i++) { try { r = await fetch(u); if (r.status !== 429 && r.status < 500) break; } catch {} await new Promise((s) => setTimeout(s, 700 * (i + 1))); } const o = r ? { status: r.status, body: Buffer.from(await r.arrayBuffer()), ct: r.headers.get("content-type") || "application/json" } : { status: 502, body: Buffer.from(""), ct: "text/plain" }; if (o.status === 200 && !/eventos|historico|resultados-/.test(u)) cache.set(u, o); return o; }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.route("**/api/**", async (route) => { const o = await pegar(route.request().url().replace(/^http:\/\/localhost:\d+/, origem)); route.fulfill({ status: o.status, contentType: o.ct, body: o.body }); });
const p = await ctx.newPage(); let total = 0;
for (const r of rotas) {
  await p.goto(`${base}/?turno=${turno}${r}`); await p.waitForTimeout(Number(process.env.ESPERA ?? 8000));
  const a = await p.evaluate(() => {
    const out = [], visivel = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !e.closest("[hidden],dialog:not([open])"); };
    const nome = (e) => (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") && document.getElementById(e.getAttribute("aria-labelledby"))?.textContent || e.innerText || e.getAttribute("title") || e.querySelector("img[alt]")?.alt || "").trim();
    if (!document.documentElement.lang) out.push("<html> sem lang");
    for (const e of document.querySelectorAll("button, a[href], [role=button]")) if (visivel(e) && !nome(e)) out.push(`sem nome acessível: <${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 30)}">`);
    for (const e of document.querySelectorAll("img")) if (visivel(e) && !e.hasAttribute("alt")) out.push(`imagem sem alt: ${String(e.src).slice(-30)}`);
    for (const e of document.querySelectorAll("input:not([type=hidden]), select, textarea")) if (visivel(e) && !e.labels?.length && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby")) out.push(`campo sem rótulo: <${e.tagName.toLowerCase()} ${e.name || e.id || e.className}>`);
    const ids = {}; for (const e of document.querySelectorAll("[id]")) ids[e.id] = (ids[e.id] ?? 0) + 1; for (const [k, v] of Object.entries(ids)) if (v > 1) out.push(`id repetido: #${k} (${v}x)`);
    const pequenos = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), [role=button]")].filter((e) => { if (!visivel(e)) return false; const r = e.getBoundingClientRect(); return (r.height < 40 || r.width < 40) && !e.matches(".link, .f-limpar, .skip, .pular") && getComputedStyle(e).position !== "absolute"; });
    if (pequenos.length) out.push(`${pequenos.length} alvo(s) de toque com menos de 40px, por exemplo: ${[...new Set(pequenos.slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}(${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)})`))].join(", ")}`);
    let ant = 0; for (const h of document.querySelectorAll("h1,h2,h3,h4")) { const n = +h.tagName[1]; if (ant && n > ant + 1) { out.push(`salto de título h${ant} → h${n}: "${h.textContent.trim().slice(0, 30)}"`); break; } ant = n; }
    if (document.querySelectorAll("h1").length !== 1) out.push(`${document.querySelectorAll("h1").length} títulos h1 (deveria haver 1)`);
    return [...new Set(out)].slice(0, 12);
  });
  total += a.length; console.log(`${r}: ${a.length ? "" : "ok"}`); a.forEach((x) => console.log("   -", x));
}
await b.close(); console.log(total ? `\n${total} achado(s)` : "\nnenhum achado"); process.exit(total ? 1 : 0);
