import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { SUBTIPOS, type Difficulty } from '../taxonomy'
import { SPATIAL_GENERATORS, SPATIAL_GENERATOR_IDS } from './generators'
import { ehRotacaoPura, FORMAS, planejarSerie } from './formas'
import { FAMILIAS, IDS_FAMILIAS, type FamiliaQualquer } from './figuras/index'
import { pistaSemEnunciado } from './pistas'

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

type Gerador = (s: number, d: Difficulty) => ReturnType<(typeof SPATIAL_GENERATORS)[string]>

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
        expect(gerar(seed, nivel).options.length).toBe(5)
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

/**
 * A resposta não pode ser achada sem olhar o enunciado.
 *
 * Regressão do defeito da auditoria: em rotação e reflexão os quatro
 * distratores eram rotações do mesmo espelho, e a resposta era "a única
 * diferente" — 60 de 60 questões aprovadas se resolviam assim, sem ver a
 * figura de cima.
 */
describe('nenhuma pista sem enunciado em rotação e reflexão', () => {
  const ids = SPATIAL_GENERATOR_IDS.filter((id) => /^(rotacao|reflexao)\./.test(id))
  const MUITAS = Array.from({ length: 50 }, (_, i) => i * 7919 + 101)

  it('cobre as duas formas em todas as famílias quirais', () => {
    expect(ids.length).toBe(2 * IDS_FAMILIAS.filter((f) => FAMILIAS[f]?.suportaReflexao).length)
  })

  describe.each(ids)('"%s"', (id) => {
    const gerar = SPATIAL_GENERATORS[id] as Gerador

    it.each(NIVEIS)('nível %i: nenhuma heurística isola a resposta', (nivel) => {
      for (const seed of MUITAS) {
        const q = gerar(seed, nivel)
        const idx = q.options.findIndex((o) => o.id === q.answerId)
        const pista = pistaSemEnunciado(q.classesDasOpcoes, q.classesDoEspelhoDasOpcoes, idx)
        expect(pista, `${id} nível ${nivel} seed ${seed}`).toBeNull()
      }
    })

    it('mistura tipos de distrator: um reflexo da resposta, o resto variantes', () => {
      for (const nivel of NIVEIS) {
        for (const seed of MUITAS.slice(0, 20)) {
          const q = gerar(seed, nivel)
          const idx = q.options.findIndex((o) => o.id === q.answerId)
          const certa = q.classesDasOpcoes[idx]
          const espelhoDaCerta = q.classesDoEspelhoDasOpcoes[idx]
          const distratores = q.classesDasOpcoes.filter((_, i) => i !== idx)
          const msg = `${id} nível ${nivel} seed ${seed}`
          expect(distratores.filter((c) => c === espelhoDaCerta).length, msg).toBe(1)
          expect(distratores.filter((c) => c !== espelhoDaCerta && c !== certa).length, msg).toBe(
            q.options.length - 2,
          )
          // Toda alternativa numa classe de rotação própria.
          expect(new Set(q.classesDasOpcoes).size, msg).toBe(q.options.length)
        }
      }
    })
  })
})

describe('pistaSemEnunciado', () => {
  it('pega o desenho antigo: quatro rotações do espelho e a resposta sozinha', () => {
    expect(pistaSemEnunciado(['R', 'M', 'M', 'M', 'M'], ['M', 'R', 'R', 'R', 'R'], 0)).toBe(
      'classe_unica',
    )
  })

  it('pega a resposta como única da classe menos frequente', () => {
    expect(pistaSemEnunciado(['R', 'M', 'M', 'V', 'V'], ['M', 'R', 'R', 'W', 'W'], 0)).toBe(
      'frequencia',
    )
  })

  it('pega a resposta como o lado isolado do único par quiral presente', () => {
    // R está sozinho e o espelho dele (M) aparece duas vezes; V e X não têm par.
    expect(pistaSemEnunciado(['R', 'M', 'M', 'V', 'X'], ['M', 'R', 'R', 'V2', 'X2'], 0)).toBe(
      'quiralidade',
    )
  })

  it('pega a impressão digital estrutural única', () => {
    // Nenhuma das três primeiras dispara, mas só a resposta é sozinha na
    // classe E sem o espelho entre as alternativas.
    expect(pistaSemEnunciado(['R', 'V', 'W', 'X', 'X'], ['M', 'W', 'V', 'Y', 'Y'], 0)).toBe(
      'impressao_digital',
    )
  })

  it('aceita pares espelhados indistinguíveis', () => {
    expect(pistaSemEnunciado(['R', 'M', 'V', 'W'], ['M', 'R', 'W', 'V'], 0)).toBeNull()
    expect(pistaSemEnunciado(['R', 'M', 'V', 'W', 'X'], ['M', 'R', 'W', 'V', 'Y'], 1)).toBeNull()
  })
})

/**
 * Nenhuma série é rotação pura, em nível nenhum. Regressão da auditoria:
 * "seta para cima, direita, baixo, ?" nos níveis 1 a 3.
 *
 * Confere as FIGURAS desenhadas, não a regra declarada: o plano é recriado com
 * a mesma seed e amarrado à questão pela assinatura da resposta.
 */
describe('séries combinam duas mudanças desde o nível 1', () => {
  const MUITAS = Array.from({ length: 40 }, (_, i) => i * 104729 + 7)

  describe.each(IDS_FAMILIAS)('família "%s"', (idFamilia) => {
    const fam = FAMILIAS[idFamilia] as FamiliaQualquer
    const gerar = SPATIAL_GENERATORS[`serie_formas.${idFamilia}`] as Gerador
    const giros = (f: unknown): string[] =>
      Array.from({ length: fam.passosNoCiclo }, (_, k) => fam.assinatura(fam.rotate(f, k)))

    it.each(NIVEIS)('nível %i: nenhuma série é rotação pura', (nivel) => {
      for (const seed of MUITAS) {
        const plano = planejarSerie(fam, mulberry32(seed), nivel)
        const q = gerar(seed, nivel)
        const msg = `${idFamilia} nível ${nivel} seed ${seed}`
        expect(fam.assinatura(plano.figuras[plano.visiveis]), msg).toBe(q.assinaturasCorretas[0])
        expect(ehRotacaoPura(fam, plano.figuras), msg).toBe(false)
        // Alguma casa não é rotação nenhuma da anterior: o atributo muda de
        // fato no desenho, não só na regra.
        const mudou = plano.figuras.some(
          (f, i) => i > 0 && !giros(plano.figuras[i - 1]).includes(fam.assinatura(f)),
        )
        expect(mudou, msg).toBe(true)
      }
    })
  })

  it('a regra do giro cresce com o nível', () => {
    const fam = FAMILIAS.arcos as FamiliaQualquer
    const planos = (nivel: Difficulty) => MUITAS.slice(0, 20).map((s) => planejarSerie(fam, mulberry32(s), nivel))
    expect(new Set(planos(1).map((p) => p.regra))).toEqual(new Set(['constante']))
    expect(new Set(planos(3).map((p) => p.regra))).toEqual(new Set(['alternada']))
    expect(new Set(planos(4).map((p) => p.regra))).toEqual(new Set(['crescente']))
    expect(planos(5).every((p) => p.atributoLento)).toBe(true)
  })
})

describe('qual não pertence: tipos de intrusa', () => {
  const MUITAS = Array.from({ length: 60 }, (_, i) => i * 6007 + 3)
  const quirais = IDS_FAMILIAS.filter((f) => FAMILIAS[f]?.suportaReflexao)

  /** A intrusa é o espelho das demais? Sai das classes, não da explicação. */
  const ehEspelho = (q: ReturnType<Gerador>): boolean => {
    const idx = q.options.findIndex((o) => o.id === q.answerId)
    const outra = q.classesDasOpcoes.find((_, i) => i !== idx)
    return q.classesDoEspelhoDasOpcoes[idx] === outra
  }

  describe.each(quirais)('família "%s"', (idFamilia) => {
    const gerar = SPATIAL_GENERATORS[`odd_one_out.${idFamilia}`] as Gerador

    it('nos níveis 1 e 2 a intrusa é sempre o reflexo', () => {
      for (const nivel of [1, 2] as Difficulty[]) {
        for (const seed of MUITAS) expect(ehEspelho(gerar(seed, nivel))).toBe(true)
      }
    })

    it('do nível 3 em diante há reflexos e variantes', () => {
      for (const nivel of [3, 4, 5] as Difficulty[]) {
        const tipos = MUITAS.map((s) => ehEspelho(gerar(s, nivel)))
        const msg = `${idFamilia} nível ${nivel}`
        expect(tipos.filter(Boolean).length, msg).toBeGreaterThan(MUITAS.length * 0.2)
        expect(tipos.filter((t) => !t).length, msg).toBeGreaterThan(MUITAS.length * 0.2)
      }
    })

    it('a explicação descreve o tipo de intrusa que a questão tem', () => {
      for (const nivel of NIVEIS) {
        for (const seed of MUITAS.slice(0, 20)) {
          const q = gerar(seed, nivel)
          expect(q.explanation.en.includes('mirror image'), `${idFamilia} ${nivel} ${seed}`).toBe(ehEspelho(q))
        }
      }
    })
  })

  it('no mostrador, do nível 3 em diante, as iguais usam giros de 45°', () => {
    const gerar = SPATIAL_GENERATORS['odd_one_out.raios'] as Gerador
    // A assinatura do mostrador é um valor por casa: girar é deslocar a string.
    const girar = (a: string, k: number) => a.slice(a.length - k) + a.slice(0, a.length - k)
    for (const nivel of [3, 4, 5] as Difficulty[]) {
      for (const seed of MUITAS) {
        const q = gerar(seed, nivel)
        const iguais = q.assinaturasDasOpcoes.filter((_, i) => q.options[i]?.id !== q.answerId)
        // Todas as iguais contra todas: algum par está a um número ímpar de casas.
        const impar = iguais.some((a) =>
          iguais.some((b) => [1, 3, 5, 7].some((k) => girar(a, k) === b)),
        )
        expect(impar, `seed ${seed} nível ${nivel}`).toBe(true)
      }
    }
  })
})
