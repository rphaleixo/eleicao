// Conta os pedidos /api que a tela Comparar turnos faz ao escolher uma região (ou o Exterior) e em quanto tempo o quadro aparece.
// Uso: ALVOS=r:nordeste,r:sul,ZZ node tools/medir-requisicoes.mjs (servidor local em :8798; os dados vêm do site publicado)
import { createRequire } from "node:module";
const require = createRequire("/node-tools/node_modules/");
const { chromium } = require("playwright");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const cache=new Map();
async function pegar(u){ if(cache.has(u)) return cache.get(u); let r; for (let i=0;i<8;i++){ try { r=await fetch(u); if(r.status!==429 && r.status<500) break; } catch {} await new Promise(s=>setTimeout(s,800*(i+1))); } const out = r ? { status:r.status, body:Buffer.from(await r.arrayBuffer()), ct:r.headers.get("content-type")||"application/json" } : { status:502, body:Buffer.from(""), ct:"text/plain" }; if (out.status===200 && !/eventos|historico|resultados-/.test(u)) cache.set(u,out); return out; }
for (const alvo of (process.env.ALVOS||"r:nordeste,r:sul,ZZ").split(",")) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let n=0, t0=0, mun=0; const bruto=new Map();
  await ctx.route("**/api/**", async (route) => { const u=route.request().url(); n++; if (/\/dados\/[a-z]{2}\/[a-z]{2}\d/.test(u)) mun++; const o=await pegar(u.replace(/^http:\/\/localhost:\d+/,"https://eleicao.aleixo.workers.dev")); route.fulfill({ status:o.status, contentType:o.ct, body:o.body }); });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8798/?turno=2#/turnos/BR"); await p.waitForTimeout(9000);
  n=0; mun=0; t0=Date.now();
  await p.locator(".el-premissas__barra").click(); await p.waitForTimeout(200);
  await p.selectOption("[data-ct-uf]", alvo);
  await p.locator(".el-duelo").first().waitFor({ timeout: 60000 }); const tq=((Date.now()-t0)/1000).toFixed(1);
  await p.waitForTimeout(20000);
  console.log(alvo, "quadro em", tq, "s | pedidos até +20s:", n, "(arquivos por município:", mun, ") | mapa:", await p.locator(".mapa-area, .card h2").allInnerTexts().then(a=>a.slice(0,6).join(" / ")).catch(()=>""));
  await ctx.close();
}
await b.close();
