import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { DIFFICULTIES, OPCOES_POR_QUESTAO } from '../taxonomy'
import { DOUBLE_FRAMES } from './frasesDuplas'
import { gerarCompletarFraseDupla } from './generators'
import { sentidoDominante } from './lexicon'

/**
 * Auditoria das frases de duas lacunas. O gerador só sorteia; o risco está no
 * texto, então os testes varrem o que dá para varrer por máquina — e a revisão
 * de sentido (nenhum par errado sobrevive à frase inteira) está na justificativa
 * de cada frase, que precisa citar as armadilhas.
 */
describe('DOUBLE_FRAMES — integridade', () => {
  it('pelo menos 10 frases por nível', () => {
    for (const d of DIFFICULTIES) {
      const n = DOUBLE_FRAMES.filter((f) => f.level === d).length
      expect(n, `nível ${d}`).toBeGreaterThanOrEqual(10)
    }
  })

  it('toda frase tem exatamente duas lacunas, nenhuma depois de "a"/"an"', () => {
    for (const f of DOUBLE_FRAMES) {
      expect((f.frame.match(/___/g) ?? []).length, f.frame).toBe(2)
      expect(f.frame, f.frame).not.toMatch(/\ban? ___/i)
    }
  })

  it('pelo menos 4 pares errados, e nenhum igual ao gabarito', () => {
    for (const f of DOUBLE_FRAMES) {
      expect(f.distractors.length, f.frame).toBeGreaterThanOrEqual(OPCOES_POR_QUESTAO - 1)
      for (const d of f.distractors) expect(d.join('/'), f.frame).not.toBe(f.answer.join('/'))
    }
  })

  it('nenhuma palavra se repete entre as alternativas (a mais frequente seria o chute)', () => {
    for (const f of DOUBLE_FRAMES) {
      const palavras = [...f.answer, ...f.distractors.flat()]
      expect(new Set(palavras).size, `${f.frame}: ${palavras.join(', ')}`).toBe(palavras.length)
    }
  })

  it('nenhuma palavra das alternativas aparece na frase', () => {
    for (const f of DOUBLE_FRAMES) {
      const texto = ` ${f.frame.toLowerCase().replace(/[^a-z-]+/g, ' ')} `
      for (const w of [...f.answer, ...f.distractors.flat()]) {
        expect(texto.includes(` ${w} `), `"${w}" em "${f.frame}"`).toBe(false)
      }
    }
  })

  it('palavras são inglês em minúsculas, sem resíduo', () => {
    for (const f of DOUBLE_FRAMES) {
      for (const w of [...f.answer, ...f.distractors.flat()]) expect(w, f.frame).toMatch(/^[a-z-]+$/)
    }
  })

  it('em nenhuma das duas lacunas os distratores dividem um sentido que só o gabarito não tem', () => {
    for (const f of DOUBLE_FRAMES) {
      for (const i of [0, 1] as const) {
        const s = sentidoDominante(
          f.answer[i],
          f.distractors.map((d) => d[i]),
          OPCOES_POR_QUESTAO - 1,
        )
        expect(s, `${f.frame} (lacuna ${i + 1}): todos "${s}"`).toBeUndefined()
      }
    }
  })

  it('a justificativa, nos dois idiomas, cita o gabarito ou as armadilhas pelo nome', () => {
    for (const f of DOUBLE_FRAMES) {
      for (const texto of [f.rationale.pt, f.rationale.en]) {
        expect(texto.length, f.frame).toBeGreaterThan(80)
        // cita o par inteiro ("clear / easy") ou uma palavra dele
        const citadas = f.distractors.filter(
          ([a, b]) => texto.includes(`"${a} / ${b}"`) || texto.includes(`"${a}"`) || texto.includes(`"${b}"`),
        )
        expect(citadas.length, `${f.frame}: justificativa não cita armadilha`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('não repete frase', () => {
    const frases = DOUBLE_FRAMES.map((f) => f.frame)
    expect(new Set(frases).size).toBe(frases.length)
  })
})

describe('completar_frase_dupla — gerador', () => {
  it('a alternativa é "palavra / palavra" e o gabarito é o par da frase', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 100; seed++) {
        const q = gerarCompletarFraseDupla(seed, d)
        const frame = DOUBLE_FRAMES.find((f) => f.frame === q.stem)!
        expect(frame.level).toBe(d)
        for (const o of q.options) expect(o.text).toMatch(/^[a-z-]+ \/ [a-z-]+$/)
        expect(q.options.find((o) => o.id === q.answerId)!.text).toBe(frame.answer.join(' / '))
      }
    }
  })

  it('muitas seeds × níveis passam por runGates', () => {
    const drafts = DIFFICULTIES.flatMap((d) =>
      Array.from({ length: 40 }, (_, i) =>
        buildQuestion('completar_frase_dupla', i + 1, d, '2026-09-30T12:00:00.000Z'),
      ),
    )
    const r = runGates(drafts)
    // A identidade de questão textual é o enunciado: a mesma frase com outro
    // sorteio de distratores é a mesma questão, e o dedup barra. Fora isso,
    // nada pode ser reprovado.
    const outros = r.rejected.filter((x) => x.violations.some((v) => v.gate !== 'G4_dedup'))
    expect(outros.map((x) => x.violations)).toEqual([])
    expect(r.approved.length).toBe(new Set(drafts.map((q) => q.stem)).size)
    expect(r.approved.length).toBeGreaterThanOrEqual(50)
  })
})
