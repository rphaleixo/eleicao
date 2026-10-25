Barra fixa de topo com o nome do site em caixa-alta, o ponto de apuração ao vivo e o status de atualização.

Use uma só por página. O ponto verde pulsa enquanto a apuração está aberta e some quando ela encerra, junto com o texto "atualizar agora".

O consumidor fornece: o texto de status (`role="status"`) com a hora da última atualização.

- Marque com `data-theme="escuro"` para que `sobre-topo` e `ao-vivo` se resolvam sobre `topo`.
- O título usa `titulo-display` em caixa-alta; não coloque logotipo de órgão público. O rodapé do site já avisa que só o TSE é oficial.
- O ponto respeita `prefers-reduced-motion`: sem animação, continua visível.

Orçamento de altura (rodada 6): o topo tem uma linha só, 48px, com título à esquerda e o carimbo de atualização à direita, sem quebrar. É o lugar da `BarraStatus` no dia a dia; a faixa separada só aparece quando há falha de conexão.
