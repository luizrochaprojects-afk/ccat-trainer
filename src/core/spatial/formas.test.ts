import { describe, expect, it } from 'vitest'
import { SUBTIPOS, type Difficulty } from '../taxonomy'
import { SPATIAL_GENERATORS, SPATIAL_GENERATOR_IDS } from './generators'
import { FORMAS } from './formas'
import { IDS_FAMILIAS } from './figuras/index'

/**
 * Invariantes de toda questão espacial, verificadas em massa sobre cada
 * combinação forma × família.
 *
 * O que estes testes provam é que a questão está CORRETA. Que ela seja
 * RESPONDÍVEL — que as alternativas se distingam a olho — é responsabilidade
 * dos testes exaustivos por família, que garantem que assinaturas diferentes
 * produzem desenhos diferentes. Separar as duas perguntas é a lição das
 * questões que estavam corretas e ninguém conseguia responder.
 */

const NIVEIS: Difficulty[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 24 }, (_, i) => i * 977 + 13)

describe('registro de geradores espaciais', () => {
  it('cobre o produto forma × família permitido pela compatibilidade', () => {
    // 4 formas livres × 5 famílias + 2 formas quirais × 4 famílias quirais.
    expect(SPATIAL_GENERATOR_IDS.length).toBe(4 * 5 + 2 * 4)
  })

  it('nomeia cada gerador como forma.familia', () => {
    for (const id of SPATIAL_GENERATOR_IDS) {
      const [forma, familia] = id.split('.')
      expect(Object.keys(FORMAS)).toContain(forma)
      expect(IDS_FAMILIAS).toContain(familia)
    }
  })

  it('não registra rotação nem reflexão sobre a família aquiral', () => {
    // `atributos` é aquiral: ali o espelho sempre coincide com alguma rotação,
    // e a questão teria duas respostas certas. Foi o bug reportado.
    expect(SPATIAL_GENERATOR_IDS).not.toContain('rotacao.atributos')
    expect(SPATIAL_GENERATOR_IDS).not.toContain('reflexao.atributos')
  })

  it('cada forma aparece em pelo menos uma família', () => {
    for (const forma of Object.keys(FORMAS)) {
      expect(SPATIAL_GENERATOR_IDS.some((id) => id.startsWith(`${forma}.`))).toBe(true)
    }
  })
})

describe.each(SPATIAL_GENERATOR_IDS)('gerador "%s"', (id) => {
  const gerar = SPATIAL_GENERATORS[id] as (s: number, d: Difficulty) => ReturnType<
    (typeof SPATIAL_GENERATORS)[string]
  >

  it('é determinístico pela seed', () => {
    for (const nivel of NIVEIS) {
      for (const seed of SEEDS.slice(0, 8)) {
        expect(JSON.stringify(gerar(seed, nivel))).toBe(JSON.stringify(gerar(seed, nivel)))
      }
    }
  })

  it('tem exatamente uma alternativa que satisfaz a regra', () => {
    for (const nivel of NIVEIS) {
      for (const seed of SEEDS) {
        const q = gerar(seed, nivel)
        const corretas = new Set(q.assinaturasCorretas)
        const quantas = q.assinaturasDasOpcoes.filter((a) => corretas.has(a)).length
        expect(quantas, `${id} nível ${nivel} seed ${seed}`).toBe(1)
      }
    }
  })

  it('o answerId aponta para a alternativa que satisfaz a regra', () => {
    for (const nivel of NIVEIS) {
      for (const seed of SEEDS) {
        const q = gerar(seed, nivel)
        const idx = q.options.findIndex((o) => o.id === q.answerId)
        expect(idx, `${id} nível ${nivel} seed ${seed}`).toBeGreaterThanOrEqual(0)
        expect(q.assinaturasCorretas).toContain(q.assinaturasDasOpcoes[idx])
      }
    }
  })

  it('nenhuma alternativa repete o desenho de outra', () => {
    for (const nivel of NIVEIS) {
      for (const seed of SEEDS) {
        const q = gerar(seed, nivel)
        const assinaturas = new Set(q.assinaturasDasOpcoes)
        expect(assinaturas.size, `${id} nível ${nivel} seed ${seed}`).toBe(q.options.length)

        const desenhos = new Set(q.options.map((o) => JSON.stringify(o.spatial)))
        expect(desenhos.size, `${id} nível ${nivel} seed ${seed}`).toBe(q.options.length)
      }
    }
  })

  it('tem 4 alternativas nos níveis fáceis e 5 nos difíceis', () => {
    for (const nivel of NIVEIS) {
      for (const seed of SEEDS.slice(0, 6)) {
        expect(gerar(seed, nivel).options.length).toBe(nivel <= 2 ? 4 : 5)
      }
    }
  })

  it('declara subtipo e família coerentes com o próprio id', () => {
    const [forma, familia] = id.split('.')
    for (const nivel of NIVEIS) {
      const q = gerar(SEEDS[0] as number, nivel)
      expect(q.subtipo).toBe(forma)
      expect(q.familia).toBe(familia)
      expect(SUBTIPOS.spatial as readonly string[]).toContain(q.subtipo)
    }
  })

  it('traz enunciado em inglês e explicação nos dois idiomas', () => {
    for (const nivel of NIVEIS) {
      const q = gerar(SEEDS[1] as number, nivel)
      expect(q.stem.length).toBeGreaterThan(10)
      // O enunciado é aplicado em inglês; acento seria sinal de vazamento do PT.
      expect(q.stem).not.toMatch(/[áàâãéêíóôõúç]/i)
      expect(q.explanation.en.length).toBeGreaterThan(20)
      expect(q.explanation.pt.length).toBeGreaterThan(20)
    }
  })

  it('desenha o enunciado quando a forma depende dele', () => {
    const forma = id.split('.')[0]
    const precisaDeFigura = forma !== 'odd_one_out'
    for (const nivel of NIVEIS) {
      const q = gerar(SEEDS[2] as number, nivel)
      expect(Boolean(q.stemSpatial), `${id} nível ${nivel}`).toBe(precisaDeFigura)
    }
  })

  it('produz questões variadas entre seeds diferentes', () => {
    for (const nivel of NIVEIS) {
      const chaves = new Set(SEEDS.map((s) => gerar(s, nivel).assinaturasDasOpcoes.join('#')))
      // Um gerador que devolvesse quase sempre a mesma questão passaria em todos
      // os testes acima e ainda assim seria inútil para treinar.
      expect(chaves.size, `${id} nível ${nivel}`).toBeGreaterThan(SEEDS.length * 0.6)
    }
  })
})
