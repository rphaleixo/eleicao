// Disputas definidas para o 2º turno (25/10/2026), conforme o resultado do 1º turno em 04/10/2026.
// Só estas eleições têm 2º turno: Presidente e o governo de sete estados. Não há 2º turno para Senado nem deputados.
// Percentuais do 1º turno: votos no candidato ÷ votos válidos mais anulados sub judice (base do TSE).
export const DATA_SEGUNDO_TURNO = "2026-10-25";
export const DISPUTAS_SEGUNDO_TURNO = [
  {
    "cargo": "presidente",
    "uf": "BR",
    "pctApurado": 99.92,
    "candidatos": [
      {
        "id": "280002551544",
        "numero": "22",
        "nome": "FLAVIO BOLSONARO",
        "partido": "PL",
        "votos": 56084915,
        "pct": 47.05
      },
      {
        "id": "280002542548",
        "numero": "13",
        "nome": "LULA",
        "partido": "PT",
        "votos": 53806782,
        "pct": 45.14
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "AC",
    "pctApurado": 100,
    "candidatos": [
      {
        "id": "10002544107",
        "numero": "11",
        "nome": "MAILZA ASSIS",
        "partido": "PP",
        "votos": 218760,
        "pct": 49.76
      },
      {
        "id": "10002532492",
        "numero": "10",
        "nome": "ALAN RICK",
        "partido": "REPUBLICANOS",
        "votos": 141859,
        "pct": 32.27
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "AM",
    "pctApurado": 99.75,
    "candidatos": [
      {
        "id": "40002532272",
        "numero": "55",
        "nome": "OMAR AZIZ",
        "partido": "PSD",
        "votos": 838237,
        "pct": 40.57
      },
      {
        "id": "40002541626",
        "numero": "22",
        "nome": "PROFESSORA MARIA DO CARMO",
        "partido": "PL",
        "votos": 507087,
        "pct": 24.54
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "DF",
    "pctApurado": 100,
    "candidatos": [
      {
        "id": "70002553055",
        "numero": "11",
        "nome": "CELINA LEÃO",
        "partido": "PP",
        "votos": 825530,
        "pct": 49.93
      },
      {
        "id": "70002552496",
        "numero": "13",
        "nome": "LEANDRO GRASS",
        "partido": "PT",
        "votos": 569930,
        "pct": 34.47
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "ES",
    "pctApurado": 100,
    "candidatos": [
      {
        "id": "80002552682",
        "numero": "10",
        "nome": "LORENZO PAZOLINI",
        "partido": "REPUBLICANOS",
        "votos": 1048633,
        "pct": 49.65
      },
      {
        "id": "80002552172",
        "numero": "15",
        "nome": "RICARDO FERRAÇO",
        "partido": "MDB",
        "votos": 719397,
        "pct": 34.06
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "RJ",
    "pctApurado": 100,
    "candidatos": [
      {
        "id": "190002542887",
        "numero": "22",
        "nome": "DOUGLAS RUAS",
        "partido": "PL",
        "votos": 4271199,
        "pct": 49.27
      },
      {
        "id": "190002543380",
        "numero": "55",
        "nome": "EDUARDO PAES",
        "partido": "PSD",
        "votos": 3706984,
        "pct": 42.76
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "RN",
    "pctApurado": 99.99,
    "candidatos": [
      {
        "id": "200002535255",
        "numero": "44",
        "nome": "ALLYSON",
        "partido": "UNIÃO",
        "votos": 733738,
        "pct": 36.94
      },
      {
        "id": "200002534001",
        "numero": "13",
        "nome": "CADU DE LULA",
        "partido": "PT",
        "votos": 718206,
        "pct": 36.16
      }
    ]
  },
  {
    "cargo": "governador",
    "uf": "TO",
    "pctApurado": 100,
    "candidatos": [
      {
        "id": "270002544599",
        "numero": "44",
        "nome": "PROFESSORA DORINHA",
        "partido": "UNIÃO",
        "votos": 386260,
        "pct": 45.52
      },
      {
        "id": "270002544544",
        "numero": "45",
        "nome": "VICENTINHO JÚNIOR",
        "partido": "PSDB",
        "votos": 372848,
        "pct": 43.94
      }
    ]
  }
];
export const UFS_GOVERNO_SEGUNDO_TURNO = DISPUTAS_SEGUNDO_TURNO.filter((d) => d.cargo === "governador").map((d) => d.uf);
