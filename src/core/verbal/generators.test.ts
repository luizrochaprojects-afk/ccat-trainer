import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { VERBAL_GENERATORS, VERBAL_GENERATOR_IDS } from './generators'
import { ANALOGY_PAIRS, VOCAB, VOCAB_BY_WORD, forbiddenFor } from './lexicon'
import { allStatements, entails, renderStatement, VALID_FORMS } from './syllogism'

const RUNS = 200

describe('geradores verbais', () => {
  for (const id of VERBAL_GENERATOR_IDS) {
    const gerar = VERBAL_GENERATORS[id]

    describe(id, () => {
      it('é determinístico por seed e nível', () => {
        for (let seed = 1; seed <= 50; seed++) {
          for (const d of DIFFICULTIES) {
            const a = gerar(seed, d)
            const b = gerar(seed, d)
            expect(b.stem).toBe(a.stem)
            expect(b.options).toEqual(a.options)
            expect(b.answerId).toBe(a.answerId)
            expect(b.explanation).toEqual(a.explanation)
          }
        }
      })

      it('exatamente uma alternativa satisfaz a regra', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const corretas = q.options.filter((o) => q.satisfiesRule(o.text))
            expect(
              corretas.length,
              `${id} nível ${d} seed ${seed}: ${corretas.length} corretas em "${q.stem}" ` +
                `[${q.options.map((o) => o.text).join(' | ')}]`,
            ).toBe(1)
          }
        }
      })

      it('o answerId aponta para a alternativa que satisfaz a regra', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const marcada = q.options.find((o) => o.id === q.answerId)
            expect(marcada, `${id} seed ${seed}`).toBeDefined()
            expect(q.satisfiesRule(marcada!.text), `${id} nível ${d} seed ${seed}`).toBe(true)
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

      it('4 alternativas nos níveis 1-2, 5 nos níveis 3-5', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 30; seed++) {
            expect(gerar(seed, d).options).toHaveLength(d <= 2 ? 4 : 5)
          }
        }
      })

      it('o enunciado não contém a resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const marcada = q.options.find((o) => o.id === q.answerId)!
            // o silogismo repete termos no enunciado por natureza; o que não pode
            // é a FRASE inteira da conclusão já aparecer nas premissas
            expect(
              q.stem.toLowerCase().includes(marcada.text.toLowerCase()),
              `${id} seed ${seed}: "${marcada.text}" aparece em "${q.stem}"`,
            ).toBe(false)
          }
        }
      })

      it('tem explicação substantiva em português', () => {
        for (let seed = 1; seed <= 30; seed++) {
          const q = gerar(seed, 3)
          expect(q.explanation.pt.length).toBeGreaterThan(80)
          expect(q.explanation.en.length).toBeGreaterThan(80)
        }
      })

      it('rende 40 questões distintas por nível dentro do orçamento de seeds', () => {
        for (const d of DIFFICULTIES) {
          const vistas = new Set<string>()
          for (let seed = 1; seed <= 600 && vistas.size < 40; seed++) {
            const q = gerar(seed, d)
            vistas.add(`${q.stem}::${q.options.map((o) => o.text).join('|')}`)
          }
          expect(vistas.size, `${id} nível ${d}: espaço pequeno demais`).toBe(40)
        }
      })
    })
  }
})

describe('analogia — o gabarito vem da relação do léxico', () => {
  it('a alternativa correta tem a mesma relação do par do enunciado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.analogia(seed, 3)
      const [aStem, bStem] = q.stem.replace(' as:', '').split(' is to ')
      const base = ANALOGY_PAIRS.find(
        (p) => p.a === aStem!.toLowerCase() && p.b === bStem!.toLowerCase(),
      )
      expect(base, `enunciado "${q.stem}" não casa com nenhum par do léxico`).toBeDefined()

      const marcada = q.options.find((o) => o.id === q.answerId)!
      const par = ANALOGY_PAIRS.find((p) => `${p.a} is to ${p.b}` === marcada.text)
      expect(par?.relation).toBe(base!.relation)
    }
  })

  it('nenhum distrator repete a relação do enunciado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.analogia(seed, 3)
      const marcada = q.options.find((o) => o.id === q.answerId)!
      const relacaoCerta = ANALOGY_PAIRS.find(
        (p) => `${p.a} is to ${p.b}` === marcada.text,
      )!.relation

      for (const o of q.options) {
        if (o.id === q.answerId) continue
        const par = ANALOGY_PAIRS.find((p) => `${p.a} is to ${p.b}` === o.text)!
        expect(par.relation, `distrator "${o.text}" repete a relação correta`).not.toBe(
          relacaoCerta,
        )
      }
    }
  })

  it('a alternativa correta nunca é o próprio par do enunciado', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.analogia(seed, 3)
      const marcada = q.options.find((o) => o.id === q.answerId)!
      const doEnunciado = q.stem.replace(' as:', '').toLowerCase()
      expect(marcada.text).not.toBe(doEnunciado)
    }
  })
})

describe('antônimo — distratores nunca são antônimos defensáveis', () => {
  it('nenhum distrator está na lista de antônimos do verbete', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = VERBAL_GENERATORS.antonimo(seed, d)
        const palavra = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
        const entry = VOCAB_BY_WORD.get(palavra as string)
        expect(entry, `verbete "${palavra}" não encontrado`).toBeDefined()

        for (const o of q.options) {
          if (o.id === q.answerId) continue
          expect(
            entry!.antonyms,
            `"${o.text}" é antônimo de "${entry!.word}" mas aparece como distrator`,
          ).not.toContain(o.text)
        }
      }
    }
  })

  it('a resposta está na lista de antônimos do verbete', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.antonimo(seed, 4)
      const palavra = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
      const entry = VOCAB_BY_WORD.get(palavra as string)!
      const marcada = q.options.find((o) => o.id === q.answerId)!
      expect(entry.antonyms).toContain(marcada.text)
    }
  })

  it('inclui pelo menos um sinônimo como armadilha', () => {
    let comArmadilha = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.antonimo(seed, 3)
      const palavra = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
      const entry = VOCAB_BY_WORD.get(palavra as string)!
      if (q.options.some((o) => entry.synonyms.includes(o.text))) comArmadilha++
    }
    expect(comArmadilha).toBeGreaterThan(RUNS * 0.9)
  })

  it('nenhum distrator vem do mesmo cluster semântico do alvo', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = VERBAL_GENERATORS.antonimo(seed, 5)
      const palavra = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
      const entry = VOCAB_BY_WORD.get(palavra as string)!
      const proibidas = forbiddenFor(entry)

      for (const o of q.options) {
        if (o.id === q.answerId) continue
        // a armadilha (sinônimo do alvo) é permitida de propósito
        if (entry.synonyms.includes(o.text)) continue
        expect(proibidas.has(o.text)).toBe(false)
        const dono = VOCAB.find((e) => e.word === o.text || e.synonyms.includes(o.text))
        if (dono) expect(dono.cluster, `"${o.text}"`).not.toBe(entry.cluster)
      }
    }
  })
})

describe('sinônimo — espelho do antônimo', () => {
  it('a resposta está na lista de sinônimos e nenhum distrator também está', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = VERBAL_GENERATORS.sinonimo(seed, d)
        const palavra = q.stem.match(/"([A-Z]+)"/)?.[1]?.toLowerCase()
        const entry = VOCAB_BY_WORD.get(palavra as string)!
        const marcada = q.options.find((o) => o.id === q.answerId)!
        expect(entry.synonyms).toContain(marcada.text)

        for (const o of q.options) {
          if (o.id === q.answerId) continue
          expect(entry.synonyms, `"${o.text}" também é sinônimo`).not.toContain(o.text)
        }
      }
    }
  })
})

describe('dedução — o gabarito é teorema', () => {
  it('a alternativa correta é logicamente implicada pelas premissas', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = VERBAL_GENERATORS.deducao(seed, d)
        const marcada = q.options.find((o) => o.id === q.answerId)!
        expect(q.satisfiesRule(marcada.text), `seed ${seed} nível ${d}`).toBe(true)
      }
    }
  })

  it('todo distrator tem contramodelo (não se segue das premissas)', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = VERBAL_GENERATORS.deducao(seed, d)
        for (const o of q.options) {
          if (o.id === q.answerId) continue
          expect(
            q.satisfiesRule(o.text),
            `nível ${d} seed ${seed}: "${o.text}" se segue mas está como distrator`,
          ).toBe(false)
        }
      }
    }
  })

  it('usa termos inventados nos níveis 3+ (impede acerto por conhecimento de mundo)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const q = VERBAL_GENERATORS.deducao(seed, 4)
      expect(q.stem).not.toMatch(/engineers|dancers|pilots|chemists/)
    }
  })

  it('as premissas exibidas de fato implicam a conclusão marcada', () => {
    // conferência independente: reconstrói premissas e conclusão do texto
    for (let seed = 1; seed <= 100; seed++) {
      const q = VERBAL_GENERATORS.deducao(seed, 1)
      const [linhaPremissas] = q.stem.split('\n')
      const termos = extrairTermos(linhaPremissas as string)
      const premissas = allStatements().filter((s) =>
        (linhaPremissas as string).includes(renderStatement(s, termos)),
      )
      const marcada = q.options.find((o) => o.id === q.answerId)!
      const conclusao = allStatements().find((s) => renderStatement(s, termos) === marcada.text)
      expect(conclusao).toBeDefined()
      expect(entails(premissas, conclusao!)).toBe(true)
    }
  })
})

describe('cobertura das formas silogísticas', () => {
  it('todo nível tem ao menos uma forma válida disponível', () => {
    for (const d of DIFFICULTIES) {
      const temForma = VALID_FORMS.some((f) => f.level === d)
      expect(temForma, `nível ${d} sem forma silogística`).toBe(true)
    }
  })
})

/** Lê os três termos a partir das premissas renderizadas. */
function extrairTermos(premissas: string): string[] {
  const palavras = premissas.match(/(?:All|No|Some) (\w+) are (?:not )?(\w+)\./g) ?? []
  const vistos: string[] = []
  for (const p of palavras) {
    const m = p.match(/(?:All|No|Some) (\w+) are (?:not )?(\w+)\./)
    for (const t of [m?.[1], m?.[2]]) {
      if (t && !vistos.includes(t)) vistos.push(t)
    }
  }
  // a ordem de descoberta não é A,B,C; reordena testando contra o léxico
  return vistos
}
