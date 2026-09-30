import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import { normalizeText } from '../schema'
import { buildQuestion } from '../generators'
import { dedupSignature, runGates } from '../content/gates'
import { gerarCalculoBasico } from './calculo'
import { comparacaoDe, evaluateExpression, parseNumber } from './solver'

const RUNS = 200
const AGORA = '2026-09-21T12:00:00.000Z'

const FAMILIAS_CALCULO: Record<Difficulty, string[]> = {
  1: ['comparar_decimais', 'produto_decimal'],
  2: ['comparar_decimais', 'fracao_de_fracao', 'porcentagem_de', 'quociente_decimal'],
  3: ['todo_pela_parte', 'porcentagem_de_porcentagem', 'mais_perto_de'],
  4: ['fracao_referencia', 'mais_perto_de', 'fracao_de_fracao', 'todo_pela_fracao'],
  5: ['fracao_produto_cruzado', 'porcentagem_equivalente', 'cadeia_mista'],
}

type Q = ReturnType<typeof gerarCalculoBasico>
const marcada = (q: Q): string => q.options.find((o) => o.id === q.answerId)!.text
const valores = (q: Q): number[] => q.options.map((o) => parseNumber(o.text))

/** Varre seeds e níveis e devolve só as questões da família pedida. */
function daFamilia(familia: string, niveis = DIFFICULTIES): { q: Q; d: number; seed: number }[] {
  const out: { q: Q; d: number; seed: number }[] = []
  for (const d of niveis) {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = gerarCalculoBasico(seed, d)
      if (q.familia === familia) out.push({ q, d, seed })
    }
  }
  return out
}

/** Números do enunciado, na ordem em que aparecem ("3/8" dá 3 e 8). */
function numeros(stem: string): number[] {
  return (stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => Number(t.replace(/,/g, '')))
}

describe('calculo_basico: contrato comum', () => {
  it('é determinístico por seed e nível', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const d of DIFFICULTIES) expect(gerarCalculoBasico(seed, d)).toEqual(gerarCalculoBasico(seed, d))
    }
  })

  it('a expressão canônica, avaliada pelo solver, bate com a alternativa marcada', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarCalculoBasico(seed, d)
        const msg = `nível ${d} seed ${seed}: ${q.stem} [${q.expression}]`
        expect(evaluateExpression(q.expression), msg).toBeCloseTo(q.answerValue, 9)
        expect(parseNumber(marcada(q)), msg).toBeCloseTo(q.answerValue, 9)
      }
    }
  })

  it('exatamente uma alternativa vale a resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarCalculoBasico(seed, d)
        const iguais = valores(q).filter((v) => Math.abs(v - q.answerValue) < 1e-9)
        expect(iguais, `nível ${d} seed ${seed}: ${q.stem}`).toHaveLength(1)
      }
    }
  })

  it('5 alternativas únicas, também no valor ("0.5" e "1/2" seriam duas respostas)', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarCalculoBasico(seed, d)
        expect(q.options).toHaveLength(OPCOES_POR_QUESTAO)
        expect(new Set(q.options.map((o) => normalizeText(o.text))).size).toBe(OPCOES_POR_QUESTAO)
        expect(new Set(valores(q)).size, `nível ${d} seed ${seed}`).toBe(OPCOES_POR_QUESTAO)
        for (const v of valores(q)) expect(v).toBeGreaterThan(0)
      }
    }
  })

  it('o enunciado não entrega a resposta, nem como número nem como texto', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarCalculoBasico(seed, d)
        const msg = `nível ${d} seed ${seed}: ${q.stem} → ${marcada(q)}`
        expect(numeros(q.stem).some((n) => Math.abs(n - q.answerValue) < 1e-9), msg).toBe(false)
        expect(` ${normalizeText(q.stem)} `, msg).not.toContain(` ${normalizeText(marcada(q))} `)
      }
    }
  })

  it('cada nível usa só as famílias dele, e todas aparecem', () => {
    for (const d of DIFFICULTIES) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= RUNS; seed++) vistas.add(gerarCalculoBasico(seed, d).familia as string)
      expect([...vistas].sort(), `nível ${d}`).toEqual([...FAMILIAS_CALCULO[d]].sort())
    }
  })

  it('comparação de frações só a partir do nível 4; fração como alternativa, idem', () => {
    for (const d of [1, 2, 3] as const) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarCalculoBasico(seed, d)
        for (const o of q.options) expect(o.text, `nível ${d} seed ${seed}`).not.toContain('/')
      }
    }
  })

  it('explicação nos dois idiomas, citando a resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 30; seed++) {
        const q = gerarCalculoBasico(seed, d)
        expect(q.explanation.pt).toContain(marcada(q))
        expect(q.explanation.en).toContain(marcada(q))
        expect(q.explanation.pt.length).toBeGreaterThan(80)
        expect(q.explanation.en.length).toBeGreaterThan(80)
      }
    }
  })

  it('passa nos gates que o pipeline aplica', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 80; seed++) {
        const q = buildQuestion('calculo_basico', seed, d, AGORA)
        expect(q.tipo).toBe('math_word')
        expect(q.verification.method).toBe('solver')
        const r = runGates([q])
        expect(r.violations, `nível ${d} seed ${seed}: ${q.stem}`).toEqual([])
      }
    }
  })

  it('rende 50 questões distintas por nível — a assinatura de dedup inclui as alternativas nas comparações', () => {
    for (const d of DIFFICULTIES) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= 400 && vistas.size < 50; seed++) {
        vistas.add(dedupSignature(buildQuestion('calculo_basico', seed, d, AGORA)))
      }
      expect(vistas.size, `nível ${d}: espaço de questões pequeno demais`).toBe(50)
    }
  })
})

describe('calculo_basico: comparações', () => {
  const COMPARACOES = ['comparar_decimais', 'mais_perto_de', 'fracao_referencia', 'fracao_produto_cruzado']

  it('os candidatos da expressão são exatamente as alternativas', () => {
    for (const familia of COMPARACOES) {
      const itens = daFamilia(familia)
      expect(itens.length, familia).toBeGreaterThan(20)
      for (const { q, d, seed } of itens) {
        const c = comparacaoDe(q.expression)
        expect(c, `${familia} nível ${d} seed ${seed}`).not.toBeNull()
        expect([...c!.candidatos].sort()).toEqual([...valores(q)].sort())
      }
    }
  })

  it('a resposta é de fato a extrema, recalculada só a partir das alternativas', () => {
    for (const familia of COMPARACOES) {
      for (const { q } of daFamilia(familia)) {
        const vs = valores(q)
        let esperado: number
        if (/smallest/.test(q.stem)) esperado = Math.min(...vs)
        else if (/largest/.test(q.stem)) esperado = Math.max(...vs)
        else {
          const alvo = parseNumber(/closest to (\S+)\?/.exec(q.stem)![1]!)
          esperado = [...vs].sort((a, b) => Math.abs(a - alvo) - Math.abs(b - alvo))[0]!
        }
        expect(q.answerValue, q.stem).toBe(esperado)
      }
    }
  })

  it('decimais: ler os algarismos como inteiro, ignorando os zeros, aponta uma alternativa errada', () => {
    for (const { q, d, seed } of daFamilia('comparar_decimais')) {
      const comoInteiro = (t: string) => Number(t.replace('0.', '').replace(/^0+/, ''))
      const menor = /smallest/.test(q.stem)
      const ingenua = [...q.options].sort((a, b) =>
        menor ? comoInteiro(a.text) - comoInteiro(b.text) : comoInteiro(b.text) - comoInteiro(a.text),
      )[0]!
      expect(ingenua.id, `nível ${d} seed ${seed}: ${q.options.map((o) => o.text).join(' ')}`).not.toBe(q.answerId)
      // e os comprimentos variam: é isso que a questão mede
      expect(new Set(q.options.map((o) => o.text.length)).size).toBeGreaterThan(1)
    }
  })

  it('frações: maior denominador e menor numerador não apontam a resposta', () => {
    for (const familia of ['fracao_referencia', 'fracao_produto_cruzado']) {
      for (const { q, d, seed } of daFamilia(familia)) {
        const menor = /smallest/.test(q.stem)
        const partes = q.options.map((o) => ({ id: o.id, n: Number(o.text.split('/')[0]), d: Number(o.text.split('/')[1]) }))
        const porDen = menor ? Math.max(...partes.map((p) => p.d)) : Math.min(...partes.map((p) => p.d))
        const porNum = menor ? Math.min(...partes.map((p) => p.n)) : Math.max(...partes.map((p) => p.n))
        const pelaDen = partes.filter((p) => p.d === porDen)
        const peloNum = partes.filter((p) => p.n === porNum)
        const msg = `${familia} nível ${d} seed ${seed}: ${q.stem} ${q.options.map((o) => o.text).join(' ')}`
        if (pelaDen.length === 1) expect(pelaDen[0]!.id, msg).not.toBe(q.answerId)
        if (peloNum.length === 1) expect(peloNum[0]!.id, msg).not.toBe(q.answerId)
      }
    }
  })

  it('nível 4, frações de referência: todas do mesmo lado de 1/2', () => {
    for (const { q } of daFamilia('fracao_referencia')) {
      const lados = new Set(valores(q).map((v) => Math.sign(v - 0.5)))
      expect(lados.size, q.options.map((o) => o.text).join(' ')).toBe(1)
    }
  })
})

describe('calculo_basico: contas recalculadas do enunciado', () => {
  it('"X is p% of what number?" — a resposta é X ÷ p/100', () => {
    for (const { q } of daFamilia('todo_pela_parte')) {
      const [parte, p] = numeros(q.stem) as [number, number]
      expect(q.answerValue, q.stem).toBeCloseTo(parte / (p / 100), 9)
    }
  })

  it('fração de fração — o produto das frações vezes o total', () => {
    for (const { q } of daFamilia('fracao_de_fracao')) {
      const ns = numeros(q.stem)
      const total = ns.at(-1)!
      let produto = total
      for (let i = 0; i + 1 < ns.length - 1; i += 2) produto *= ns[i]! / ns[i + 1]!
      expect(q.answerValue, q.stem).toBeCloseTo(produto, 9)
    }
  })

  it('% de %: somar os percentuais aparece entre as alternativas quando cabe na escala', () => {
    let vistos = 0
    for (const { q } of daFamilia('porcentagem_de_porcentagem')) {
      const [p1, p2, base] = numeros(q.stem) as [number, number, number]
      expect(q.answerValue).toBeCloseTo((base * p1 * p2) / 10000, 9)
      if (valores(q).includes((base * (p1 + p2)) / 100)) vistos++
    }
    expect(vistos).toBeGreaterThan(20)
  })

  it('produto de decimais: a casa decimal errada (×10 ou ÷10) está entre as alternativas', () => {
    for (const { q } of daFamilia('produto_decimal')) {
      const vs = valores(q)
      const deslocada = vs.some((v) =>
        [10, 0.1].some((f) => Math.abs(v - q.answerValue * f) < 1e-9 * Math.max(1, v)),
      )
      expect(deslocada, `${q.stem} ${vs.join(' ')}`).toBe(true)
    }
  })
})
