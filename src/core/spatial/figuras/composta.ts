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

export type Marcador = 'vazio' | 'circulo' | 'quadrado' | 'triangulo' | 'barra'

/** Um marcador por região, na ordem cima → direita → baixo → esquerda. */
export type FiguraComposta = readonly [Marcador, Marcador, Marcador, Marcador]

const MARCADORES: Marcador[] = ['vazio', 'circulo', 'quadrado', 'triangulo', 'barra']

/** Ordem do eixo de atributo; 'vazio' fica de fora e nunca entra no ciclo. */
const CICLO_MARCADOR: Marcador[] = ['circulo', 'quadrado', 'triangulo', 'barra']

/** Distância do centro até o meio de cada região triangular. */
const RAIO_REGIAO = 31

export const familiaComposta: Familia<FiguraComposta> = {
  id: 'composta',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraComposta {
    // Nos níveis baixos o vocabulário é menor e há mais regiões vazias, o que
    // deixa o arranjo mais fácil de guardar na memória entre uma figura e outra.
    const paleta: Marcador[] =
      nivel <= 2
        ? ['vazio', 'circulo', 'quadrado']
        : nivel <= 4
          ? ['vazio', 'circulo', 'quadrado', 'triangulo']
          : MARCADORES

    return [rng.pick(paleta), rng.pick(paleta), rng.pick(paleta), rng.pick(paleta)] as const
  },

  passosSecundarios: 4,

  avancarSecundario(f, passos) {
    // Avança cada marcador presente no ciclo círculo → quadrado → triângulo →
    // barra. Regiões vazias continuam vazias, senão o arranjo — que é a fonte
    // da quiralidade — mudaria junto com o atributo.
    const p = ((passos % CICLO_MARCADOR.length) + CICLO_MARCADOR.length) % CICLO_MARCADOR.length
    if (p === 0) return f
    return f.map((m) => {
      if (m === 'vazio') return 'vazio'
      const i = CICLO_MARCADOR.indexOf(m)
      return CICLO_MARCADOR[(i + p) % CICLO_MARCADOR.length] as Marcador
    }) as unknown as FiguraComposta
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
    return f.map((m) => m[0]).join('')
  },

  variar(f, rng) {
    const i = rng.int(0, 3)
    const copia = [...f] as Marcador[]
    copia[i] = rng.pick(MARCADORES.filter((m) => m !== f[i]))
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
  if (marcador === 'quadrado') {
    return {
      kind: 'rect',
      x: arred(centro.x - r),
      y: arred(centro.y - r),
      w: r * 2,
      h: r * 2,
      fill: 'none',
      stroke: TINTA,
      strokeWidth: TRACO,
    }
  }

  if (marcador === 'triangulo') {
    const bruto = [
      { x: topo.x, y: topo.y - r },
      { x: topo.x + r * 0.9, y: topo.y + r * 0.7 },
      { x: topo.x - r * 0.9, y: topo.y + r * 0.7 },
    ]
    const pontos = bruto.map((q) => girarPonto(arred(q.x), arred(q.y), graus))
    return {
      kind: 'polygon',
      points: pontos.flatMap((q) => [q.x, q.y]),
      fill: 'none',
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
