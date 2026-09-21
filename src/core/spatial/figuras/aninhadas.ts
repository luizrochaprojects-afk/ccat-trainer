import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, girarPonto, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Formas concêntricas com um miolo orientado — o vocabulário da imagem 13,
 * onde cinco círculos trazem um triângulo dentro e um deles está invertido.
 *
 * O ponto da família é que a moldura é IDÊNTICA em todas as alternativas: o
 * olho é puxado para o invólucro e a diferença está no miolo. É por isso que
 * ela é boa para "qual não pertence" e ruim para qualquer coisa que dependa da
 * silhueta.
 */

export type Invólucro = 'circulo' | 'quadrado'
export type Miolo = 'triangulo' | 'seta' | 'bandeira'

export interface FiguraAninhadas {
  invólucro: Invólucro
  /** quantos anéis concêntricos: 1 ou 2 */
  aneis: number
  miolo: Miolo
  /** 0 = para cima, 1 = direita, 2 = baixo, 3 = esquerda */
  direcao: number
  /**
   * Só a bandeira tem lado: a flâmula fica à direita ou à esquerda da haste.
   * Girar leva a haste junto com a flâmula, então o lado RELATIVO não muda —
   * só espelhar muda. É daqui que sai a quiralidade da família.
   */
  espelhado: boolean
}

const MIOLOS: Miolo[] = ['triangulo', 'seta', 'bandeira']

export const familiaAninhadas: Familia<FiguraAninhadas> = {
  id: 'aninhadas',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraAninhadas {
    return {
      invólucro: rng.pick(['circulo', 'quadrado'] as Invólucro[]),
      aneis: nivel <= 2 ? 1 : rng.pick([1, 2]),
      // 'bandeira' é a única quiral, e por isso está disponível em todo nível:
      // sem ela a amostragem por rejeição de uma figura quiral nunca converge.
      miolo: rng.pick(MIOLOS),
      direcao: rng.int(0, 3),
      espelhado: false,
    }
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    if (((passos % 2) + 2) % 2 === 0) return f
    return { ...f, aneis: f.aneis === 1 ? 2 : 1 }
  },
  rotate(f, passos) {
    return { ...f, direcao: (((f.direcao + passos) % 4) + 4) % 4 }
  },

  reflect(f) {
    const direcao = (4 - f.direcao) % 4
    return f.miolo === 'bandeira'
      ? { ...f, direcao, espelhado: !f.espelhado }
      : { ...f, direcao }
  },

  assinatura(f) {
    return `${f.invólucro}|${f.aneis}|${f.miolo}${f.espelhado ? 'E' : ''}|${f.direcao}`
  },

  variar(f, rng) {
    const eixo = rng.int(0, 2)
    if (eixo === 0) return { ...f, direcao: (f.direcao + rng.pick([1, 2, 3])) % 4 }
    if (eixo === 1) return { ...f, miolo: rng.pick(MIOLOS.filter((m) => m !== f.miolo)) }
    return { ...f, aneis: f.aneis === 1 ? 2 : 1 }
  },

  toSpec(f): SpatialSpec {
    const c = LADO / 2
    const shapes: SpatialSpec['shapes'] = []

    for (let i = 0; i < f.aneis; i++) {
      const r = 46 - i * 9
      shapes.push(
        f.invólucro === 'circulo'
          ? { kind: 'circle', cx: c, cy: c, r, fill: 'none', stroke: TINTA, strokeWidth: TRACO }
          : {
              kind: 'rect',
              x: c - r,
              y: c - r,
              w: r * 2,
              h: r * 2,
              fill: 'none',
              stroke: TINTA,
              strokeWidth: TRACO,
            },
      )
    }

    shapes.push(desenharMiolo(f.miolo, f.direcao, f.espelhado))

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const todas: FiguraAninhadas[] = []
    for (const invólucro of ['circulo', 'quadrado'] as Invólucro[]) {
      for (const aneis of [1, 2]) {
        for (const miolo of MIOLOS) {
          for (let direcao = 0; direcao < 4; direcao++) {
            todas.push({ invólucro, aneis, miolo, direcao, espelhado: false })
            if (miolo === 'bandeira') {
              todas.push({ invólucro, aneis, miolo, direcao, espelhado: true })
            }
          }
        }
      }
    }
    return todas
  },
}

function desenharMiolo(
  miolo: Miolo,
  direcao: number,
  espelhado: boolean,
): SpatialSpec['shapes'][number] {
  const c = LADO / 2
  const r = 20

  if (miolo === 'bandeira') {
    // Haste com uma flâmula de um lado só.
    //
    // A meia-lua que estava aqui NÃO servia: um arco espelhado é a mesma curva
    // percorrida ao contrário, então `(direcao 2, normal)` e `(direcao 0,
    // espelhada)` desenhavam exatamente o mesmo traço com assinaturas
    // diferentes — a questão de "qual não pertence" ficava com duas
    // alternativas idênticas. A bandeira é quiral no desenho, não só na
    // álgebra: nenhuma rotação leva a flâmula para o outro lado da haste.
    const bruto = [
      { x: c - 2, y: c + r },
      { x: c - 2, y: c - r },
      { x: c + 17, y: c - r + 8 },
      { x: c - 2, y: c - r + 16 },
      { x: c + 2, y: c - r + 16 },
      { x: c + 2, y: c + r },
    ]
    const refletido = espelhado ? bruto.map((q) => ({ x: 2 * c - q.x, y: q.y })) : bruto
    const pontos = refletido.map((q) => girarPonto(arred(q.x), arred(q.y), direcao * 90))
    return {
      kind: 'polygon',
      points: pontos.flatMap((q) => [q.x, q.y]),
      fill: 'none',
      stroke: TINTA,
      strokeWidth: TRACO,
    }
  }

  const bruto =
    miolo === 'triangulo'
      ? [
          { x: c, y: c - r },
          { x: c + r * 0.88, y: c + r * 0.62 },
          { x: c - r * 0.88, y: c + r * 0.62 },
        ]
      : [
          { x: c, y: c - r },
          { x: c + r * 0.7, y: c + r * 0.2 },
          { x: c + r * 0.26, y: c + r * 0.2 },
          { x: c + r * 0.26, y: c + r * 0.9 },
          { x: c - r * 0.26, y: c + r * 0.9 },
          { x: c - r * 0.26, y: c + r * 0.2 },
          { x: c - r * 0.7, y: c + r * 0.2 },
        ]

  const pontos = bruto.map((p) => girarPonto(arred(p.x), arred(p.y), direcao * 90))
  return {
    kind: 'polygon',
    points: pontos.flatMap((p) => [p.x, p.y]),
    fill: 'none',
    stroke: TINTA,
    strokeWidth: TRACO,
  }
}
