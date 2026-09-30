import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { DIFFICULTIES, OPCOES_POR_QUESTAO } from '../taxonomy'
import { ANALOGY_PAIRS, VOCAB, VOCAB_BY_WORD, forbiddenFor } from './lexicon'
import { GRAFIA_PARECIDA, LACUNAS_CURADAS, gerarAnalogiaLacuna } from './lacuna'

const SEEDS = 200
const CURADAS = new Set(LACUNAS_CURADAS.map((l) => l.c))

/** Lê "A is to B as C is to:". */
function lerStem(stem: string) {
  const m = stem.match(/^(\S+) is to (\S+) as (\S+) is to:$/)!
  return { a: m[1]!.toLowerCase(), b: m[2]!.toLowerCase(), c: m[3]!.toLowerCase() }
}

describe('LACUNAS_CURADAS — integridade', () => {
  it('toda palavra C encabeça exatamente um par do léxico', () => {
    for (const l of LACUNAS_CURADAS) {
      expect(ANALOGY_PAIRS.filter((p) => p.a === l.c).length, l.c).toBe(1)
    }
  })

  it('nenhum distrator é resposta: não forma par com C em relação nenhuma do léxico', () => {
    for (const l of LACUNAS_CURADAS) {
      const respostas = ANALOGY_PAIRS.filter((p) => p.a === l.c).map((p) => p.b)
      for (const d of l.distratores) expect(respostas, `${l.c} → ${d}`).not.toContain(d)
    }
  })

  it('pelo menos 4 distratores distintos, em minúsculas, sem repetir C', () => {
    for (const l of LACUNAS_CURADAS) {
      expect(l.distratores.length, l.c).toBeGreaterThanOrEqual(OPCOES_POR_QUESTAO - 1)
      expect(new Set(l.distratores).size, l.c).toBe(l.distratores.length)
      for (const d of l.distratores) {
        expect(d, l.c).toMatch(/^[a-z-]+$/)
        expect(d).not.toBe(l.c)
      }
    }
  })

  it('cada nível tem pelo menos 10 palavras curadas', () => {
    for (const d of DIFFICULTIES) {
      const n = LACUNAS_CURADAS.filter((l) => ANALOGY_PAIRS.find((p) => p.a === l.c)!.level === d).length
      expect(n, `nível ${d}`).toBeGreaterThanOrEqual(10)
    }
  })

  it('nenhuma palavra curada é verbete do vocabulário (as duas fontes não se confundem)', () => {
    for (const l of LACUNAS_CURADAS) expect(VOCAB_BY_WORD.has(l.c), l.c).toBe(false)
  })

  it('filhote com sufixo -let nunca é resposta de lacuna', () => {
    for (const l of LACUNAS_CURADAS) {
      expect(ANALOGY_PAIRS.find((p) => p.a === l.c)!.b.endsWith('let'), l.c).toBe(false)
    }
  })
})

describe('GRAFIA_PARECIDA — integridade', () => {
  it('só verbetes reais, e nenhuma palavra parecida é sinônimo ou antônimo do verbete', () => {
    for (const [palavra, parecidas] of Object.entries(GRAFIA_PARECIDA)) {
      const e = VOCAB_BY_WORD.get(palavra)
      expect(e, palavra).toBeDefined()
      for (const p of parecidas) {
        expect(forbiddenFor(e!).has(p), `${palavra} × ${p}`).toBe(false)
        // nem de outro verbete do mesmo cluster, onde viraria resposta defensável
        const dono = VOCAB.find((o) => o.synonyms.includes(p) || o.antonyms.includes(p))
        if (dono) expect(dono.cluster, `${palavra} × ${p}`).not.toBe(e!.cluster)
      }
    }
  })
})

describe('analogia_lacuna — gerador', () => {
  it('o gabarito não aparece no enunciado e toda alternativa é uma palavra só', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarAnalogiaLacuna(seed, d)
        const { a, b, c } = lerStem(q.stem)
        for (const o of q.options) {
          expect(o.text, q.stem).toMatch(/^[a-z-]+$/)
          expect([a, b, c], `${q.stem} → ${o.text}`).not.toContain(o.text)
        }
      }
    }
  })

  it('relação conceitual: o par do enunciado e o par da resposta são da mesma relação', () => {
    let conferidas = 0
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarAnalogiaLacuna(seed, d)
        const { a, b, c } = lerStem(q.stem)
        if (!CURADAS.has(c)) continue
        const base = ANALOGY_PAIRS.find((p) => p.a === a && p.b === b)!
        const certa = q.options.find((o) => o.id === q.answerId)!.text
        const alvo = ANALOGY_PAIRS.find((p) => p.a === c && p.b === certa)
        expect(alvo?.relation, q.stem).toBe(base.relation)
        conferidas++
      }
    }
    expect(conferidas).toBeGreaterThan(300)
  })

  it('sinônimo/antônimo: a relação invertida está sempre entre as alternativas', () => {
    let conferidas = 0
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarAnalogiaLacuna(seed, d)
        const { a, b, c } = lerStem(q.stem)
        if (CURADAS.has(c)) continue
        const base = VOCAB_BY_WORD.get(a)!
        const entry = VOCAB_BY_WORD.get(c)!
        const sinonimo = base.synonyms.includes(b)
        const certa = q.options.find((o) => o.id === q.answerId)!.text
        expect(sinonimo ? entry.synonyms : entry.antonyms, q.stem).toContain(certa)
        const invertidas = sinonimo ? entry.antonyms : entry.synonyms
        expect(q.options.some((o) => invertidas.includes(o.text)), q.stem).toBe(true)
        conferidas++
      }
    }
    expect(conferidas).toBeGreaterThan(300)
  })

  it('palavras de grafia parecida aparecem como armadilha', () => {
    const todas = new Set([...Object.values(GRAFIA_PARECIDA).flat()])
    let com = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      if (gerarAnalogiaLacuna(seed, 2).options.some((o) => todas.has(o.text))) com++
    }
    expect(com).toBeGreaterThan(5)
  })

  it('muitas seeds × níveis passam por runGates', () => {
    const drafts = DIFFICULTIES.flatMap((d) =>
      Array.from({ length: 40 }, (_, i) =>
        buildQuestion('analogia_lacuna', i + 1, d, '2026-09-30T12:00:00.000Z'),
      ),
    )
    const r = runGates(drafts)
    const outros = r.rejected.filter((x) => x.violations.some((v) => v.gate !== 'G4_dedup'))
    expect(outros.map((x) => x.violations)).toEqual([])
    expect(r.approved.length).toBe(new Set(drafts.map((q) => q.stem)).size)
    for (const q of r.approved) expect(q.subtipo).toBe('analogia_lacuna')
  })
})
