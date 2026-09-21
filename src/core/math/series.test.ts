import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { SERIES_GENERATORS, SERIES_GENERATOR_IDS } from './series'
import { evaluateExpression, parseNumberPt } from './solver'

const RUNS = 200

describe('geradores de séries numéricas', () => {
  for (const id of SERIES_GENERATOR_IDS) {
    const gerar = SERIES_GENERATORS[id]

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
            const marcada = q.options.find((o) => o.id === q.answerId)
            expect(marcada, `${id} nível ${d} seed ${seed}`).toBeDefined()

            // caminho 1: o valor que o gerador afirma
            // caminho 2: a expressão avaliada pelo solver, independente
            expect(evaluateExpression(q.expression)).toBeCloseTo(q.answerValue, 9)
            // e o que está escrito na alternativa bate com os dois
            expect(parseNumberPt(marcada!.text)).toBeCloseTo(q.answerValue, 9)
          }
        }
      })

      it('nenhum distrator é igual à resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const valores = q.options.map((o) => parseNumberPt(o.text))
            const iguais = valores.filter((v) => Math.abs(v - q.answerValue) < 1e-9)
            expect(iguais, `${id} nível ${d} seed ${seed}`).toHaveLength(1)
          }
        }
      })

      it('não repete alternativa', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const textos = q.options.map((o) => o.text)
            expect(new Set(textos).size, `${id} nível ${d} seed ${seed}`).toBe(textos.length)
          }
        }
      })

      it('4 alternativas nos níveis 1-2, 5 nos níveis 3-5', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 40; seed++) {
            expect(gerar(seed, d).options).toHaveLength(d <= 2 ? 4 : 5)
          }
        }
      })

      it('o enunciado mostra a série e termina em "?"', () => {
        for (const d of DIFFICULTIES) {
          const q = gerar(7, d)
          expect(q.stem.endsWith(', ?')).toBe(true)
          expect(q.stem.split(',').length).toBeGreaterThanOrEqual(5)
        }
      })

      it('o enunciado não contém a resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const mostrados = q.stem
              .replace(', ?', '')
              .split(',')
              .map((t) => parseNumberPt(t.trim()))
            expect(mostrados).not.toContain(q.answerValue)
          }
        }
      })

      it('produz apenas inteiros (sem dízima na alternativa)', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            for (const o of gerar(seed, d).options) {
              expect(Number.isInteger(parseNumberPt(o.text))).toBe(true)
            }
          }
        }
      })

      /**
       * O que importa não é "seeds diferentes dão questões diferentes" (colisão
       * é normal e o gate de dedup resolve), e sim: o espaço de questões é
       * grande o bastante para preencher a meta de 150 aprovadas por tipo?
       * Um gerador com espaço pequeno só é descoberto quando o pipeline já
       * está cuspindo duplicata.
       */
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

describe('serie_simples: a regra é recuperável dos termos mostrados', () => {
  it('nos níveis 1-2 a diferença entre termos vizinhos é constante', () => {
    for (const d of [1, 2] as const) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_simples(seed, d)
        const termos = q.stem.replace(', ?', '').split(',').map((t) => parseNumberPt(t.trim()))
        const difs = termos.slice(1).map((t, i) => t - (termos[i] as number))
        expect(new Set(difs).size).toBe(1)
        // e o próximo termo continua a mesma diferença
        expect((termos.at(-1) as number) + (difs[0] as number)).toBe(q.answerValue)
      }
    }
  })

  it('no nível 3 a série é geométrica OU de Fibonacci, e a regra fecha na resposta', () => {
    let geometricas = 0
    let fibonaccis = 0

    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SERIES_GENERATORS.serie_simples(seed, 3)
      const termos = q.stem.replace(', ?', '').split(',').map((t) => parseNumberPt(t.trim()))
      const ultimo = termos.at(-1) as number
      const penultimo = termos.at(-2) as number

      const razoes = termos.slice(1).map((t, i) => t / (termos[i] as number))
      const ehGeometrica = new Set(razoes).size === 1
      const ehFibonacci = termos
        .slice(2)
        .every((t, i) => t === (termos[i] as number) + (termos[i + 1] as number))

      expect(
        ehGeometrica || ehFibonacci,
        `seed ${seed}: série não bate com nenhuma família do nível 3 (${q.stem})`,
      ).toBe(true)

      if (ehGeometrica) {
        geometricas++
        expect(ultimo * (razoes[0] as number)).toBe(q.answerValue)
      } else {
        fibonaccis++
        expect(ultimo + penultimo).toBe(q.answerValue)
      }
    }

    // as duas famílias precisam de fato aparecer, senão o sorteio está quebrado
    expect(geometricas).toBeGreaterThan(20)
    expect(fibonaccis).toBeGreaterThan(20)
  })
})

describe('serie_dois_passos: alterna soma e multiplicação', () => {
  it('a resposta é a soma aplicada ao último termo mostrado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SERIES_GENERATORS.serie_dois_passos(seed, 3)
      const termos = q.stem.replace(', ?', '').split(',').map((t) => parseNumberPt(t.trim()))
      const ultimo = termos.at(-1) as number
      expect(q.answerValue).toBeGreaterThan(ultimo)
      // a diferença da resposta para o último termo é a mesma soma usada no 2º termo
      const soma = (termos[1] as number) - (termos[0] as number)
      expect(q.answerValue - ultimo).toBe(soma)
    }
  })
})
