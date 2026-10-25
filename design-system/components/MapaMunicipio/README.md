Mapa de um estado dividido em municípios, pintado por uma medida (taxa de abstenção, brancos, nulos, o não voto, pessoas) em escala de 5 degraus, ou pela posição frente à média nacional.

Use na aba Geografia, na tela de um estado e na comparação entre turnos. O desenho dos 5.570 contornos vem do IBGE por `/api/malha/{UF ou BR}` em baixa resolução: não ofereça zoom além do 4×, porque os contornos ficam angulosos.

O consumidor fornece: a medida de cada município, o modo (taxa, pessoas, acima da média), os valores dos limites da escala e o município selecionado.

- Modo taxa e pessoas: escala sequencial `escala-1` a `escala-5` (no tema escuro a ordem inverte: o menor é o mais escuro). Modo acima da média: escala divergente `divergente-1` a `divergente-5`, de azul-petróleo a laranja.
- Município sem dado (apuração que ainda não chegou, ou o DF no deputado estadual) leva hachura, nunca a cor do menor degrau.
- A legenda mostra os valores dos extremos e vem logo abaixo do mapa. A dica (`el-dica`) abre ao tocar e dá o nome, o valor e os aptos.
- Zoom por botões de 44px (+, −, ajustar) e arrasto; o mapa não reage a rolagem da página no celular.
- O contorno de 6 unidades em `texto-suave` marca o estado; o município selecionado ganha contorno em `texto`.
- A prévia usa municípios ilustrativos (diagrama de Voronoi) sobre o contorno real do estado.