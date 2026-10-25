Gráfico de linhas do percentual de cada lado conforme a apuração avança, com a linha tracejada dos 50% e um cursor que mostra o valor de cada lado.

Use na tela do cargo, abaixo do Placar. O eixo horizontal é a porcentagem de urnas apuradas, não a hora: assim o leitor compara com a apuração anterior no mesmo ponto, e o gráfico de dois turnos pode ser sobreposto.

O consumidor fornece: a série de cada lado (percentual sobre votos válidos por % apurada) e as cores dos lados. O SVG é de largura total (`viewBox` 360 por 206) e se ajusta ao cartão.

- Os gráficos começam na primeira apuração real (a hora oficial de início da divulgação, que vem de uma única constante de configuração), nunca no meio-dia.
- Linhas de 2,6px em `lado-a` e `lado-b`, com a marca ▲ ou ● ao lado do nome na legenda e no painel do cursor; a cor sozinha nunca é a legenda. Se usar a cor do partido, mantenha as marcas e garanta 3:1 contra `cartao` nos dois temas.
- Eixo vertical com 5 linhas de grade em `linha`; rótulos em `num-sm` e `texto-suave`.
- O painel do cursor (`el-info`) abre ao tocar ou arrastar; mostre sempre o % apurado, o valor de cada lado e a diferença em pontos.
- Deixe a leitura "quem está na frente" no Placar; o gráfico só mostra como chegou lá.
- Gráfico do 2º turno: o intervalo sem apuração (17h15 às 19h, com a votação prorrogada) sai do eixo; o ponto das 17h15 liga ao das 19h, com um pequeno corte no eixo e a legenda "sem apuração até as 19h".

- Zoom do eixo vertical (rodada 18): um controle `el-visao` com "Eixo completo | Ampliar" no topo do gráfico. Em "Eixo completo" o eixo vai de 0% a 100%. Em "Ampliar", o mínimo é o menor valor de qualquer linha menos 5 p.p. e o máximo é o maior valor mais 5 p.p., arredondados para múltiplos de 5, sem passar de 0% e 100%. Exemplo: linhas entre 42,3% e 57,7% dão eixo de 35% a 65%. As linhas de grade e os rótulos seguem o novo intervalo (a cada 5 p.p., ou a cada 10 se não couberem), a linha tracejada de 50% continua se estiver dentro do intervalo, e o texto "Eixo ampliado: 35% a 65%" aparece sempre que o zoom está ligado, para ninguém ler a distância entre as linhas como maior do que é. O zoom é só visual: o cursor e o painel mostram os mesmos valores. A escolha não é guardada; o gráfico abre em "Eixo completo".
- A legenda da emenda ("sem apuração até as 19h") não pode ficar sobre as linhas dos candidatos: coloque-a abaixo do eixo, junto ao corte, ou sobre uma faixa com o fundo do cartão.
