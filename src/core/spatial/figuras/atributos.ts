import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, girarPonto, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Uma forma com atributos independentes — o vocabulário da imagem 10, onde
 * triângulos alternam preenchimento e direção ao longo da sequência.
 *
 * O que se testa aqui não é rotação mental, é rastrear DUAS regras ao mesmo
 * tempo: o preenchimento alterna num ritmo e a direção noutro. Por isso a
 * figura é uma tupla de atributos e não um desenho arbitrário.
 *
 * Família deliberadamente AQUIRAL: um triângulo espelhado é igual a um
 * triângulo girado. Ela alimenta sequências e matrizes, nunca questões de
 * reflexão — a tabela de compatibilidade em `formas.ts` cuida disso.
 */

export type FormaBase = 'triangulo' | 'quadrado' | 'seta' | 'losango'
export type Preenchimento = 'solido' | 'vazado'
export type Tamanho = 'pequeno' | 'grande'

export interface FiguraAtributos {
  forma: FormaBase
  preenchimento: Preenchimento
  /** 0 = para cima, 1 = direita, 2 = baixo, 3 = esquerda */
  direcao: number
  tamanho: Tamanho
}

const FORMAS: FormaBase[] = ['triangulo', 'quadrado', 'seta', 'losango']

export const familiaAtributos: Familia<FiguraAtributos> = {
  id: 'atributos',
  passosNoCiclo: 4,
  suportaReflexao: false,

  sortear(rng: Rng, nivel: Difficulty): FiguraAtributos {
    return {
      forma: rng.pick(nivel <= 2 ? (['triangulo', 'seta'] as FormaBase[]) : FORMAS),
      preenchimento: rng.pick(['solido', 'vazado'] as Preenchimento[]),
      direcao: rng.int(0, 3),
      tamanho: nivel <= 3 ? 'grande' : rng.pick(['pequeno', 'grande'] as Tamanho[]),
    }
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    if (((passos % 2) + 2) % 2 === 0) return f
    return { ...f, preenchimento: f.preenchimento === 'solido' ? 'vazado' : 'solido' }
  },
  rotate(f, passos) {
    return { ...f, direcao: (((f.direcao + passos) % 4) + 4) % 4 }
  },

  reflect(f) {
    // Espelho no eixo vertical: cima e baixo ficam, esquerda e direita trocam.
    return { ...f, direcao: (4 - f.direcao) % 4 }
  },

  assinatura(f) {
    return `${f.forma}|${f.preenchimento}|${f.direcao}|${f.tamanho}`
  },

  variar(f, rng) {
    const eixo = rng.int(0, 2)
    if (eixo === 0) {
      return { ...f, preenchimento: f.preenchimento === 'solido' ? 'vazado' : 'solido' }
    }
    if (eixo === 1) {
      return { ...f, direcao: (f.direcao + rng.pick([1, 2, 3])) % 4 }
    }
    return { ...f, forma: rng.pick(FORMAS.filter((x) => x !== f.forma)) }
  },

  toSpec(f): SpatialSpec {
    const escala = f.tamanho === 'grande' ? 1 : 0.62
    const solido = f.preenchimento === 'solido'
    const pontos = contorno(f.forma, escala).map((p) => girarPonto(p.x, p.y, f.direcao * 90))

    return {
      width: LADO,
      height: LADO,
      shapes: [
        {
          kind: 'polygon',
          points: pontos.flatMap((p) => [p.x, p.y]),
          fill: solido ? TINTA : 'none',
          stroke: TINTA,
          strokeWidth: TRACO,
        },
      ],
    }
  },

  todasAsConfiguracoes() {
    const todas: FiguraAtributos[] = []
    for (const forma of FORMAS) {
      for (const preenchimento of ['solido', 'vazado'] as Preenchimento[]) {
        for (let direcao = 0; direcao < 4; direcao++) {
          for (const tamanho of ['pequeno', 'grande'] as Tamanho[]) {
            todas.push({ forma, preenchimento, direcao, tamanho })
          }
        }
      }
    }
    return todas
  },
}

/** Contorno da forma apontando para cima, centrado na caixa. */
function contorno(forma: FormaBase, escala: number): { x: number; y: number }[] {
  const c = LADO / 2
  const r = 36 * escala
  const p = (x: number, y: number) => ({ x: arred(c + x), y: arred(c + y) })

  switch (forma) {
    case 'triangulo':
      return [p(0, -r), p(r * 0.88, r * 0.62), p(-r * 0.88, r * 0.62)]
    case 'quadrado':
      return [p(-r * 0.76, -r * 0.76), p(r * 0.76, -r * 0.76), p(r * 0.76, r * 0.76), p(-r * 0.76, r * 0.76)]
    case 'losango':
      return [p(0, -r), p(r * 0.68, 0), p(0, r), p(-r * 0.68, 0)]
    default:
      // Seta: triângulo com uma haste, para a direção ficar inequívoca.
      return [
        p(0, -r),
        p(r * 0.8, -r * 0.05),
        p(r * 0.3, -r * 0.05),
        p(r * 0.3, r * 0.8),
        p(-r * 0.3, r * 0.8),
        p(-r * 0.3, -r * 0.05),
        p(-r * 0.8, -r * 0.05),
      ]
  }
}
