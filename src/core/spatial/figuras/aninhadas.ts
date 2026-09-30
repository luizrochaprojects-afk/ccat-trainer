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
 *
 * Satélites: pontos nas diagonais entre o miolo e o anel, posicionados EM
 * RELAÇÃO à direção do miolo. Um ponto numa diagonal nunca está sobre o eixo
 * de simetria do miolo, então ele sozinho já torna a figura quiral — é o que
 * deixa triângulo e seta entrarem nas questões de reflexão, que antes só
 * conheciam a bandeira.
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
  /**
   * Diagonais ocupadas por satélites, em ordem crescente, contadas a partir
   * da diagonal à direita da ponta do miolo e andando no horário: 0 = frente
   * direita, 1 = trás direita, 2 = trás esquerda, 3 = frente esquerda.
   */
  pontos: readonly number[]
}

const MIOLOS: Miolo[] = ['triangulo', 'seta', 'bandeira']

/**
 * Distância do centro até os satélites. Fica entre a ponta do miolo (~21) e o
 * anel interno (39), com folga de uns 4 de cada lado para o ponto de raio 4.
 */
const RAIO_SATELITE = 31

/** Todos os subconjuntos das quatro diagonais, para o teste exaustivo. */
const SUBCONJUNTOS: number[][] = Array.from({ length: 16 }, (_, m) =>
  [0, 1, 2, 3].filter((o) => (m >> o) & 1),
)

export const familiaAninhadas: Familia<FiguraAninhadas> = {
  id: 'aninhadas',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraAninhadas {
    // Piso de complexidade: um satélite desde o nível 1 (antes a figura era
    // uma moldura e um miolo, dois traços). Dois satélites a partir do 4, e
    // até três no 5.
    const quantos = nivel <= 3 ? rng.pick(nivel <= 2 ? [1] : [1, 2]) : nivel === 4 ? 2 : rng.pick([2, 3])
    return {
      invólucro: rng.pick(['circulo', 'quadrado'] as Invólucro[]),
      aneis: nivel <= 2 ? 1 : rng.pick([1, 2]),
      miolo: rng.pick(MIOLOS),
      direcao: rng.int(0, 3),
      espelhado: false,
      pontos: rng.shuffle([0, 1, 2, 3]).slice(0, quantos).sort(),
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
    // A diagonal o, espelhada, vira 3 - o: frente direita troca com frente
    // esquerda, trás direita com trás esquerda.
    const pontos = f.pontos.map((o) => 3 - o).sort()
    return f.miolo === 'bandeira'
      ? { ...f, direcao, espelhado: !f.espelhado, pontos }
      : { ...f, direcao, pontos }
  },

  assinatura(f) {
    return `${f.invólucro}|${f.aneis}|${f.miolo}${f.espelhado ? 'E' : ''}|${f.direcao}|${f.pontos.join('')}`
  },

  variar(f, rng) {
    // Girar o miolo sozinho não serve: todo o resto é relativo a ele, então
    // isso é girar a figura inteira. As variações são locais — um satélite
    // muda de diagonal, o miolo troca de forma ou a flâmula troca de lado.
    const livres = [0, 1, 2, 3].filter((o) => !f.pontos.includes(o))
    const eixo = rng.int(0, 2)
    if (eixo === 0 && f.pontos.length > 0 && livres.length > 0) {
      const sai = rng.pick(f.pontos)
      const entra = rng.pick(livres)
      return { ...f, pontos: f.pontos.map((o) => (o === sai ? entra : o)).sort() }
    }
    if (eixo === 1 && f.miolo === 'bandeira') return { ...f, espelhado: !f.espelhado }
    const miolo = rng.pick(MIOLOS.filter((m) => m !== f.miolo))
    return { ...f, miolo, espelhado: miolo === 'bandeira' ? f.espelhado : false }
  },

  toSpec(f): SpatialSpec {
    const c = LADO / 2
    const shapes: SpatialSpec['shapes'] = []

    for (let i = 0; i < f.aneis; i++) {
      // Anel interno a 39, não mais a 37: abre espaço para os satélites.
      const r = 46 - i * 7
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

    for (const o of f.pontos) {
      const p = girarPonto(c, c - RAIO_SATELITE, f.direcao * 90 + 45 + o * 90)
      shapes.push({ kind: 'circle', cx: p.x, cy: p.y, r: 4, fill: TINTA, stroke: TINTA, strokeWidth: 1 })
    }

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const todas: FiguraAninhadas[] = []
    for (const invólucro of ['circulo', 'quadrado'] as Invólucro[]) {
      for (const aneis of [1, 2]) {
        for (const miolo of MIOLOS) {
          for (let direcao = 0; direcao < 4; direcao++) {
            for (const pontos of SUBCONJUNTOS) {
              todas.push({ invólucro, aneis, miolo, direcao, espelhado: false, pontos })
              if (miolo === 'bandeira') {
                todas.push({ invólucro, aneis, miolo, direcao, espelhado: true, pontos })
              }
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
