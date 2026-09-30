import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, girarPonto, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Moldura quadrada cortada por um X, com um marcador em cada região — o
 * vocabulário da imagem de referência 14.
 *
 * A moldura e o X são IDÊNTICOS em todas as configurações; é a distribuição dos
 * marcadores pelas quatro regiões que muda. Isso força a leitura posicional
 * ("o círculo estava em cima, agora está à direita") em vez da leitura por
 * silhueta, que é justamente o que uma questão de rotação deveria cobrar.
 *
 * As regiões seguem a mesma convenção horária das outras famílias, mas aqui
 * partindo do topo, porque o X corta o quadrado em triângulos cima/direita/
 * baixo/esquerda:
 *
 *        0
 *      \   /
 *    3   ×   1
 *      /   \
 *        2
 */

/**
 * Cada forma de marcador existe cheia e vazada: círculo (cheio) e anel,
 * quadrado (vazado) e bloco, triângulo (vazado) e cunha. A barra é só traço.
 */
export type Marcador =
  | 'vazio'
  | 'circulo'
  | 'anel'
  | 'quadrado'
  | 'bloco'
  | 'triangulo'
  | 'cunha'
  | 'barra'

/** Um marcador por região, na ordem cima → direita → baixo → esquerda. */
export type FiguraComposta = readonly [Marcador, Marcador, Marcador, Marcador]

const MARCADORES: Marcador[] = ['vazio', 'circulo', 'anel', 'quadrado', 'bloco', 'triangulo', 'cunha', 'barra']

/**
 * O eixo de atributo troca cheio por vazado. Era um ciclo de quatro formas
 * (círculo → quadrado → triângulo → barra), mas numa série de quatro casas
 * ninguém consegue deduzir a ORDEM de um ciclo arbitrário — a regra ficava
 * implícita demais. Cheio/vazado alterna e se lê num relance.
 */
const PREENCHER: Record<Marcador, Marcador> = {
  vazio: 'vazio',
  circulo: 'anel',
  anel: 'circulo',
  quadrado: 'bloco',
  bloco: 'quadrado',
  triangulo: 'cunha',
  cunha: 'triangulo',
  barra: 'barra',
}

/** Uma letra por marcador — a inicial não serve: 'barra' e 'bloco' colidem. */
const LETRA: Record<Marcador, string> = {
  vazio: 'v',
  circulo: 'c',
  anel: 'a',
  quadrado: 'q',
  bloco: 'k',
  triangulo: 't',
  cunha: 'u',
  barra: 'b',
}

/** Distância do centro até o meio de cada região triangular. */
const RAIO_REGIAO = 31

export const familiaComposta: Familia<FiguraComposta> = {
  id: 'composta',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraComposta {
    // Nos níveis baixos o vocabulário é menor, o que deixa o arranjo mais fácil
    // de guardar na memória entre uma figura e outra.
    //
    // O piso subiu: o nível 1 já tem o triângulo, que antes só aparecia no 3 —
    // e é o único marcador que aponta, o que torna a rotação visível no próprio
    // marcador. Nos níveis 4 e 5 as quatro regiões vêm ocupadas (no 4, no
    // máximo uma vazia), e as versões cheia e vazada de cada forma convivem.
    const paleta: Marcador[] =
      nivel <= 1
        ? ['vazio', 'circulo', 'quadrado', 'triangulo']
        : nivel === 2
          ? ['vazio', 'circulo', 'quadrado', 'triangulo', 'barra', 'anel']
          : MARCADORES
    const cheia = paleta.filter((m) => m !== 'vazio')

    const regioes = [rng.pick(paleta), rng.pick(paleta), rng.pick(paleta), rng.pick(paleta)]
    if (nivel >= 4) {
      // Preenche as vazias, deixando no máximo uma no nível 4.
      let vaziasPermitidas = nivel === 4 ? 1 : 0
      for (let i = 0; i < 4; i++) {
        if (regioes[i] !== 'vazio') continue
        if (vaziasPermitidas > 0) vaziasPermitidas--
        else regioes[i] = rng.pick(cheia)
      }
    }
    return regioes as unknown as FiguraComposta
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    // Troca cheio por vazado em cada marcador presente. Regiões vazias
    // continuam vazias, senão o arranjo — que é a fonte da quiralidade —
    // mudaria junto com o atributo.
    if (((passos % 2) + 2) % 2 === 0) return f
    return f.map((m) => PREENCHER[m]) as unknown as FiguraComposta
  },
  rotate(f, passos) {
    // Girar 90° no horário leva a região i para a região i+1.
    const p = ((passos % 4) + 4) % 4
    return [f[(4 - p) % 4], f[(5 - p) % 4], f[(6 - p) % 4], f[(7 - p) % 4]] as FiguraComposta
  },

  reflect(f) {
    // Espelho no eixo vertical: cima e baixo ficam onde estão, direita e
    // esquerda trocam. Os marcadores em si são simétricos — toda a quiralidade
    // da família vem do arranjo.
    return [f[0], f[3], f[2], f[1]] as FiguraComposta
  },

  assinatura(f) {
    return f.map((m) => LETRA[m]).join('')
  },

  variar(f, rng) {
    // Três variações mínimas, todas sem trazer um marcador que a figura não
    // tinha — um marcador novo salta aos olhos antes de qualquer comparação:
    // trocar dois vizinhos de lugar, inverter cheio/vazado de um só, ou trocar
    // um marcador por outro que já está na figura.
    const copia = [...f] as Marcador[]
    const i = rng.int(0, 3)
    const j = (i + 1) % 4
    const eixo = rng.int(0, 2)
    if (eixo === 0 && copia[i] !== copia[j]) {
      copia[i] = f[j] as Marcador
      copia[j] = f[i] as Marcador
      return copia as unknown as FiguraComposta
    }
    const trocaPreenchimento = PREENCHER[f[i] as Marcador]
    if (eixo === 1 && trocaPreenchimento !== f[i]) {
      copia[i] = trocaPreenchimento
      return copia as unknown as FiguraComposta
    }
    const presentes = MARCADORES.filter((m) => m !== f[i] && f.includes(m))
    copia[i] = rng.pick(presentes.length > 0 ? presentes : MARCADORES.filter((m) => m !== f[i]))
    return copia as unknown as FiguraComposta
  },

  toSpec(f): SpatialSpec {
    const m = TRACO
    const fim = LADO - TRACO
    const shapes: SpatialSpec['shapes'] = [
      {
        kind: 'rect',
        x: m,
        y: m,
        w: LADO - TRACO * 2,
        h: LADO - TRACO * 2,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: TRACO,
      },
      {
        kind: 'path',
        d: `M ${m} ${m} L ${fim} ${fim}`,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: 1.6,
      },
      {
        kind: 'path',
        d: `M ${fim} ${m} L ${m} ${fim}`,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: 1.6,
      },
    ]

    f.forEach((marcador, regiao) => {
      const desenho = desenharMarcador(marcador, regiao)
      if (desenho) shapes.push(desenho)
    })

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const todas: FiguraComposta[] = []
    for (const a of MARCADORES) {
      for (const b of MARCADORES) {
        for (const c of MARCADORES) {
          for (const d of MARCADORES) todas.push([a, b, c, d] as const)
        }
      }
    }
    return todas
  },
}

/**
 * Marcadores nascem na região do topo e são girados junto com a moldura.
 *
 * Desenhar cada marcador direto na sua região seria mais curto, mas deixaria o
 * triângulo e a barra apontando sempre para o mesmo lado — a figura pareceria
 * ter os marcadores TROCADOS de lugar em vez de GIRADOS, que é uma leitura
 * diferente e errada.
 */
function desenharMarcador(
  marcador: Marcador,
  regiao: number,
): SpatialSpec['shapes'][number] | null {
  if (marcador === 'vazio') return null

  const graus = regiao * 90
  const cx = LADO / 2
  const topo = { x: cx, y: arred(LADO / 2 - RAIO_REGIAO) }
  const centro = girarPonto(topo.x, topo.y, graus)
  const r = 9

  // Círculo e quadrado são invariantes sob 90°: basta reposicionar o centro.
  if (marcador === 'circulo') {
    return { kind: 'circle', cx: centro.x, cy: centro.y, r, fill: TINTA, stroke: TINTA, strokeWidth: 1 }
  }
  if (marcador === 'anel') {
    return { kind: 'circle', cx: centro.x, cy: centro.y, r: r - 1, fill: 'none', stroke: TINTA, strokeWidth: TRACO }
  }
  if (marcador === 'quadrado' || marcador === 'bloco') {
    // Um pouco menor que o círculo de mesmo "raio": com lado 18 o quadrado
    // pesava visivelmente mais que os outros marcadores.
    const l = r * 0.85
    return {
      kind: 'rect',
      x: arred(centro.x - l),
      y: arred(centro.y - l),
      w: arred(l * 2),
      h: arred(l * 2),
      fill: marcador === 'bloco' ? TINTA : 'none',
      stroke: TINTA,
      strokeWidth: TRACO,
    }
  }

  if (marcador === 'triangulo' || marcador === 'cunha') {
    const bruto = [
      { x: topo.x, y: topo.y - r },
      { x: topo.x + r * 0.9, y: topo.y + r * 0.7 },
      { x: topo.x - r * 0.9, y: topo.y + r * 0.7 },
    ]
    const pontos = bruto.map((q) => girarPonto(arred(q.x), arred(q.y), graus))
    return {
      kind: 'polygon',
      points: pontos.flatMap((q) => [q.x, q.y]),
      fill: marcador === 'cunha' ? TINTA : 'none',
      stroke: TINTA,
      strokeWidth: TRACO,
    }
  }

  // Barra transversal ao raio: fica horizontal no topo e vertical à direita,
  // o que torna a rotação visível no próprio marcador.
  const a = girarPonto(arred(topo.x - r), topo.y, graus)
  const b = girarPonto(arred(topo.x + r), topo.y, graus)
  return {
    kind: 'path',
    d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
    fill: 'none',
    stroke: TINTA,
    strokeWidth: 4,
  }
}
