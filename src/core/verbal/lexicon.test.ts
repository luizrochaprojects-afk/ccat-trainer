import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import {
  ANALOGY_PAIRS,
  LOGIC_TERMS,
  CONFUSABLE_RELATIONS,
  RELATIONS,
  RELATION_FAMILY,
  RELATION_LABEL,
  SENTENCE_FRAMES,
  VOCAB,
  VOCAB_BY_WORD,
  VOCAB_NEIGHBORS,
  pairsOfRelation,
  type VocabEntry,
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

  it('cada nível tem pelo menos 20 verbetes por subtipo', () => {
    // o banco consome ~10 por (subtipo × nível); 20 dá folga para não repetir
    for (const d of DIFFICULTIES) {
      for (const subtipo of ['sinonimo', 'antonimo'] as const) {
        const n = VOCAB.filter((e) => e.level === d && e.subtipo === subtipo).length
        expect(n, `nível ${d} ${subtipo}`).toBeGreaterThanOrEqual(20)
      }
    }
  })

  /**
   * Um enunciado que aparece como alternativa em outra questão entrega a
   * resposta: ver "CANDID → frank" numa e "candid" como armadilha de outro
   * verbete é meio caminho andado. Enunciado só é enunciado.
   */
  it('nenhuma palavra-chave aparece nas listas de outro verbete', () => {
    const chaves = new Set(VOCAB.map((e) => e.word))
    for (const e of VOCAB) {
      for (const w of [...e.synonyms, ...e.antonyms]) {
        expect(chaves.has(w), `"${w}" é palavra-chave e aparece nas listas de "${e.word}"`).toBe(
          false,
        )
      }
    }
  })

  /**
   * O cluster só protege se for fechado: uma palavra listada em dois verbetes de
   * clusters diferentes é uma ponte por onde um distrator vira segunda resposta.
   */
  it('palavra repetida entre verbetes fica no mesmo cluster e na mesma classe', () => {
    const dono = new Map<string, VocabEntry>()
    for (const e of VOCAB) {
      for (const w of [e.word, ...e.synonyms, ...e.antonyms]) {
        const outro = dono.get(w)
        if (outro) {
          expect(e.cluster, `"${w}" em ${outro.word} (${outro.cluster}) e ${e.word}`).toBe(
            outro.cluster,
          )
          expect(e.pos, `"${w}" em ${outro.word} e ${e.word}`).toBe(outro.pos)
        } else dono.set(w, e)
      }
    }
  })

  it('VOCAB_NEIGHBORS liga palavras-chave reais de clusters diferentes', () => {
    for (const [x, y, porque] of VOCAB_NEIGHBORS) {
      const ex = VOCAB_BY_WORD.get(x)
      const ey = VOCAB_BY_WORD.get(y)
      expect(ex, `vizinho "${x}" não é verbete`).toBeDefined()
      expect(ey, `vizinho "${y}" não é verbete`).toBeDefined()
      // mesmo cluster já não se encontra; o par seria letra morta
      expect(ex!.cluster, `${x} × ${y}`).not.toBe(ey!.cluster)
      expect(porque.length, `${x} × ${y} sem justificativa`).toBeGreaterThan(3)
    }
  })

  it('polaridade coerente entre verbetes que compartilham palavras', () => {
    // se X lista w como sinônimo e Y lista w como antônimo, X e Y são opostos —
    // então nenhum sinônimo de X pode ser também sinônimo de Y
    for (const x of VOCAB) {
      for (const y of VOCAB) {
        if (x === y || !x.synonyms.some((w) => y.antonyms.includes(w))) continue
        const conflito = x.synonyms.filter((w) => y.synonyms.includes(w))
        expect(conflito, `${x.word} × ${y.word}`).toHaveLength(0)
      }
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

  it('toda relação tem família, e toda família tem mais de uma relação', () => {
    for (const r of RELATIONS) expect(RELATION_FAMILY[r], `relação ${r} sem família`).toBeTruthy()
    const porFamilia = new Map<string, number>()
    for (const r of RELATIONS) {
      const f = RELATION_FAMILY[r] as string
      porFamilia.set(f, (porFamilia.get(f) ?? 0) + 1)
    }
    for (const [f, n] of porFamilia) expect(n, `família ${f}`).toBeGreaterThanOrEqual(2)
  })

  it('relações confundíveis apontam para relações que existem', () => {
    for (const [x, y] of CONFUSABLE_RELATIONS) {
      expect(RELATIONS).toContain(x)
      expect(RELATIONS).toContain(y)
    }
  })

  it('toda relação tem pelo menos dois pares no nível 1 (gabarito sem subir de nível)', () => {
    for (const r of RELATIONS) {
      const n = pairsOfRelation(r).filter((p) => p.level === 1).length
      expect(n, `relação ${r}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('cada nível tem pares-enunciado suficientes', () => {
    for (const d of DIFFICULTIES) {
      const n = ANALOGY_PAIRS.filter((p) => p.level === d).length
      expect(n, `nível ${d}`).toBeGreaterThanOrEqual(30)
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

  it('nenhuma lacuna vem depois de "a"/"an" (o artigo entregaria a inicial)', () => {
    for (const f of SENTENCE_FRAMES) {
      expect(f.frame, f.frame).not.toMatch(/\ban? ___/i)
    }
  })

  it('distratores não repetem a resposta com outra caixa ou espaço', () => {
    for (const f of SENTENCE_FRAMES) {
      const norm = (w: string) => w.trim().toLowerCase()
      expect(f.distractors.map(norm), f.frame).not.toContain(norm(f.answer))
    }
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
