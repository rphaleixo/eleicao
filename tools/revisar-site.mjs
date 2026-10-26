// Revisão do site: (1) saúde de cada tela (erros de script, pedidos que falham, "undefined"/"NaN", percentuais fora das duas casas, "Carregando" que não termina)
// e (2) conferência de números contra o arquivo oficial do TSE (percentual e votos do 1º e do 2º colocado de Presidente e dos governos).
// Uso: BASE=http://localhost:8798 TURNO=2 node tools/revisar-site.mjs   (os dados vêm do site publicado, com cache; precisa de playwright)
import { createRequire } from "node:module";
const require = createRequire(process.env.NODE_TOOLS ?? "/node-tools/node_modules/");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:8798", turno = process.env.TURNO ?? "2", origem = process.env.PROXY_ORIGEM ?? "https://eleicao.aleixo.workers.dev";
const espera = Number(process.env.ESPERA ?? 8000);
const cache = new Map();
async function pegar(u) { if (cache.has(u)) return cache.get(u); let r; for (let i = 0; i < 6; i++) { try { r = await fetch(u); if (r.status !== 429 && r.status < 500) break; } catch {} await new Promise((s) => setTimeout(s, 700 * (i + 1))); } const o = r ? { status: r.status, body: Buffer.from(await r.arrayBuffer()), ct: r.headers.get("content-type") || "application/json" } : { status: 502, body: Buffer.from(""), ct: "text/plain" }; if (o.status === 200 && !/eventos|historico|resultados-/.test(u)) cache.set(u, o); return o; }
const ELE = turno === "2" ? { fed: 6258, est: 6260 } : { fed: 6257, est: 6259 };
const oficial = async (cargo, uf) => { // [{numero,nome,votos,pct,eleito}] do arquivo -u oficial
  const cod = String(cargo).padStart(4, "0"), e = cargo === 1 ? ELE.fed : ELE.est, u = uf.toLowerCase();
  const j = await (await pegar(`${origem}/api/ele2026/${e}/dados/${u}/${u}-c${cod}-e${String(e).padStart(6, "0")}-u.json`)).body.toString();
  const c = JSON.parse(j).carg[0], out = [];
  for (const a of c.agr) for (const p of a.par ?? []) for (const x of p.cand ?? []) out.push({ numero: x.n, nome: x.nm, votos: Number(x.vap), pct: x.pvap, eleito: x.e === "s" });
  return out.sort((a, b) => b.votos - a.votos);
};
const fmt = (n) => Number(n).toLocaleString("pt-BR");
const UFS_GOV2 = ["AC", "AM", "DF", "ES", "RN", "TO"];
const rotas = (turno === "2"
  ? ["#/andamento", "#/evolucao", "#/presidente", "#/governadores", "#/estados/RJ", "#/estados/AC/governador", "#/turnos/BR", "#/turnos/RJ", "#/partidos", "#/cenarios", "#/geo", "#/nulos"]
  : ["#/andamento", "#/evolucao", "#/presidente", "#/governadores", "#/senadores", "#/camara", "#/estados/RJ", "#/turnos/BR", "#/partidos", "#/cenarios", "#/geo", "#/nulos"]);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
let problemas = 0;
const relata = (m) => { problemas++; console.log("  ✗", m); };
for (const [nome, w, h] of [["390", 390, 844], ["1366", 1366, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const falhas = [];
  await ctx.route("**/api/**", async (route) => { const u = route.request().url(); const o = await pegar(u.replace(/^http:\/\/localhost:\d+/, origem)); if (o.status >= 400 && !/\/fotos\//.test(u)) falhas.push(`${o.status} ${u.replace(/^.*\/api\//, "/api/").slice(0, 90)}`); route.fulfill({ status: o.status, contentType: o.ct, body: o.body }); });
  const p = await ctx.newPage(); const erros = [];
  p.on("pageerror", (e) => erros.push("erro de script: " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("console: " + m.text().slice(0, 120)); });
  console.log(`\n== ${turno}º turno, ${nome}px: saúde das telas`);
  for (const r of rotas) {
    erros.length = 0; falhas.length = 0;
    await p.goto(`${base}/?turno=${turno}${r}`); await p.waitForTimeout(espera);
    const t = await p.evaluate(() => document.getElementById("conteudo")?.innerText ?? "");
    const lixo = t.match(/undefined|NaN|Infinity|\[object Object\]|null%/g);
    const pcts = [...t.matchAll(/(\d+[.,]?\d*)\s?%/g)].map((m) => m[1]).filter((x) => /[.,]/.test(x) && !/[.,]\d{2}$/.test(x) && !/[.,]\d{2}\d+$/.test(x) ? true : /[.,]\d{3,}$/.test(x));
    const a = [];
    if (erros.length) a.push(...erros.slice(0, 3));
    if (falhas.length) a.push(`pedidos com falha (${falhas.length}): ${[...new Set(falhas)].slice(0, 3).join("; ")}`);
    if (lixo) a.push(`texto com ${[...new Set(lixo)].join(", ")}`);
    if (/Carregando/.test(t) && !/Carregando (municípios|brancos|os municípios)/.test(t) && t.length < 400) a.push("ficou em 'Carregando…'");
    if (t.trim().length < 60) a.push("tela quase vazia");
    if (pcts.length) a.push(`percentual sem duas casas: ${[...new Set(pcts)].slice(0, 4).join(", ")}`);
    console.log(`${r}: ${a.length ? "" : "ok"}`); a.forEach(relata);
  }
  await ctx.close();
}
// conferência de números
console.log(`\n== ${turno}º turno: números contra o arquivo oficial`);
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.route("**/api/**", async (route) => { const o = await pegar(route.request().url().replace(/^http:\/\/localhost:\d+/, origem)); route.fulfill({ status: o.status, contentType: o.ct, body: o.body }); });
const p = await ctx.newPage();
const conferir = async (rot, cargo, uf) => {
  const of = await oficial(cargo, uf); if (!of.length) return relata(`${rot}: sem dados oficiais`);
  await p.goto(`${base}/?turno=${turno}${rot}`); await p.waitForTimeout(espera + 2000);
  const t = await p.evaluate(() => document.getElementById("conteudo").innerText);
  const falt = [];
  for (const c of of.slice(0, 2)) { if (!t.includes(c.pct + "%")) falt.push(`${c.nome.split(" ")[0]} ${c.pct}%`); if (!t.includes(fmt(c.votos))) falt.push(`${fmt(c.votos)} votos`); }
  console.log(`${rot}: ${falt.length ? "" : "ok"} (${of[0].nome.split(" ")[0]} ${of[0].pct}% × ${of[1]?.nome.split(" ")[0]} ${of[1]?.pct}%)`);
  if (falt.length) relata(`${rot}: faltam na tela → ${falt.join("; ")}`);
};
await conferir("#/presidente", 1, "BR");
for (const uf of turno === "2" ? UFS_GOV2 : ["SP", "RJ", "MG"]) await conferir(`#/estados/${uf}/governador`, 3, uf);
await b.close();
console.log(problemas ? `\n${problemas} problema(s)` : "\nnenhum problema"); process.exit(problemas ? 1 : 0);
