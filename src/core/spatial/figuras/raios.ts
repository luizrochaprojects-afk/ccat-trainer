import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Mostrador com ponteiros — o vocabulário da imagem de referência 12.
 *
 * Oito posições angulares, marcadas por guias tracejadas, e um conjunto de
 * ponteiros curtos ou longos. Girar é somar módulo 8, o que torna a progressão
 * de uma sequência imediatamente rastreável: o candidato segue um ponteiro.
 *
 * As guias não são enfeite. Sem elas, estimar "quantos passos andou" vira
 * julgamento de ângulo a olho; com elas, vira contagem.
 */

/** 0 = sem ponteiro, 1 = ponteiro curto, 2 = ponteiro longo. */
export type Ponteiro = 0 | 1 | 2

export const POSICOES = 8

/** Um valor por posição angular, começando em 12 horas e andando no horário. */
export type FiguraRaios = readonly Ponteiro[]

/**
 * Comprimentos dos ponteiros.
 *
 * O longo para bem antes do aro (34 de 44). Com 40 a ponta encostava na
 * circunferência e as duas linhas viravam um traço só — a pessoa não conseguia
 * ver onde o ponteiro terminava, que é exatamente o que ela precisa contar.
 */
const COMPRIMENTO: Record<Exclude<Ponteiro, 0>, number> = { 1: 19, 2: 34 }
const RAIO_MOSTRADOR = 44

export const familiaRaios: Familia<FiguraRaios> = {
  id: 'raios',
  passosNoCiclo: POSICOES,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraRaios {
    // Nunca menos de dois ponteiros, e nunca dois do MESMO comprimento.
    //
    // Não é escolha estética, é o que torna a família quiral. Num ciclo, um
    // único ponteiro refletido sempre coincide com alguma rotação dele mesmo,
    // e dois de comprimento igual também — o conjunto {i, j} é simétrico em
    // torno do próprio ponto médio. Só o contraste curto/longo quebra isso.
    const quantos = nivel <= 4 ? 2 : 3
    const slots: Ponteiro[] = Array.from({ length: POSICOES }, () => 0)
    const posicoes = rng.shuffle(Array.from({ length: POSICOES }, (_, i) => i)).slice(0, quantos)

    // O primeiro é longo, o segundo curto; os demais variam.
    posicoes.forEach((pos, i) => {
      slots[pos] = i === 0 ? 2 : i === 1 ? 1 : rng.pick([1, 2] as Ponteiro[])
    })
    return slots
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    // Inverte curto e longo. Mexe em valores, não em posições: comuta com girar.
    if (((passos % 2) + 2) % 2 === 0) return f
    return f.map((v) => (v === 1 ? 2 : v === 2 ? 1 : 0) as Ponteiro)
  },
  rotate(f, passos) {
    const p = ((passos % POSICOES) + POSICOES) % POSICOES
    return f.map((_, i) => f[(i - p + POSICOES) % POSICOES] as Ponteiro)
  },

  reflect(f) {
    // Espelho no eixo vertical: a posição i vai para -i.
    return f.map((_, i) => f[(POSICOES - i) % POSICOES] as Ponteiro)
  },

  assinatura(f) {
    return f.join('')
  },

  variar(f, rng) {
    const copia = [...f]
    const ocupadas = copia.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0)
    const vazias = copia.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)

    // Move um ponteiro de casa, ou troca seu comprimento se não houver para onde ir.
    if (ocupadas.length > 0 && vazias.length > 0) {
      const de = rng.pick(ocupadas)
      const para = rng.pick(vazias)
      copia[para] = copia[de] as Ponteiro
      copia[de] = 0
    } else if (ocupadas.length > 0) {
      const i = rng.pick(ocupadas)
      copia[i] = copia[i] === 1 ? 2 : 1
    }
    return copia
  },

  toSpec(f): SpatialSpec {
    const c = LADO / 2
    const shapes: SpatialSpec['shapes'] = [
      {
        kind: 'circle',
        cx: c,
        cy: c,
        r: RAIO_MOSTRADOR,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: TRACO,
      },
    ]

    // Guias tracejadas: transformam "estimar o ângulo" em "contar as casas".
    for (let i = 0; i < POSICOES / 2; i++) {
      const a = ponta(i, RAIO_MOSTRADOR)
      const b = ponta(i + POSICOES / 2, RAIO_MOSTRADOR)
      shapes.push({
        kind: 'path',
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        fill: 'none',
        stroke: '#c9c5bd',
        strokeWidth: 1,
      })
    }

    // Eixo central: dá um ponto de origem inequívoco para os ponteiros.
    shapes.push({ kind: 'circle', cx: c, cy: c, r: 3, fill: TINTA, stroke: TINTA, strokeWidth: 1 })

    f.forEach((p, i) => {
      if (p === 0) return
      const fim = ponta(i, COMPRIMENTO[p])
      shapes.push({
        kind: 'path',
        d: `M ${c} ${c} L ${fim.x} ${fim.y}`,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: p === 2 ? 4 : 2.5,
      })
    })

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    // O espaço completo (3^8) é grande demais para enumerar num teste; as
    // configurações de 1 e 2 ponteiros já cobrem toda a álgebra de rotação e
    // reflexão, que é o que o teste exaustivo precisa provar.
    const todas: FiguraRaios[] = []
    const vazio = (): Ponteiro[] => Array.from({ length: POSICOES }, () => 0)

    for (let i = 0; i < POSICOES; i++) {
      for (const vi of [1, 2] as Ponteiro[]) {
        const um = vazio()
        um[i] = vi
        todas.push(um)

        for (let j = i + 1; j < POSICOES; j++) {
          for (const vj of [1, 2] as Ponteiro[]) {
            const dois = vazio()
            dois[i] = vi
            dois[j] = vj
            todas.push(dois)
          }
        }
      }
    }
    return todas
  },
}

/** Ponta de um raio na posição angular `i`, a partir do centro. */
function ponta(i: number, comprimento: number): { x: number; y: number } {
  const ang = (i / POSICOES) * Math.PI * 2
  return {
    x: arred(LADO / 2 + comprimento * Math.sin(ang)),
    y: arred(LADO / 2 - comprimento * Math.cos(ang)),
  }
}
