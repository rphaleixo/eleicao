#!/usr/bin/env node
// Conta os números digitados nos votos nulos das eleições majoritárias (presidente, governador e senador),
// lendo o Registro Digital do Voto (RDV) de cada urna no site de resultados do TSE.
//
// Uso:   node tools/nulos-digitados.mjs rj                      (um estado inteiro)
//        node tools/nulos-digitados.mjs rj --municipio 58106    (só um município, para testar)
//        node tools/nulos-digitados.mjs rj --ritmo 15           (pedidos por segundo; o padrão é 20, o limite do TSE é 100; 40 é seguro)
// Pode ser interrompido (Ctrl+C) e rodado de novo: continua de onde parou.
// Resultado: pasta dados-nulos/ com urnas-<uf>.jsonl (uma linha por urna) e nulos-<uf>.json (somas por zona, município e estado).
// Precisa do Node 18 ou mais novo. Não instala nada.

import { mkdirSync, existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resumirRdv } from "./rdv.mjs";

const BASE = "https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna";
const PLEITO = "3220"; // pleito do 1º turno de 2026 (ver comum/config/ele-c.json)
const CARGOS = { 1: "presidente", 3: "governador", 5: "senador", 6: "dep-federal", 7: "dep-estadual" };
const TIPOS = { 1: "legenda", 2: "nominal", 3: "branco", 4: "nulo", 5: "brancoAposSuspensao", 6: "nuloAposSuspensao", 7: "nuloPorRepeticao", 8: "nuloCargoSemCandidato", 9: "nuloAposSuspensaoCargoSemCandidato" };

// ---------- argumentos ----------
const args = process.argv.slice(2);
const uf = (args.find((a) => /^[a-z]{2}$/i.test(a)) ?? "").toLowerCase();
const opcao = (nome, padrao) => { const i = args.indexOf(`--${nome}`); return i >= 0 ? args[i + 1] : padrao; };
if (!uf) { console.error("Informe o estado, por exemplo: node tools/nulos-digitados.mjs rj"); process.exit(1); }
const ritmo = Math.max(1, Math.min(60, Number(opcao("ritmo", 20))));
const soMunicipio = opcao("municipio", "");
const pasta = opcao("saida", "dados-nulos");
mkdirSync(pasta, { recursive: true });
const arqUrnas = join(pasta, `urnas-${uf}${soMunicipio ? "-" + soMunicipio : ""}.jsonl`);
const arqSaida = join(pasta, `nulos-${uf}${soMunicipio ? "-" + soMunicipio : ""}.json`);

// ---------- pedidos com ritmo controlado ----------
let proximo = 0;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function aguardarVez() { const agora = Date.now(), t = Math.max(agora, proximo); proximo = t + 1000 / ritmo; if (t > agora) await espera(t - agora); }
let seguidos404 = 0;
async function buscar(url, binario = false) {
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    await aguardarVez();
    try {
      const r = await fetch(url);
      if (r.status === 404) { if (++seguidos404 >= 15) { console.error("\nMuitos erros 404 seguidos: parando para não ser bloqueado pelo TSE. Tente de novo mais tarde."); process.exit(2); } return null; }
      if (r.status === 429 || r.status === 403) { console.error(`\nO servidor recusou os pedidos (HTTP ${r.status}: ${(await r.text()).slice(0, 120)}). Se for bloqueio do TSE, espere 10 minutos e rode de novo; o que já foi baixado é mantido.`); process.exit(3); }
      if (!r.ok) throw new Error("HTTP " + r.status);
      seguidos404 = 0;
      return binario ? new Uint8Array(await r.arrayBuffer()) : await r.json();
    } catch (e) { if (tentativa === 4) throw e; await espera(500 * tentativa * tentativa); }
  }
}

// ---------- lista de urnas ----------
console.log(`Lendo a lista de seções de ${uf.toUpperCase()}…`);
const cs = await buscar(`${BASE}/${PLEITO}/config/${uf}/${uf}-p${PLEITO.padStart(6, "0")}-cs.json`);
if (!cs) { console.error("Lista de seções não encontrada para esse estado."); process.exit(1); }
const urnas = [];
let agregadas = 0;
for (const u of cs.abr) for (const m of u.mu) {
  if (soMunicipio && m.cd !== soMunicipio) continue;
  for (const z of m.zon) for (const s of z.sec) (s.da ? urnas.push({ m: m.cd, nome: m.nm, z: z.cd, s: s.ns }) : agregadas++); // sem data = seção agregada: vota na urna de outra seção e não tem arquivo
}
const feitas = new Set();
if (existsSync(arqUrnas)) for (const l of readFileSync(arqUrnas, "utf8").split("\n")) if (l) { const r = JSON.parse(l); feitas.add(`${r.m}/${r.z}/${r.s}`); }
const pendentes = urnas.filter((u) => !feitas.has(`${u.m}/${u.z}/${u.s}`)).slice(0, Number(opcao("limite", Infinity)));
console.log(`${urnas.length} urnas com arquivo (${agregadas} seções agregadas ignoradas); ${feitas.size} já baixadas; ${pendentes.length} a baixar, a ${ritmo} pedidos por segundo (2 por urna, ou seja, ${ritmo / 2} urnas por segundo).`);

// ---------- download ----------
let ok = 0, falhas = 0;
const inicio = Date.now();
async function urna({ m, z, s }) {
  const dir = `${BASE}/${PLEITO}/dados/${uf}/${m}/${z}/${s}`;
  const aux = await buscar(`${dir}/p${PLEITO.padStart(6, "0")}-${uf}-m${m}-z${z}-s${s}-aux.json`);
  const h = aux?.hashes?.[0], rdv = h?.arq?.find((a) => a.tp === "rdv");
  if (!rdv) { falhas++; return; }
  const bin = await buscar(`${dir}/${h.hash}/${rdv.nm}`, true);
  if (!bin) { falhas++; return; }
  appendFileSync(arqUrnas, JSON.stringify({ m, z, s, c: resumirRdv(bin) }) + "\n");
  ok++;
}
const fila = pendentes.slice();
const trabalhadores = Array.from({ length: Math.min(24, Math.max(1, Math.ceil(ritmo / 2))) }, async () => {
  while (fila.length) {
    const u = fila.shift();
    try { await urna(u); } catch (e) { falhas++; console.error(`\nFalha em ${u.m}/${u.z}/${u.s}: ${e.message}`); }
    if ((ok + falhas) % 100 === 0) { const seg = (Date.now() - inicio) / 1000, falta = pendentes.length - ok - falhas; process.stdout.write(`\r${ok} baixadas, ${falhas} falhas, faltam ${falta} (cerca de ${Math.round(falta / Math.max(0.1, ok / seg) / 60)} min)   `); }
  }
});
await Promise.all(trabalhadores);
console.log(`\nDownload concluído: ${ok} novas, ${falhas} falhas.`);

// ---------- somas ----------
const nomes = new Map(urnas.map((u) => [u.m, u.nome]));
const soma = (alvo, c) => {
  for (const [cargo, tipos] of Object.entries(c)) {
    const a = ((alvo[cargo] ??= { tipos: {}, nulos: {}, repeticao: {} }));
    for (const [t, v] of Object.entries(tipos)) {
      if (typeof v === "number") a.tipos[t] = (a.tipos[t] ?? 0) + v;
      else { const destino = Number(t) === 7 ? a.repeticao : a.nulos; for (const [dig, q] of Object.entries(v)) { destino[dig] = (destino[dig] ?? 0) + q; a.tipos[t] = (a.tipos[t] ?? 0) + q; } }
    }
  }
};
const total = {}, municipios = {};
let lidas = 0;
for (const l of readFileSync(arqUrnas, "utf8").split("\n")) {
  if (!l) continue;
  const r = JSON.parse(l); lidas++;
  const mun = (municipios[r.m] ??= { nome: nomes.get(r.m) ?? "", urnas: 0, total: {}, zonas: {} });
  const zona = (mun.zonas[r.z] ??= { urnas: 0, total: {} });
  mun.urnas++; zona.urnas++;
  soma(total, r.c); soma(mun.total, r.c); soma(zona.total, r.c);
}
const ordenar = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); // lista [número, quantidade]: um objeto reordenaria números como 10 e 11
const limpar = (t) => { for (const c of Object.values(t)) { c.nulos = ordenar(c.nulos); c.repeticao = ordenar(c.repeticao); } return t; };
limpar(total); for (const m of Object.values(municipios)) { limpar(m.total); for (const z of Object.values(m.zonas)) limpar(z.total); }
writeFileSync(arqSaida, JSON.stringify({ uf, pleito: PLEITO, geradoEm: new Date().toISOString(), cargos: CARGOS, tipos: TIPOS, urnas: lidas, secoesAgregadasIgnoradas: agregadas, total, municipios }));
console.log(`Resumo salvo em ${arqSaida}`);
for (const [cargo, nome] of Object.entries(CARGOS)) {
  const c = total[cargo]; if (!c || ![1, 3, 5].includes(Number(cargo))) continue;
  const nul = (c.tipos[4] ?? 0), top = c.nulos.slice(0, 5).map(([d, q]) => `${d}: ${q.toLocaleString("pt-BR")}`).join(" · ");
  console.log(`${nome}: ${nul.toLocaleString("pt-BR")} nulos digitados. Mais usados: ${top}`);
}
