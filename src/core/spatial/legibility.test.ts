import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { SPATIAL_GENERATORS, SPATIAL_GENERATOR_IDS } from './generators'
import { ANGULAR_STEPS, key, reflect, rotate, type Glyph } from './glyph'
import {
  corpo,
  distanciaVisual,
  ehLegivel,
  MIN_CORPO,
  MIN_QUIRALIDADE,
  MIN_SEPARACAO_ALTERNATIVAS,
  quiralidadeVisual,
} from './legibility'

const RUNS = 120

/**
 * Regressão de legibilidade.
 *
 * O banco saiu com questões espaciais logicamente corretas e impossíveis de
 * responder: figuras de três vértices quase colineares (uma reta disfarçada,
 * e reta não tem lado, então o espelho é igual a ela girada) e distratores
 * "quase certos" a 2,5px da resposta.
 *
 * Nenhum teste de correção pegava — o gabarito estava certo em todos. Estes
 * medem a outra metade: dá para VER qual é a resposta?
 */

describe('métricas de legibilidade', () => {
  const linha: Glyph = [
    { a: 0, r: 3 },
    { a: 0, r: 1 },
    { a: 6, r: 3 },
  ]
  const triangulo: Glyph = [
    { a: 0, r: 3 },
    { a: 4, r: 3 },
    { a: 9, r: 2 },
  ]

  it('corpo é zero numa figura colinear e alto num triângulo cheio', () => {
    expect(corpo(linha)).toBeLessThan(0.01)
    expect(corpo(triangulo)).toBeGreaterThan(0.2)
  })

  it('corpo não muda ao espelhar — é medido no fecho convexo', () => {
    // Regressão: a área era calculada sobre o polígono em ordem angular, e
    // quando dois vértices caem no mesmo raio o desempate mudava ao espelhar,
    // fazendo a mesma figura parecer legível numa orientação e degenerada na
    // outra.
    for (const g of [linha, triangulo]) {
      expect(corpo(reflect(g))).toBeCloseTo(corpo(g), 6)
    }
  })

  it('a distância é o vértice que mais se deslocou, não a média', () => {
    const a: Glyph = [
      { a: 0, r: 3 },
      { a: 4, r: 3 },
      { a: 8, r: 3 },
    ]
    // dois vértices em comum, um deslocado dois passos de raio (~23px)
    const b: Glyph = [
      { a: 0, r: 3 },
      { a: 4, r: 3 },
      { a: 8, r: 1 },
    ]
    const d = distanciaVisual(a, b)
    expect(d).toBeGreaterThan(20)
    // a média sobre os três vértices daria ~7,8px e declararia as figuras
    // parecidas; é exatamente o que a métrica antiga fazia
    expect(d).toBeGreaterThan((d / 3) * 2)
  })

  it('uma figura colinear nunca é considerada legível', () => {
    expect(ehLegivel(linha)).toBe(false)
  })
})

describe('toda questão espacial é respondível a olho', () => {
  for (const id of SPATIAL_GENERATOR_IDS) {
    describe(id, () => {
      it('a figura de base tem corpo e lado visível', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = SPATIAL_GENERATORS[id](seed, d)
            const idx = q.options.findIndex((o) => o.id === q.answerId)
            const correta = q.optionGlyphs[idx]!
            // na reflexão a resposta É o espelho; a base é o espelho dela
            const base = id === 'reflexao' ? reflect(correta) : correta

            expect(corpo(base), `${id} n${d} seed ${seed}: figura quase colinear`).toBeGreaterThanOrEqual(
              MIN_CORPO,
            )
            expect(
              quiralidadeVisual(base),
              `${id} n${d} seed ${seed}: espelho indistinguível de rotação`,
            ).toBeGreaterThanOrEqual(MIN_QUIRALIDADE)
          }
        }
      })

      it('nenhum par de alternativas fica visualmente colado', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = SPATIAL_GENERATORS[id](seed, d)
            for (let i = 0; i < q.optionGlyphs.length; i++) {
              for (let j = i + 1; j < q.optionGlyphs.length; j++) {
                expect(
                  distanciaVisual(q.optionGlyphs[i]!, q.optionGlyphs[j]!),
                  `${id} n${d} seed ${seed}: alternativas ${i} e ${j} coladas`,
                ).toBeGreaterThanOrEqual(MIN_SEPARACAO_ALTERNATIVAS)
              }
            }
          }
        }
      })
    })
  }
})

describe('reflexão: o giro extra do espelho é curto', () => {
  it('a resposta está no máximo 60° além do espelho puro', () => {
    // Girar o espelho a esmo obriga a normalizar a orientação E detectar a
    // lateralidade ao mesmo tempo: nenhuma alternativa se parece com um "vira
    // de lado" do enunciado, e a questão deixa de ser respondível em 18s.
    const PERMITIDOS = new Set([0, 1, 2, 10, 11])

    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SPATIAL_GENERATORS.reflexao(seed, d)
        const idx = q.options.findIndex((o) => o.id === q.answerId)
        const correta = q.optionGlyphs[idx]!
        const espelhoPuro = reflect(reflect(correta))

        // qual giro leva o espelho puro ate a resposta?
        const giro = Array.from({ length: ANGULAR_STEPS }, (_, k) => k).find(
          (k) => key(rotate(espelhoPuro, k)) === key(correta),
        )
        expect(giro, `seed ${seed}: resposta nao e rotacao do espelho`).toBeDefined()
        expect(
          PERMITIDOS.has(giro as number),
          `n${d} seed ${seed}: espelho girado ${(giro as number) * 30}graus`,
        ).toBe(true)
      }
    }
  })
})
