import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import {
  ANALOGY_PAIRS,
  LOGIC_TERMS,
  RELATIONS,
  RELATION_LABEL,
  SENTENCE_FRAMES,
  VOCAB,
  VOCAB_BY_WORD,
  pairsOfRelation,
} from './lexicon'

/**
 * O gerador é provadamente correto DADO o léxico. Então o risco todo migrou
 * para cá: um verbete errado vira dezenas de questões erradas. Estes testes
 * são a auditoria automática do léxico.
 */

describe('VOCAB — integridade', () => {
  it('não repete palavra-chave', () => {
    const palavras = VOCAB.map((e) => e.word)
    expect(new Set(palavras).size).toBe(palavras.length)
  })

  it('nenhuma palavra é sinônimo E antônimo do mesmo verbete', () => {
    for (const e of VOCAB) {
      const colisao = e.synonyms.filter((s) => e.antonyms.includes(s))
      expect(colisao, `${e.word}: "${colisao.join(', ')}" está nos dois lados`).toHaveLength(0)
    }
  })

  it('nenhum verbete lista a si mesmo como sinônimo ou antônimo', () => {
    for (const e of VOCAB) {
      expect(e.synonyms).not.toContain(e.word)
      expect(e.antonyms).not.toContain(e.word)
    }
  })

  it('todo verbete tem pelo menos 2 sinônimos e 2 antônimos', () => {
    for (const e of VOCAB) {
      expect(e.synonyms.length, `${e.word}`).toBeGreaterThanOrEqual(2)
      expect(e.antonyms.length, `${e.word}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('não repete a mesma palavra dentro da lista de sinônimos ou antônimos', () => {
    for (const e of VOCAB) {
      expect(new Set(e.synonyms).size).toBe(e.synonyms.length)
      expect(new Set(e.antonyms).size).toBe(e.antonyms.length)
    }
  })

  it('é consistente entre verbetes: se B é antônimo de A e B é verbete, A não é sinônimo de B', () => {
    for (const e of VOCAB) {
      for (const ant of e.antonyms) {
        const outro = VOCAB_BY_WORD.get(ant)
        if (!outro) continue
        expect(
          outro.synonyms,
          `"${ant}" é antônimo de "${e.word}", mas lista "${e.word}" como sinônimo`,
        ).not.toContain(e.word)
      }
    }
  })

  it('verbetes ligados por antonímia estão no mesmo cluster', () => {
    for (const e of VOCAB) {
      for (const ant of e.antonyms) {
        const outro = VOCAB_BY_WORD.get(ant)
        if (!outro) continue
        expect(
          outro.cluster,
          `"${e.word}" e seu antônimo "${ant}" estão em clusters diferentes — ` +
            `um viraria distrator do outro`,
        ).toBe(e.cluster)
      }
    }
  })

  it('cada nível tem pelo menos 8 verbetes', () => {
    for (const d of DIFFICULTIES) {
      const n = VOCAB.filter((e) => e.level === d).length
      expect(n, `nível ${d}`).toBeGreaterThanOrEqual(8)
    }
  })

  it('cada cluster tem verbetes suficientes fora dele para sortear distratores', () => {
    for (const e of VOCAB) {
      const foraDoCluster = VOCAB.filter((o) => o.cluster !== e.cluster)
      expect(foraDoCluster.length, `${e.word} (${e.cluster})`).toBeGreaterThanOrEqual(10)
    }
  })

  it('está tudo em inglês (a CCAT é aplicada em inglês)', () => {
    const acentuado = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/
    for (const e of VOCAB) {
      for (const w of [e.word, ...e.synonyms, ...e.antonyms]) {
        expect(acentuado.test(w), `"${w}" parece português`).toBe(false)
      }
    }
  })
})

describe('ANALOGY_PAIRS — integridade', () => {
  it('não repete par', () => {
    const chaves = ANALOGY_PAIRS.map((p) => `${p.a}:${p.b}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('toda relação tem pelo menos 4 pares (1 enunciado + 1 resposta + folga)', () => {
    for (const r of RELATIONS) {
      expect(pairsOfRelation(r).length, `relação ${r}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('toda relação tem rótulo em português para a explicação', () => {
    for (const r of RELATIONS) {
      expect(RELATION_LABEL[r], `relação ${r} sem rótulo`).toBeTruthy()
    }
  })

  it('não há rótulo órfão apontando para relação inexistente', () => {
    for (const r of Object.keys(RELATION_LABEL)) {
      expect(RELATIONS, `rótulo "${r}" não tem pares`).toContain(r)
    }
  })

  it('nenhum par tem os dois lados iguais', () => {
    for (const p of ANALOGY_PAIRS) expect(p.a).not.toBe(p.b)
  })

  /**
   * Este é o teste que protege o gabarito: se a mesma palavra aparece como
   * lado A em duas relações diferentes, um distrator de outra relação pode
   * satisfazer a relação do enunciado e virar segunda resposta certa.
   */
  it('nenhuma palavra encabeça pares de relações diferentes', () => {
    const porPalavra = new Map<string, Set<string>>()
    for (const p of ANALOGY_PAIRS) {
      porPalavra.set(p.a, (porPalavra.get(p.a) ?? new Set()).add(p.relation))
    }
    for (const [palavra, relacoes] of porPalavra) {
      expect(
        relacoes.size,
        `"${palavra}" encabeça as relações ${[...relacoes].join(' e ')}`,
      ).toBe(1)
    }
  })

  it('está tudo em inglês', () => {
    const acentuado = /[áàâãéêíóôõúüç]/i
    for (const p of ANALOGY_PAIRS) {
      expect(acentuado.test(p.a) || acentuado.test(p.b), `${p.a}:${p.b}`).toBe(false)
    }
  })
})

describe('SENTENCE_FRAMES — integridade', () => {
  it('toda frase tem exatamente uma lacuna', () => {
    for (const f of SENTENCE_FRAMES) {
      expect((f.frame.match(/___/g) ?? []).length, f.frame).toBe(1)
    }
  })

  it('a resposta não aparece na própria frase', () => {
    for (const f of SENTENCE_FRAMES) {
      expect(f.frame.toLowerCase()).not.toContain(f.answer.toLowerCase())
    }
  })

  it('tem pelo menos 4 distratores, sem repetir e sem incluir a resposta', () => {
    for (const f of SENTENCE_FRAMES) {
      expect(f.distractors.length, f.frame).toBeGreaterThanOrEqual(4)
      expect(new Set(f.distractors).size).toBe(f.distractors.length)
      expect(f.distractors).not.toContain(f.answer)
    }
  })

  it('toda frase tem justificativa em português', () => {
    for (const f of SENTENCE_FRAMES) {
      expect(f.rationale.pt.length, f.frame).toBeGreaterThan(40)
      expect(f.rationale.en.length, f.frame).toBeGreaterThan(40)
    }
  })

  it('não repete frase', () => {
    const frases = SENTENCE_FRAMES.map((f) => f.frame)
    expect(new Set(frases).size).toBe(frases.length)
  })
})

describe('LOGIC_TERMS — integridade', () => {
  it('todo trio tem 3 termos distintos', () => {
    for (const trio of [...LOGIC_TERMS.concretos, ...LOGIC_TERMS.inventados]) {
      expect(trio).toHaveLength(3)
      expect(new Set(trio).size).toBe(3)
    }
  })

  it('não repete trio entre concretos e inventados', () => {
    const todos = [...LOGIC_TERMS.concretos, ...LOGIC_TERMS.inventados].map((t) => t.join('|'))
    expect(new Set(todos).size).toBe(todos.length)
  })
})
