import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { WORD_GENERATORS, WORD_GENERATOR_IDS } from './word'
import { evaluateExpression, parseNumber } from './solver'

const RUNS = 200

describe('geradores de problemas matemáticos', () => {
  for (const id of WORD_GENERATOR_IDS) {
    const gerar = WORD_GENERATORS[id]

    describe(id, () => {
      it('é determinístico por seed e nível', () => {
        for (let seed = 1; seed <= 50; seed++) {
          for (const d of DIFFICULTIES) {
            expect(gerar(seed, d)).toEqual(gerar(seed, d))
          }
        }
      })

      it('a expressão canônica confere com a alternativa marcada', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const marcada = q.options.find((o) => o.id === q.answerId)!
            expect(evaluateExpression(q.expression), `${id} seed ${seed}`).toBeCloseTo(
              q.answerValue,
              6,
            )
            expect(parseNumber(marcada.text)).toBeCloseTo(q.answerValue, 2)
          }
        }
      })

      it('exatamente uma alternativa vale a resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const iguais = q.options.filter(
              (o) => Math.abs(parseNumber(o.text) - q.answerValue) < 0.005,
            )
            expect(iguais, `${id} nível ${d} seed ${seed}`).toHaveLength(1)
          }
        }
      })

      it('não repete alternativa', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const textos = gerar(seed, d).options.map((o) => o.text)
            expect(new Set(textos).size, `${id} nível ${d} seed ${seed}`).toBe(textos.length)
          }
        }
      })

      it('nenhuma alternativa é negativa', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            for (const o of gerar(seed, d).options) {
              expect(parseNumber(o.text)).toBeGreaterThanOrEqual(0)
            }
          }
        }
      })

      it('a resposta é exata — sem dízima para resolver de cabeça em 18s', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const centavos = q.answerValue * 100
            expect(
              Math.abs(centavos - Math.round(centavos)),
              `${id} seed ${seed}: resposta ${q.answerValue} tem mais de 2 casas`,
            ).toBeLessThan(1e-6)
          }
        }
      })

      it('o enunciado não entrega a resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const numerosNoEnunciado = (q.stem.match(/[\d.]+(?:,\d+)?/g) ?? []).map((t) => {
              try {
                return parseNumber(t)
              } catch {
                return Number.NaN
              }
            })
            expect(
              numerosNoEnunciado.some((n) => Math.abs(n - q.answerValue) < 0.005),
              `${id} seed ${seed}: a resposta ${q.answerValue} aparece no enunciado "${q.stem}"`,
            ).toBe(false)
          }
        }
      })

      it('4 alternativas nos níveis 1-2, 5 nos níveis 3-5', () => {
        for (const d of DIFFICULTIES) {
          expect(gerar(9, d).options).toHaveLength(d <= 2 ? 4 : 5)
        }
      })

      it('tem explicação e enunciado não vazios', () => {
        for (let seed = 1; seed <= 50; seed++) {
          const q = gerar(seed, 3)
          expect(q.stem.length).toBeGreaterThan(20)
          expect(q.explanation.pt.length).toBeGreaterThan(40)
          expect(q.explanation.en.length).toBeGreaterThan(40)
        }
      })

      it('rende 50 questões distintas por nível dentro do orçamento de seeds', () => {
        for (const d of DIFFICULTIES) {
          const stems = new Set<string>()
          for (let seed = 1; seed <= 400 && stems.size < 50; seed++) {
            stems.add(gerar(seed, d).stem)
          }
          expect(stems.size, `${id} nível ${d}: espaço de questões pequeno demais`).toBe(50)
        }
      })
    })
  }
})

describe('porcentagem: os distratores são os erros clássicos', () => {
  it('inclui "somou o desconto" ou "devolveu só o desconto"', () => {
    let comArmadilha = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = WORD_GENERATORS.porcentagem(seed, 3)
      const valores = q.options.map((o) => parseNumber(o.text))
      // alguma alternativa maior que a resposta (o erro de somar em vez de descontar)
      if (valores.some((v) => v > q.answerValue)) comArmadilha++
    }
    expect(comArmadilha).toBeGreaterThan(RUNS * 0.5)
  })
})
