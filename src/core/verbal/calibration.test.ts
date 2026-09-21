import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { VERBAL_GENERATORS } from './generators'
import { ANALOGY_PAIRS, VOCAB } from './lexicon'

/**
 * Regressão de calibração.
 *
 * O banco saiu com uma questão de nível 1 cujo enunciado era "BIRD is to FALCON"
 * — fácil — mas cujas alternativas incluíam "exculpate is to incriminate" e
 * "pugnacious", vocabulário de nível 5. O enunciado era nível 1; a questão, não.
 *
 * Nenhum teste de correção pega isso: o gabarito estava certo. Só aparece
 * lendo o conteúdo gerado.
 */

const TOLERANCIA = 1 // um distrator pode ser no máximo um nível acima

describe('analogia — distratores não são mais difíceis que a questão', () => {
  it('nenhum par distrator passa do nível da questão + 1', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 200; seed++) {
        const q = VERBAL_GENERATORS.analogia(seed, d)
        for (const o of q.options) {
          const par = ANALOGY_PAIRS.find((p) => `${p.a} is to ${p.b}` === o.text)
          expect(par, `alternativa "${o.text}" não existe no léxico`).toBeDefined()
          expect(
            par!.level,
            `nível ${d} seed ${seed}: alternativa "${o.text}" é nível ${par!.level}`,
          ).toBeLessThanOrEqual(d + TOLERANCIA)
        }
      }
    }
  })
})

describe('vocabulário — distratores não são mais difíceis que a questão', () => {
  for (const subtipo of ['antonimo', 'sinonimo'] as const) {
    it(`${subtipo}: nenhum distrator vem de verbete muito acima do nível`, () => {
      for (const d of DIFFICULTIES) {
        for (let seed = 1; seed <= 200; seed++) {
          const q = VERBAL_GENERATORS[subtipo](seed, d)
          const alvo = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
          const entry = VOCAB.find((e) => e.word === alvo)!

          for (const o of q.options) {
            if (o.id === q.answerId) continue
            // palavras do próprio verbete (armadilha) seguem o nível dele
            if (entry.synonyms.includes(o.text) || entry.antonyms.includes(o.text)) continue

            const dono = VOCAB.find((e) => e.word === o.text || e.synonyms.includes(o.text))
            if (!dono) continue
            expect(
              dono.level,
              `${subtipo} nível ${d} seed ${seed}: "${o.text}" vem de verbete nível ${dono.level}`,
            ).toBeLessThanOrEqual(d + TOLERANCIA)
          }
        }
      }
    })
  }
})

describe('a calibração não quebrou a correção', () => {
  it('continua havendo exatamente uma alternativa certa em todos os verbais', () => {
    for (const [id, gerar] of Object.entries(VERBAL_GENERATORS)) {
      for (const d of DIFFICULTIES) {
        for (let seed = 1; seed <= 100; seed++) {
          const q = gerar(seed, d)
          expect(
            q.options.filter((o) => q.satisfiesRule(o.text)).length,
            `${id} nível ${d} seed ${seed}`,
          ).toBe(1)
        }
      }
    }
  })
})
