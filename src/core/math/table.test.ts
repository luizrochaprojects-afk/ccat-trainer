import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { StemTable } from '../schema'
import { evaluateExpression, parseNumber } from './solver'
import { gerarTabela, NIVEIS_TABELA, TABLE_GENERATORS, TABLE_TEMPLATES, type TableGenerated } from './table'
import { proximo } from './word'

const RUNS = 150
const gerar = TABLE_GENERATORS.tabela

/** Coluna numérica da tabela, pelo começo do cabeçalho ("Sales" casa "Sales ($)"). */
function coluna(t: StemTable, prefixo: string): number[] {
  const i = t.columns.findIndex((c) => c.startsWith(prefixo))
  if (i < 0) throw new Error(`coluna "${prefixo}" não existe em ${t.columns.join(', ')}`)
  return t.rows.map((r) => parseNumber(r[i] as string))
}

const rotulos = (t: StemTable) => t.rows.map((r) => r[0] as string)
const argmax = (v: number[]) => v.indexOf(Math.max(...v))
const argmin = (v: number[]) => v.indexOf(Math.min(...v))

/**
 * Refaz a pergunta de "qual linha" direto da tabela, sem passar pelo gerador:
 * é o segundo caminho que a pergunta de linha não tem no gate (o solver só
 * entende número). Devolve a linha certa e as que vencem sob as métricas
 * erradas que a pressa usa.
 */
function resolverLinha(q: TableGenerated): { certa: string; erradas: string[] } {
  const t = q.stemTable
  const nomes = rotulos(t)
  if (/sales per employee/.test(q.stem)) {
    const vendas = coluna(t, 'Sales')
    const func = coluna(t, 'Employees')
    const razao = vendas.map((v, i) => v / (func[i] as number))
    return { certa: nomes[argmax(razao)]!, erradas: [argmax(vendas), argmin(func)].map((i) => nomes[i]!) }
  }
  if (/least on training per employee/.test(q.stem)) {
    const orc = coluna(t, 'Budget')
    const func = coluna(t, 'Employees')
    const razao = orc.map((v, i) => v / (func[i] as number))
    return { certa: nomes[argmin(razao)]!, erradas: [argmin(orc), argmax(func)].map((i) => nomes[i]!) }
  }
  const un = coluna(t, 'Units')
  const preco = coluna(t, 'Price')
  const custo = coluna(t, 'Cost')
  const unit = preco.map((p, i) => p - (custo[i] as number))
  const lucro = un.map((u, i) => u * (unit[i] as number))
  if (/greatest total profit/.test(q.stem)) {
    const receita = un.map((u, i) => u * (preco[i] as number))
    return {
      certa: nomes[argmax(lucro)]!,
      erradas: [argmax(unit), argmax(receita), argmax(un)].map((i) => nomes[i]!),
    }
  }
  if (/profit margin/.test(q.stem)) {
    const margem = unit.map((m, i) => m / (preco[i] as number))
    return {
      certa: nomes[argmax(margem)]!,
      erradas: [argmax(unit), argmax(lucro), argmax(preco)].map((i) => nomes[i]!),
    }
  }
  throw new Error(`pergunta de linha desconhecida: ${q.stem}`)
}

const ehLinha = (q: TableGenerated) => q.expression === undefined

describe('leitura de tabela', () => {
  it('é determinística por seed e nível', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= 40; seed++) {
        expect(gerar(seed, d)).toEqual(gerar(seed, d))
      }
    }
  })

  it('não existe no nível 1, como na prova', () => {
    expect(() => gerar(1, 1)).toThrow(/nível 2/)
  })

  it('sempre 5 alternativas, sem repetição, e exatamente uma certa', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        const textos = q.options.map((o) => o.text)
        expect(textos).toHaveLength(OPCOES_POR_QUESTAO)
        expect(new Set(textos).size, `nível ${d} seed ${seed}`).toBe(OPCOES_POR_QUESTAO)
        expect(q.options.filter((o) => o.id === q.answerId)).toHaveLength(1)
      }
    }
  })

  it('pergunta de valor: expressão, alternativa marcada e resposta batem', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (ehLinha(q)) continue
        const marcada = q.options.find((o) => o.id === q.answerId)!
        expect(evaluateExpression(q.expression!), `nível ${d} seed ${seed}`).toBeCloseTo(q.answerValue!, 6)
        expect(parseNumber(marcada.text)).toBeCloseTo(q.answerValue!, 2)
        const iguais = q.options.filter((o) => Math.abs(parseNumber(o.text) - q.answerValue!) < 0.005)
        expect(iguais, `nível ${d} seed ${seed}`).toHaveLength(1)
      }
    }
  })

  it('pergunta de linha: refeita direto da tabela, dá a mesma linha', () => {
    let vistas = 0
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (!ehLinha(q)) continue
        vistas++
        const { certa } = resolverLinha(q)
        expect(q.options.find((o) => o.id === q.answerId)!.text, `nível ${d} seed ${seed}`).toBe(certa)
      }
    }
    expect(vistas).toBeGreaterThan(50)
  })

  it('pergunta de linha: as alternativas são as linhas, e as métricas erradas elegem outras', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (!ehLinha(q)) continue
        expect(q.options.map((o) => o.text).sort()).toEqual([...rotulos(q.stemTable)].sort())
        const { certa, erradas } = resolverLinha(q)
        const outras = new Set(erradas.filter((e) => e !== certa))
        expect(outras.size, `nível ${d} seed ${seed}: métrica errada acertaria`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('a resposta não está à vista: nem no enunciado, nem numa célula', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        const certa = q.options.find((o) => o.id === q.answerId)!.text
        if (ehLinha(q)) {
          for (const r of rotulos(q.stemTable)) expect(q.stem).not.toContain(r)
          continue
        }
        const celulas = q.stemTable.rows.flatMap((r) => r.slice(1).map((c) => parseNumber(c)))
        expect(celulas.some((c) => Math.abs(c - q.answerValue!) < 0.005), `seed ${seed}: ${certa}`).toBe(false)
        const noEnunciado = (q.stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => parseNumber(t))
        expect(noEnunciado.some((n) => Math.abs(n - q.answerValue!) < 0.005)).toBe(false)
      }
    }
  })

  it('do nível 3 em diante, pelo menos dois erros reais caem perto da resposta', () => {
    for (const d of NIVEIS_TABELA.filter((n) => n >= 3)) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerar(seed, d)
        if (ehLinha(q)) continue
        const perto = q.options
          .filter((o) => o.id !== q.answerId)
          .filter((o) => proximo(parseNumber(o.text), q.answerValue!))
        expect(perto.length, `nível ${d} seed ${seed}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('a tabela cabe no formato da prova: 4–5 linhas, até 4 colunas, células curtas', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const t = gerar(seed, d).stemTable
        expect(t.layout).toBe('dados')
        expect(t.rows.length).toBeGreaterThanOrEqual(4)
        expect(t.rows.length).toBeLessThanOrEqual(5)
        expect(t.columns.length).toBeLessThanOrEqual(4)
        for (const r of t.rows) {
          expect(r).toHaveLength(t.columns.length)
          for (const c of r) expect(c.length).toBeLessThanOrEqual(12)
        }
      }
    }
  })

  it('rende 50 questões distintas por nível dentro do orçamento de seeds', () => {
    for (const d of NIVEIS_TABELA) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= 300 && vistas.size < 50; seed++) {
        const q = gerar(seed, d)
        vistas.add(JSON.stringify([q.stem, q.stemTable]))
      }
      expect(vistas.size, `nível ${d}`).toBe(50)
    }
  })
})

describe('o nível escolhe a família da tabela', () => {
  const doNivel = (d: Difficulty) => TABLE_TEMPLATES.filter((t) => t.niveis.includes(d))

  it('cada nível de 2 a 5 tem pelo menos dois templates, e o 1 nenhum', () => {
    expect(doNivel(1)).toHaveLength(0)
    for (const d of NIVEIS_TABELA) expect(doNivel(d).length, `nível ${d}`).toBeGreaterThanOrEqual(2)
  })

  it('cada nível sorteia só os seus templates, e mais de um de fato aparece', () => {
    for (const d of NIVEIS_TABELA) {
      const permitidos = new Set(doNivel(d).map((t) => t.id))
      const usados = new Set<string>()
      for (let seed = 1; seed <= 120; seed++) usados.add(gerarTabela(seed, d).template)
      for (const u of usados) expect(permitidos.has(u), `nível ${d}: ${u}`).toBe(true)
      expect(usados.size, `nível ${d}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('"qual linha" entra do nível 3 em diante; no 2 é só conta', () => {
    expect(doNivel(2).every((t) => t.resposta === 'valor')).toBe(true)
    for (const d of [3, 4, 5] as Difficulty[]) {
      expect(doNivel(d).some((t) => t.resposta === 'linha'), `nível ${d}`).toBe(true)
    }
  })

  it('o nível alto combina mais células', () => {
    const passos = (d: Difficulty) => Math.max(...doNivel(d).map((t) => t.passos))
    expect(passos(5)).toBeGreaterThanOrEqual(passos(2))
    expect(Math.min(...doNivel(5).map((t) => t.passos))).toBeGreaterThanOrEqual(3)
  })
})

describe('leitura de tabela nos gates', () => {
  const AGORA = '2026-09-29T12:00:00.000Z'

  it('passa nos cinco gates em todos os níveis', () => {
    const drafts = NIVEIS_TABELA.flatMap((d) =>
      Array.from({ length: 40 }, (_, i) => buildQuestion('tabela', i + 1, d, AGORA)),
    )
    const r = runGates(drafts)
    expect(r.violations, JSON.stringify(r.violations.slice(0, 3), null, 2)).toHaveLength(0)
  })

  it('valor vai pelo solver; "qual linha" pela regra', () => {
    for (const d of NIVEIS_TABELA) {
      for (let seed = 1; seed <= 40; seed++) {
        const q = buildQuestion('tabela', seed, d, AGORA)
        const texto = q.options.find((o) => o.id === q.answerId)!.text!
        const numerica = !Number.isNaN(Number(texto.replace(/[$,%]/g, '')))
        expect(q.verification.method, `${q.id}: ${texto}`).toBe(numerica ? 'solver' : 'rule')
        expect(q.stemTable).toBeDefined()
      }
    }
  })
})
