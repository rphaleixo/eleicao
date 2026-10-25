Barra fixa no rodapé do celular com quatro destinos principais: Brasil (Marcha), Cargos, Estados e Mais.

Use só em telas estreitas (até 760px). Em telas largas, a navegação continua nas `Abas`. A barra libera o polegar: troca de contexto sem rolar até o topo.

O consumidor fornece: os quatro destinos, o destino atual (`aria-current`) e o espaço no fim da página (`padding-bottom` de 72px) para a barra não cobrir o rodapé.

- Quatro destinos no máximo. Cada um tem ícone de linha (24px, traço 2px) e rótulo curto; o ativo sobe uma faixa de 3px em `acento` e usa a cor `acento`.
- Altura mínima de 56px; respeita a área segura do aparelho (`env(safe-area-inset-bottom)`).
- Os ícones são de traço (`currentColor`), nada de emoji.
- "Mais" abre os itens que não cabem: Partidos, Cenários, Geografia, Nulos.
- A faixa principal do portal sai da tela ao rolar; a navegação da cobertura fica.