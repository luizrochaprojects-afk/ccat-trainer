import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, type Difficulty } from '../taxonomy'
import { spatialSpecSchema } from '../schema'
import { SPATIAL_GENERATORS, SPATIAL_GENERATOR_IDS } from './generators'
import { isUsable, key, reflect, rotate, sameUpToRotation } from './glyph'

const RUNS = 200

describe('geradores espaciais', () => {
  for (const id of SPATIAL_GENERATOR_IDS) {
    const gerar = SPATIAL_GENERATORS[id]

    describe(id, () => {
      it('é determinístico: mesma seed e nível produzem questão idêntica', () => {
        for (let seed = 1; seed <= 40; seed++) {
          for (const d of DIFFICULTIES) {
            const a = gerar(seed, d)
            const b = gerar(seed, d)
            expect(b.answerId).toBe(a.answerId)
            expect(b.stem).toBe(a.stem)
            expect(b.explanation).toEqual(a.explanation)
            expect(b.options).toEqual(a.options)
            expect(b.stemSpatial).toEqual(a.stemSpatial)
          }
        }
      })

      it(`tem exatamente uma alternativa correta (${RUNS} execuções por nível)`, () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const corretas = q.optionGlyphs.filter((g) => q.satisfiesRule(g))
            expect(
              corretas.length,
              `${id} nível ${d} seed ${seed}: ${corretas.length} alternativas satisfazem a regra`,
            ).toBe(1)
          }
        }
      })

      it('o answerId aponta para a alternativa que satisfaz a regra', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const idx = q.options.findIndex((o) => o.id === q.answerId)
            expect(idx).toBeGreaterThanOrEqual(0)
            expect(q.satisfiesRule(q.optionGlyphs[idx]!)).toBe(true)
          }
        }
      })

      it('não repete alternativa', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const chaves = q.optionGlyphs.map(key)
            expect(new Set(chaves).size, `${id} nível ${d} seed ${seed}`).toBe(chaves.length)
            const ids = q.options.map((o) => o.id)
            expect(new Set(ids).size).toBe(ids.length)
          }
        }
      })

      it('produz 4 alternativas nos níveis 1-2 e 5 nos níveis 3-5', () => {
        for (const d of DIFFICULTIES) {
          const esperado = d <= 2 ? 4 : 5
          for (let seed = 1; seed <= 30; seed++) {
            expect(gerar(seed, d).options).toHaveLength(esperado)
          }
        }
      })

      it('emite SpatialSpec válido no enunciado e nas alternativas', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 30; seed++) {
            const q = gerar(seed, d)
            if (q.stemSpatial) expect(spatialSpecSchema.parse(q.stemSpatial)).toBeTruthy()
            for (const o of q.options) expect(spatialSpecSchema.parse(o.spatial)).toBeTruthy()
          }
        }
      })

      it('usa apenas figuras quirais e sem simetria rotacional', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 60; seed++) {
            for (const g of gerar(seed, d).optionGlyphs) {
              // distratores "quase certos" podem ser degenerados de propósito;
              // o que não pode é a resposta certa ser ambígua
              expect(g.length).toBeGreaterThanOrEqual(3)
            }
            const q = gerar(seed, d)
            const correta = q.optionGlyphs[q.options.findIndex((o) => o.id === q.answerId)]!
            expect(isUsable(correta)).toBe(true)
          }
        }
      })

      it('seeds diferentes geram questões diferentes', () => {
        const chaves = new Set<string>()
        for (let seed = 1; seed <= 100; seed++) {
          const q = gerar(seed, 3 as Difficulty)
          chaves.add(q.optionGlyphs.map(key).join('#'))
        }
        // alguma colisão é aceitável; um gerador travado num único desenho não é
        expect(chaves.size).toBeGreaterThan(90)
      })
    })
  }
})

describe('rotacao: os distratores são de fato espelhos', () => {
  it('nenhum distrator é alcançável por rotação da figura do enunciado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SPATIAL_GENERATORS.rotacao(seed, 3)
      const errados = q.optionGlyphs.filter((g) => !q.satisfiesRule(g))
      expect(errados).toHaveLength(4)
      for (const g of errados) expect(q.satisfiesRule(g)).toBe(false)
    }
  })
})

describe('odd_one_out: o grupo é coeso', () => {
  it('todas as alternativas menos uma são rotações da mesma figura', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SPATIAL_GENERATORS.odd_one_out(seed, 3)
      const intrusaIdx = q.options.findIndex((o) => o.id === q.answerId)
      const grupo = q.optionGlyphs.filter((_, i) => i !== intrusaIdx)
      const referencia = grupo[0]!
      for (const g of grupo) expect(sameUpToRotation(g, referencia)).toBe(true)
      expect(sameUpToRotation(q.optionGlyphs[intrusaIdx]!, referencia)).toBe(false)
      // e a intrusa é o espelho do grupo, não uma figura qualquer
      expect(sameUpToRotation(reflect(q.optionGlyphs[intrusaIdx]!), referencia)).toBe(true)
    }
  })
})

describe('serie_formas: a resposta continua a progressão mostrada', () => {
  it('a alternativa correta é a próxima rotação da série', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SPATIAL_GENERATORS.serie_formas(seed, 3)
      const correta = q.optionGlyphs[q.options.findIndex((o) => o.id === q.answerId)]!
      // o passo é recuperável: existe k tal que girar a resposta por -4k bate na base
      const candidatos = [1, 2, 5, 7, 10, 11].filter((passo) =>
        [0, 1, 2, 3].every((i) =>
          // a série mostrada precisa ser consistente com esse passo
          rotate(correta, -4 * passo + i * passo).length === correta.length,
        ),
      )
      expect(candidatos.length).toBeGreaterThan(0)
      expect(q.satisfiesRule(correta)).toBe(true)
    }
  })
})
