import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { parseNumber } from '../math/solver'
import { DIFFICULTIES, OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import {
  DETAIL_GENERATORS,
  gerarComparacao,
  LINHAS,
  MAX_CARACTERES,
  type DetailGenerated,
} from './comparacao'

const RUNS = 200
const gerar = DETAIL_GENERATORS.comparacao

/** Linhas (1-based) em que as duas colunas diferem — lidas da tabela, não do gerador. */
function diferentes(q: DetailGenerated): number[] {
  return q.stemTable.rows.flatMap((r, i) => (r[1] !== r[2] ? [i + 1] : []))
}

/** O rótulo de alternativa escrito de novo aqui, para não conferir o gerador com ele mesmo. */
function rotulo(s: number[]): string {
  if (s.length === 1) return `${s[0]} only`
  return `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

/**
 * Distância de edição com transposição (Damerau–Levenshtein restrita). Uma
 * diferença "sutil" é uma alteração só: um caractere trocado, dois vizinhos
 * invertidos, um hífen ou uma letra a mais — ou o sufixo St./Dr., que troca
 * duas letras de uma vez.
 */
function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + custo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1)
      }
      d[i]![j] = v
    }
  }
  return d[a.length]![b.length]!
}

const ehNumero = (t: string) => {
  try {
    parseNumber(t)
    return true
  } catch {
    return false
  }
}

describe('comparação de colunas', () => {
  it('é determinística por seed e nível', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 50; seed++) expect(gerar(seed, d)).toEqual(gerar(seed, d))
    }
  })

  it('duas colunas de 5 linhas, numeradas, com entradas que cabem no celular', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const t = gerar(seed, d).stemTable
        expect(t.layout).toBe('comparacao')
        expect(t.columns).toHaveLength(3)
        expect(t.rows).toHaveLength(LINHAS)
        t.rows.forEach((r, i) => {
          expect(r[0]).toBe(String(i + 1))
          expect(r[1]!.length).toBeLessThanOrEqual(MAX_CARACTERES)
          expect(r[2]!.length).toBeLessThanOrEqual(MAX_CARACTERES)
        })
        // Nenhuma entrada se repete entre linhas: a comparação é linha a linha.
        expect(new Set(t.rows.map((r) => r[1])).size, `nível ${d} seed ${seed}`).toBe(LINHAS)
      }
    }
  })

  it('sempre 5 alternativas distintas e exatamente uma certa, refeita pela tabela', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        const textos = q.options.map((o) => o.text)
        expect(textos).toHaveLength(OPCOES_POR_QUESTAO)
        expect(new Set(textos).size).toBe(OPCOES_POR_QUESTAO)

        const dif = diferentes(q)
        const esperado = /How many/.test(q.stem) ? String(LINHAS - dif.length) : rotulo(dif)
        const certas = q.options.filter((o) => o.text === esperado)
        expect(certas, `nível ${d} seed ${seed}: esperava "${esperado}"`).toHaveLength(1)
        expect(certas[0]!.id).toBe(q.answerId)
      }
    }
  })

  it('cada linha diferente tem UMA alteração pequena, não uma troca óbvia', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        for (const r of gerar(seed, d).stemTable.rows) {
          if (r[1] === r[2]) continue
          const dist = distancia(r[1]!, r[2]!)
          expect(dist, `nível ${d} seed ${seed}: "${r[1]}" × "${r[2]}"`).toBeGreaterThanOrEqual(1)
          expect(dist, `nível ${d} seed ${seed}: "${r[1]}" × "${r[2]}"`).toBeLessThanOrEqual(2)
        }
      }
    }
  })

  it('"quantas": janela de 5 números com a resposta e os vizinhos dela', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (!/How many/.test(q.stem)) continue
        const valores = q.options.map((o) => Number(o.text))
        expect([[0, 1, 2, 3, 4], [1, 2, 3, 4, 5]]).toContainEqual(valores)
        const certa = Number(q.options.find((o) => o.id === q.answerId)!.text)
        // Os erros reais — uma diferença que passou, uma inventada — estão lá.
        for (const vizinho of [certa - 1, certa + 1]) {
          if (vizinho >= 0 && vizinho <= LINHAS) {
            const naJanela = vizinho >= valores[0]! && vizinho <= valores[4]!
            if (naJanela) expect(valores).toContain(vizinho)
          }
        }
      }
    }
  })

  it('"quais": alternativas textuais, nunca vazias, com o erro de deixar passar uma', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (/How many/.test(q.stem)) continue
        for (const o of q.options) {
          expect(ehNumero(o.text), o.text).toBe(false)
          expect(o.text).toMatch(/^\d( only|(, \d)* and \d)$/)
        }
        const dif = diferentes(q)
        if (dif.length >= 2) {
          const passou = dif.map((x) => rotulo(dif.filter((y) => y !== x)))
          expect(q.options.some((o) => passou.includes(o.text)), `seed ${seed}`).toBe(true)
        }
      }
    }
  })

  it('o enunciado não tem números — nada ali pode entregar a contagem', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 60; seed++) expect(gerar(seed, d).stem).not.toMatch(/\d/)
    }
  })

  it('os dois formatos de pergunta aparecem em todo nível', () => {
    for (const d of DIFFICULTIES) {
      const formatos = new Set<string>()
      for (let seed = 1; seed <= 40; seed++) formatos.add(gerarComparacao(seed, d).formato)
      expect(formatos, `nível ${d}`).toEqual(new Set(['quantas', 'quais']))
    }
  })

  it('rende 50 questões distintas por nível dentro do orçamento de seeds', () => {
    for (const d of DIFFICULTIES) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= 200 && vistas.size < 50; seed++) {
        vistas.add(JSON.stringify(gerar(seed, d).stemTable))
      }
      expect(vistas.size, `nível ${d}`).toBe(50)
    }
  })
})

describe('o nível muda o material e a sutileza', () => {
  const amostra = (d: Difficulty) => Array.from({ length: RUNS }, (_, i) => gerarComparacao(i + 1, d))

  it('nível 1: poucas diferenças (1–2), só troca de um caractere', () => {
    for (const r of amostra(1)) {
      const n = diferentes(r.questao).length
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(2)
      for (const m of r.mutacoes) expect(['digito', 'letra']).toContain(m)
    }
  })

  it('do nível 3 em diante a alteração nunca está no primeiro caractere', () => {
    for (const d of [3, 4, 5] as Difficulty[]) {
      for (const r of amostra(d)) {
        for (const row of r.questao.stemTable.rows) expect(row[1]![0]).toBe(row[2]![0])
      }
    }
  })

  it('caracteres confundíveis (O/0, I/1, S/5…) só a partir do nível 4, e de fato aparecem', () => {
    for (const d of [1, 2, 3] as Difficulty[]) {
      for (const r of amostra(d)) expect(r.mutacoes).not.toContain('confusivel')
    }
    for (const d of [4, 5] as Difficulty[]) {
      expect(amostra(d).some((r) => r.mutacoes.includes('confusivel')), `nível ${d}`).toBe(true)
    }
  })

  it('o nível alto tem mais linhas diferentes e usa códigos alfanuméricos', () => {
    const media = (d: Difficulty) =>
      amostra(d).reduce((acc, r) => acc + diferentes(r.questao).length, 0) / RUNS
    expect(media(5)).toBeGreaterThan(media(1))
    expect(amostra(5).some((r) => r.categoria === 'codigos')).toBe(true)
    const codigo = amostra(5).find((r) => r.categoria === 'codigos')!
    for (const row of codigo.questao.stemTable.rows) expect(row[1]).toMatch(/[A-Z]/)
    for (const row of codigo.questao.stemTable.rows) expect(row[1]).toMatch(/\d/)
  })
})

describe('comparação nos gates', () => {
  it('passa nos cinco gates em todos os níveis, verificada pela regra', () => {
    const drafts = DIFFICULTIES.flatMap((d) =>
      Array.from({ length: 40 }, (_, i) => buildQuestion('comparacao', i + 1, d, '2026-09-29T12:00:00.000Z')),
    )
    for (const q of drafts) {
      expect(q.tipo).toBe('verbal_detail')
      expect(q.verification.method).toBe('rule')
    }
    const r = runGates(drafts)
    expect(r.violations, JSON.stringify(r.violations.slice(0, 3), null, 2)).toHaveLength(0)
  })
})
