globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { formatarQuando, statusProjecao } = await import("../public/status.js");

test("horário no formato hh:mm, dd/mm/aaaa", () => {
  assert.equal(formatarQuando("04/10/2026 18:41:45"), "18:41, 04/10/2026");
  assert.equal(formatarQuando("04/10/2026 18:41"), "18:41, 04/10/2026");
  assert.equal(formatarQuando(""), "");
  assert.equal(formatarQuando(undefined), "");
  assert.equal(formatarQuando("ontem"), "ontem");
});

test("linha de status: situação, horário e % das urnas, com 2 casas", () => {
  const h = statusProjecao({ andamento: "p", pct: 45.151, quando: "04/10/2026 18:41:45" });
  assert.ok(h.includes("Em apuração") && h.includes("Status em 18:41, 04/10/2026") && h.includes("45,15% das urnas apuradas") && h.includes('selo p'));
  assert.ok(statusProjecao({ andamento: "f", pct: 100, quando: "04/10/2026 23:00:00" }).includes("Totalização finalizada"));
  const n = statusProjecao({ andamento: "n", pct: 0 });
  assert.ok(n.includes("Apuração não iniciada") && n.includes("0,00% das urnas apuradas") && !n.includes("Status em"));
  assert.ok(!statusProjecao({ andamento: "p", quando: "04/10/2026 18:00:00" }).includes("urnas apuradas"));
  assert.ok(statusProjecao().includes("Apuração não iniciada"));
});
