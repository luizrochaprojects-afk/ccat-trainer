import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../taxonomy'
import { LOGIC_TERMS, SENTENCE_FRAMES, VOCAB } from './lexicon'

/**
 * Regressão: deixei um termo "analysts2" no pool de silogismos — resíduo de
 * autoria que teria virado questão de verdade ("All geologists are analysts2").
 * Nenhum teste anterior pegava, porque estruturalmente era um trio válido.
 *
 * Léxico é conteúdo escrito à mão; erro de digitação aqui vira dezenas de
 * questões com cara de bug. Estes testes varrem o resíduo típico.
 */
describe('léxico — sem resíduo de autoria', () => {
  it('nenhum termo de silogismo contém dígito', () => {
    for (const trio of [...LOGIC_TERMS.concretos, ...LOGIC_TERMS.inventados]) {
      for (const t of trio) expect(t, `"${t}" parece placeholder`).not.toMatch(/\d/)
    }
  })

  it('termos de silogismo são só letras', () => {
    for (const trio of [...LOGIC_TERMS.concretos, ...LOGIC_TERMS.inventados]) {
      for (const t of trio) expect(t, `"${t}"`).toMatch(/^[A-Za-z-]+$/)
    }
  })

  it('nenhuma palavra do vocabulário tem dígito, espaço sobrando ou TODO', () => {
    for (const e of VOCAB) {
      for (const w of [e.word, ...e.synonyms, ...e.antonyms]) {
        expect(w, `"${w}"`).toMatch(/^[a-z-]+$/)
        expect(w.trim()).toBe(w)
      }
    }
  })

  it('nenhuma frase tem marcação de rascunho', () => {
    // Sem /i e com fronteira de palavra: "todos" contém "todo" e derrubava
    // este teste por falso positivo.
    const rascunho = /\b(TODO|FIXME|XXX)\b|\?\?\?|lorem ipsum/
    for (const f of SENTENCE_FRAMES) {
      expect(f.frame, f.frame).not.toMatch(rascunho)
      expect(f.rationale, f.frame).not.toMatch(rascunho)
    }
  })
})

describe('léxico — cobertura suficiente para a cota de 150/tipo', () => {
  it('há trios de silogismo suficientes', () => {
    expect(LOGIC_TERMS.concretos.length).toBeGreaterThanOrEqual(15)
    expect(LOGIC_TERMS.inventados.length).toBeGreaterThanOrEqual(15)
  })

  it('cada nível tem pelo menos 5 frases de completar', () => {
    for (const d of DIFFICULTIES) {
      const n = SENTENCE_FRAMES.filter((f) => f.level === d).length
      expect(n, `nível ${d} só tem ${n} frases`).toBeGreaterThanOrEqual(5)
    }
  })
})
