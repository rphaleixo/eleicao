#!/usr/bin/env node
// Resultado parcial do exterior no 2º turno, somando os boletins das urnas.
// O TSE só libera a totalização às 17h de Brasília, mas cada urna do exterior publica o boletim (registro digital do voto) quando fecha, no horário local.
// Este script pergunta só pelas urnas das cidades que já fecharam, guarda o que já leu e grava o total por cidade em public/dados/presidente-t2-exterior-boletins.json.
//
// Uso: node tools/coletar-exterior-boletins.mjs --eleitorado <eleitorado_local_votacao_2026_ZZ.csv> [--saida public/dados] [--estado dados-exterior/urnas.json] [--ritmo 12] [--agora 2026-10-25T13:00:00Z]
// Pode rodar de novo a qualquer momento: lê só as urnas que faltam.
// Precisa do Node 18 ou mais novo. Não instala nada.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { votosDoCargo } from "./rdv.mjs";

const args = process.argv.slice(2);
const opcao = (n, padrao) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : padrao; };
const arqEleit = opcao("eleitorado"), pasta = opcao("saida", "public/dados"), arqEstado = opcao("estado", "dados-exterior/urnas.json"), ritmo = Math.max(1, Math.min(40, Number(opcao("ritmo", 12))));
const agora = opcao("agora") ? new Date(opcao("agora")) : new Date();
if (!arqEleit) { console.error("Informe --eleitorado (veja o início do arquivo)."); process.exit(1); }
const PLEITO = "3221", BASE = `https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/${PLEITO}/dados/zz`;
const LULA = "13", FLAVIO = "22";
const MAX_404_POR_RODADA = 120; // urnas que ainda não publicaram: não insistir demais (o TSE bloqueia quem gera muitos 404)

// ---------- fuso de cada cidade (a votação fecha às 17h, hora local) ----------
const TZ_PAIS = { "África do Sul": "Africa/Johannesburg", "Albânia": "Europe/Tirane", "Alemanha": "Europe/Berlin", "Angola": "Africa/Luanda", "Antígua e Barbuda": "America/Antigua", "Arábia Saudita": "Asia/Riyadh", "Argélia": "Africa/Algiers", "Argentina": "America/Argentina/Buenos_Aires", "Armênia": "Asia/Yerevan", "Austrália": "Australia/Sydney", "Áustria": "Europe/Vienna", "Azerbaijão": "Asia/Baku", "Bahamas": "America/Nassau", "Bahrein": "Asia/Bahrain", "Bangladesh": "Asia/Dhaka", "Barbados": "America/Barbados", "Bélgica": "Europe/Brussels", "Belize": "America/Belize", "Benin": "Africa/Porto-Novo", "Bolívia": "America/La_Paz", "Bósnia e Herzegovina": "Europe/Sarajevo", "Botsuana": "Africa/Gaborone", "Bulgária": "Europe/Sofia", "Burquina Faso": "Africa/Ouagadougou", "Cabo Verde": "Atlantic/Cape_Verde", "Camarões": "Africa/Douala", "Canadá": "America/Toronto", "Catar": "Asia/Qatar", "Cazaquistão": "Asia/Almaty", "Chile": "America/Santiago", "China": "Asia/Shanghai", "Chipre": "Asia/Nicosia", "Colômbia": "America/Bogota", "Coreia do Norte": "Asia/Pyongyang", "Coreia do Sul": "Asia/Seoul", "Costa do Marfim": "Africa/Abidjan", "Costa Rica": "America/Costa_Rica", "Croácia": "Europe/Zagreb", "Cuba": "America/Havana", "Dinamarca": "Europe/Copenhagen", "El Salvador": "America/El_Salvador", "Emirados Árabes Unidos": "Asia/Dubai", "Egito": "Africa/Cairo", "Equador": "America/Guayaquil", "Eslováquia": "Europe/Bratislava", "Eslovênia": "Europe/Ljubljana", "Espanha": "Europe/Madrid", "Estados Unidos": "America/New_York", "Estônia": "Europe/Tallinn", "Etiópia": "Africa/Addis_Ababa", "Filipinas": "Asia/Manila", "Finlândia": "Europe/Helsinki", "França": "Europe/Paris", "Gabão": "Africa/Libreville", "Gana": "Africa/Accra", "Geórgia": "Asia/Tbilisi", "Grécia": "Europe/Athens", "Guatemala": "America/Guatemala", "Guiana": "America/Guyana", "Guiana Francesa": "America/Cayenne", "Guiné": "Africa/Conakry", "Guiné Equatorial": "Africa/Malabo", "Guiné-Bissau": "Africa/Bissau", "Haiti": "America/Port-au-Prince", "Honduras": "America/Tegucigalpa", "Hungria": "Europe/Budapest", "Índia": "Asia/Kolkata", "Indonésia": "Asia/Jakarta", "Irã": "Asia/Tehran", "Iraque": "Asia/Baghdad", "Irlanda": "Europe/Dublin", "Israel": "Asia/Jerusalem", "Itália": "Europe/Rome", "Jamaica": "America/Jamaica", "Japão": "Asia/Tokyo", "Jordânia": "Asia/Amman", "Kuwait": "Asia/Kuwait", "Líbano": "Asia/Beirut", "Líbia": "Africa/Tripoli", "Malásia": "Asia/Kuala_Lumpur", "Malaui": "Africa/Blantyre", "Mali": "Africa/Bamako", "Marrocos": "Africa/Casablanca", "México": "America/Mexico_City", "Mianmar": "Asia/Yangon", "Moçambique": "Africa/Maputo", "Namíbia": "Africa/Windhoek", "Nepal": "Asia/Kathmandu", "Nicarágua": "America/Managua", "Nigéria": "Africa/Lagos", "Noruega": "Europe/Oslo", "Nova Zelândia": "Pacific/Auckland", "Omã": "Asia/Muscat", "Países Baixos": "Europe/Amsterdam", "Palestina": "Asia/Hebron", "Panamá": "America/Panama", "Paquistão": "Asia/Karachi", "Paraguai": "America/Asuncion", "Peru": "America/Lima", "Polônia": "Europe/Warsaw", "Portugal": "Europe/Lisbon", "Quênia": "Africa/Nairobi", "Reino Unido": "Europe/London", "República Democrática do Congo": "Africa/Kinshasa", "República do Congo": "Africa/Brazzaville", "República Dominicana": "America/Santo_Domingo", "República Tcheca": "Europe/Prague", "Romênia": "Europe/Bucharest", "Rússia": "Europe/Moscow", "Santa Lúcia": "America/St_Lucia", "São Tomé e Príncipe": "Africa/Sao_Tome", "Senegal": "Africa/Dakar", "Sérvia": "Europe/Belgrade", "Singapura": "Asia/Singapore", "Síria": "Asia/Damascus", "Sri Lanka": "Asia/Colombo", "Suécia": "Europe/Stockholm", "Suíça": "Europe/Zurich", "Suriname": "America/Paramaribo", "Tailândia": "Asia/Bangkok", "Taiwan": "Asia/Taipei", "Tanzânia": "Africa/Dar_es_Salaam", "Timor-Leste": "Asia/Dili", "Togo": "Africa/Lome", "Trinidad e Tobago": "America/Port_of_Spain", "Tunísia": "Africa/Tunis", "Turquia": "Europe/Istanbul", "Ucrânia": "Europe/Kyiv", "Uruguai": "America/Montevideo", "Venezuela": "America/Caracas", "Vietnã": "Asia/Ho_Chi_Minh", "Zâmbia": "Africa/Lusaka", "Zimbábue": "Africa/Harare" };
const TZ_CIDADE = { "CHICAGO": "America/Chicago", "HOUSTON": "America/Chicago", "LOS ANGELES": "America/Los_Angeles", "SÃO FRANCISCO": "America/Los_Angeles", "VANCOUVER": "America/Vancouver", "HONG KONG": "Asia/Hong_Kong" };
/** Instante (UTC) em que são 17h do dia 25/10/2026 no fuso. */
export function fechamento(tz) {
  const ref = new Date("2026-10-25T17:00:00Z");
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(ref).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(ref.getTime() - (local - ref.getTime())); // 17h local = 17h UTC - deslocamento
}

// ---------- urnas e eleitores ----------
const csv = readFileSync(arqEleit, "latin1").split(/\r?\n/).filter(Boolean);
const cab = csv[0].split(";").map((c) => c.replace(/^"|"$/g, "")), col = Object.fromEntries(cab.map((c, i) => [c, i]));
const campo = (l, k) => l[col[k]]?.replace(/^"|"$/g, "");
const z4 = (v) => String(v).padStart(4, "0");
const urnas = new Map(); // "cód/zona/seção" -> { cod, zona, secao, aptos }
const linhas = csv.slice(1).map((l) => l.split(";"));
for (const l of linhas) if (campo(l, "DS_TIPO_SECAO_AGREGADA") === "Principal") { const cod = campo(l, "CD_MUNICIPIO").padStart(5, "0"), zona = z4(campo(l, "NR_ZONA")), secao = z4(campo(l, "NR_SECAO")); urnas.set(`${cod}/${zona}/${secao}`, { cod, zona, secao, aptos: Number(campo(l, "QT_ELEITOR_SECAO")) || 0 }); }
for (const l of linhas) if (campo(l, "DS_TIPO_SECAO_AGREGADA") === "Agregada") { const cod = campo(l, "CD_MUNICIPIO").padStart(5, "0"), u = urnas.get(`${cod}/${z4(campo(l, "NR_ZONA"))}/${z4(campo(l, "NR_SECAO_PRINCIPAL"))}`); if (u) u.aptos += Number(campo(l, "QT_ELEITOR_SECAO")) || 0; } // quem vota na urna de outra seção conta nos aptos dela
const paises = JSON.parse(readFileSync(join(pasta, "exterior-paises.json"), "utf8")).localidades;
const nomeDe = (cod) => paises[cod]?.[0] ?? cod;
const fecha = new Map(); // cód. -> instante de fechamento
for (const cod of new Set([...urnas.values()].map((u) => u.cod))) { const tz = TZ_CIDADE[nomeDe(cod)] ?? TZ_PAIS[paises[cod]?.[1]]; if (!tz) console.error(`Sem fuso para ${nomeDe(cod)} (${cod}): será consultada sempre.`); fecha.set(cod, tz ? fechamento(tz) : new Date(0)); }

// ---------- pedidos ----------
let proximo = 0; const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function buscar(url, binario = false) {
  for (let t = 1; t <= 3; t++) {
    const vez = Math.max(Date.now(), proximo); proximo = vez + 1000 / ritmo; if (vez > Date.now()) await espera(vez - Date.now());
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (r.status === 403 || r.status === 429) { console.error(`O servidor recusou os pedidos (HTTP ${r.status}). Espere 10 minutos e rode de novo; o que já foi lido está salvo.`); salvar(); process.exit(3); }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return binario ? new Uint8Array(await r.arrayBuffer()) : await r.json();
    } catch (e) { if (t === 3) throw e; await espera(400 * t * t); }
  }
}

const estado = existsSync(arqEstado) ? JSON.parse(readFileSync(arqEstado, "utf8")) : {};
function salvar() { mkdirSync(dirname(arqEstado), { recursive: true }); writeFileSync(arqEstado, JSON.stringify(estado)); }

const pendentes = [...urnas.entries()].filter(([k, u]) => !estado[k] && fecha.get(u.cod) <= agora).sort((a, b) => fecha.get(a[1].cod) - fecha.get(b[1].cod));
console.log(`${urnas.size} urnas no exterior; ${Object.keys(estado).length} já lidas; ${pendentes.length} de cidades que já fecharam ainda sem boletim.`);
let lidas = 0, sem = 0;
const fila = pendentes.slice();
await Promise.all(Array.from({ length: Math.min(8, Math.ceil(ritmo / 2)) }, async () => {
  while (fila.length && sem < MAX_404_POR_RODADA) {
    const [k, u] = fila.shift();
    try {
      const aux = await buscar(`${BASE}/${u.cod}/${u.zona}/${u.secao}/p${PLEITO.padStart(6, "0")}-zz-m${u.cod}-z${u.zona}-s${u.secao}-aux.json`);
      const h = aux?.hashes?.[0], rdv = h?.arq?.find((a) => a.tp === "rdv");
      if (!rdv) { sem++; continue; }
      const bin = await buscar(`${BASE}/${u.cod}/${u.zona}/${u.secao}/${h.hash}/${rdv.nm}`, true);
      if (!bin) { sem++; continue; }
      const v = votosDoCargo(bin, 1);
      estado[k] = { lula: v.candidatos[LULA] ?? 0, flavio: v.candidatos[FLAVIO] ?? 0, brancos: v.brancos, nulos: v.nulos, total: v.total, recebida: h.dr + " " + h.hr };
      lidas++;
    } catch (e) { console.error(`Falha em ${k}: ${e.message}`); }
  }
}));
salvar();

// ---------- soma por cidade ----------
const cidades = {};
for (const [k, u] of urnas) {
  const c = (cidades[u.cod] ??= { nome: nomeDe(u.cod), aptos: 0, comp: 0, brancos: 0, nulos: 0, lula: 0, flavio: 0, recebidas: 0, total: 0 });
  c.total++;
  const e = estado[k]; if (!e) continue;
  c.recebidas++; c.aptos += u.aptos; c.comp += e.total; c.brancos += e.brancos; c.nulos += e.nulos; c.lula += e.lula; c.flavio += e.flavio;
}
const localidades = Object.fromEntries(Object.entries(cidades).filter(([, c]) => c.recebidas > 0).map(([cod, c]) => {
  const abst = Math.max(0, c.aptos - c.comp), validos = c.lula + c.flavio;
  return [cod, [c.nome, c.aptos, c.comp, abst, c.brancos, c.nulos, c.lula, c.flavio, 0, validos, +((c.recebidas / c.total) * 100).toFixed(2)]];
}));
const recebidas = Object.values(cidades).reduce((t, c) => t + c.recebidas, 0), total = urnas.size;
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "presidente-t2-exterior-boletins.json"), JSON.stringify({ turno: 2, fonte: "boletins das urnas (registro digital do voto), parcial", geradoEm: new Date().toISOString(), urnasRecebidas: recebidas, urnasTotais: total, colunas: ["nome", "aptos", "comparecimento", "abstencao", "brancos", "nulos", "lula", "flavio", "outros", "validos", "pctUrnas"], localidades }));
const soma = (i) => Object.values(localidades).reduce((t, a) => t + a[i], 0);
console.log(`${lidas} urnas novas; ${recebidas} de ${total} urnas com boletim (${((recebidas / total) * 100).toFixed(1)}%); ${sem} ainda sem boletim nesta rodada. Lula ${soma(6)}, Flávio ${soma(7)}, brancos ${soma(4)}, nulos ${soma(5)}, abstenção ${soma(3)}.`);
