Selo em pílula que diz a situação de uma disputa, de um candidato ou de um dado: eleito, 2º turno, projeção, em apuração, aguardando ou barrado.

É o status visual único do site. A mesma regra vale em todas as telas: eleito é verde com ✓; 2º turno é âmbar com "2º"; projeção é tracejada com "~"; em apuração é azul; aguardando dados é cinza.

O consumidor fornece: a situação e, quando existir, o carimbo de hora (`apoio`) ao lado.

- Ícone e palavra juntos, sempre. O ícone sozinho (`:has(i:only-child)`) só vale ao lado de um texto que já nomeia a situação.
- Projeção é tracejada em `eleito`; nunca use o selo cheio para algo que o TSE ainda não declarou.
- Atribua a situação ao TSE ("Aguardando dados do TSE"), não à emissora.
- Barrado usa `perigo` com sinal −; use só para regras como a dos 10% do quociente.

Icone centrado (rodada 9): o ícone do selo é um quadrado ou círculo de 18px com o conteúdo centrado de verdade. O ✓ é desenhado em SVG (`viewBox 0 0 12 12`, traço de 2px), nunca como caractere de fonte, porque a fonte do texto deixa o ✓ e o º deslocados dentro do círculo. "2º" usa a família numérica com `line-height: 1`. Quando o selo fica ao lado de um chip de partido, os dois têm a mesma altura (24px) e ficam centrados na mesma linha (`align-items: center`).
