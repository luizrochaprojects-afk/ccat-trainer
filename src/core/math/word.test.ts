import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, type Difficulty } from '../taxonomy'
import {
  gerarComTemplate,
  proximo,
  WORD_GENERATORS,
  WORD_GENERATOR_IDS,
  WORD_TEMPLATES,
  type WordGeneratorId,
} from './word'
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
          expect(gerar(9, d).options).toHaveLength(5)
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

describe('o nível escolhe a família do problema', () => {
  for (const id of WORD_GENERATOR_IDS) {
    const templates = WORD_TEMPLATES[id]
    const passosDe = new Map(templates.map((t) => [t.id, t.passos]))
    const doNivel = (d: Difficulty) =>
      templates.filter((t) => t.niveis.includes(d)).map((t) => t.id)

    describe(id, () => {
      it('tem pelo menos 4 templates e 2 elegíveis em cada nível', () => {
        expect(templates.length).toBeGreaterThanOrEqual(4)
        for (const d of DIFFICULTIES) {
          expect(doNivel(d).length, `${id} nível ${d}`).toBeGreaterThanOrEqual(2)
        }
      })

      it('cada nível sorteia só os seus templates, e mais de um de fato aparece', () => {
        for (const d of DIFFICULTIES) {
          const usados = new Set<string>()
          for (let seed = 1; seed <= RUNS; seed++) {
            usados.add(gerarComTemplate(id, seed, d).template)
          }
          for (const t of usados) expect(doNivel(d), `${id} nível ${d}`).toContain(t)
          const msg = `${id} nível ${d}: só saiu ${[...usados].join(', ')}`
          expect(usados.size, msg).toBeGreaterThanOrEqual(2)
        }
      })

      it('do nível 3 em diante nunca sai template dos níveis 1-2 nem de menos de 3 passos', () => {
        const faceis = new Set(templates.filter((t) => Math.max(...t.niveis) <= 2).map((t) => t.id))
        expect(faceis.size).toBeGreaterThan(0)
        for (const d of [3, 4, 5] as const) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const { template } = gerarComTemplate(id, seed, d)
            expect(faceis.has(template), `${id} nível ${d} seed ${seed}: ${template}`).toBe(false)
            expect(passosDe.get(template)).toBeGreaterThanOrEqual(3)
          }
        }
      })

      it('o nível 1 já pede pelo menos dois passos', () => {
        for (const t of doNivel(1)) expect(passosDe.get(t), t).toBeGreaterThanOrEqual(2)
      })

      it('do nível 3 em diante, pelo menos dois distratores ficam a ±20% da resposta', () => {
        for (const d of [3, 4, 5] as const) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(id, seed, d)
            const perto = q.options
              .filter((o) => o.id !== q.answerId)
              .filter((o) => proximo(parseNumber(o.text), q.answerValue))
            const msg = `${id} nível ${d} seed ${seed}: ${q.stem}`
            expect(perto.length, msg).toBeGreaterThanOrEqual(2)
          }
        }
      })

      it('nenhum distrator é eliminável pela escala (mais de 4× longe da resposta)', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(id, seed, d)
            for (const o of q.options) {
              const v = parseNumber(o.text)
              const msg = `${id} nível ${d} seed ${seed}: ${o.text} vs ${q.answerValue}`
              expect(v, msg).toBeLessThanOrEqual(q.answerValue * 4 + 1e-9)
              expect(v, msg).toBeGreaterThanOrEqual(q.answerValue / 4 - 1e-9)
            }
          }
        }
      })

      it('mesma seed em níveis extremos produz enunciados diferentes', () => {
        for (let seed = 1; seed <= 50; seed++) {
          expect(gerar(id, seed, 1).stem).not.toBe(gerar(id, seed, 5).stem)
        }
      })
    })
  }
})

describe('os distratores são os erros reais do problema', () => {
  const valores = (q: { options: { text: string }[] }) => q.options.map((o) => parseNumber(o.text))

  it('descontos sucessivos: somar os percentuais aparece entre as alternativas', () => {
    let vistos = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const { questao: q, template } = gerarComTemplate('porcentagem', seed, 3)
      if (template !== 'descontosSucessivos') continue
      const [preco, p1, p2] = numeros(q.stem) as [number, number, number]
      const somando = (preco * (100 - p1 - p2)) / 100
      expect(valores(q), q.stem).toContainEqual(somando)
      expect(q.answerValue).toBeCloseTo((preco * (100 - p1) * (100 - p2)) / 10000, 2)
      vistos++
    }
    expect(vistos).toBeGreaterThan(20)
  })

  it('média ponderada: a média simples das médias aparece entre as alternativas', () => {
    let vistos = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const { questao: q, template } = gerarComTemplate('aritmetica', seed, 4)
      if (template !== 'mediaPonderada') continue
      const [n1, a1, n2, a2] = numeros(q.stem) as [number, number, number, number]
      expect(q.answerValue).toBe((n1 * a1 + n2 * a2) / (n1 + n2))
      expect(valores(q), q.stem).toContainEqual((a1 + a2) / 2)
      vistos++
    }
    expect(vistos).toBeGreaterThan(20)
  })

  it('trabalho conjunto: a resposta vem das taxas somadas, recalculada do enunciado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { questao: q, template } = gerarComTemplate('taxa', seed, 4)
      if (template !== 'trabalhoConjunto') continue
      const [a, b] = numeros(q.stem) as [number, number]
      expect(q.answerValue, q.stem).toBeCloseTo(60 / (1 / a + 1 / b), 6)
      expect(q.answerValue).toBeLessThan(Math.min(a, b) * 60)
    }
  })
})

describe('divisão com resto: o enunciado diz qual arredondamento quer', () => {
  it('nenhum enunciado pede divisão "igual" que não fecha', () => {
    for (const id of WORD_GENERATOR_IDS) {
      for (const d of DIFFICULTIES) {
        for (let seed = 1; seed <= RUNS; seed++) {
          expect(gerar(id, seed, d).stem).not.toMatch(/divided equally/i)
        }
      }
    }
  })

  it('vans: a resposta é o teto, recalculado do enunciado, e o piso é distrator', () => {
    let vistos = 0
    for (const d of [1, 2] as const) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const { questao: q, template } = gerarComTemplate('aritmetica', seed, d)
        if (template !== 'vans') continue
        const [alunos, profs, lugares] = numeros(q.stem) as [number, number, number]
        const cap = d === 1 ? lugares : lugares - 1
        expect(q.answerValue, q.stem).toBe(Math.ceil((alunos + profs) / cap))
        expect(q.options.map((o) => parseNumber(o.text))).toContainEqual(q.answerValue - 1)
        vistos++
      }
    }
    expect(vistos).toBeGreaterThan(20)
  })
})

function gerar(id: WordGeneratorId, seed: number, d: Difficulty) {
  return WORD_GENERATORS[id](seed, d)
}

/** Números do enunciado, na ordem em que aparecem. */
function numeros(stem: string): number[] {
  return (stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => Number(t.replace(/,/g, '')))
}
