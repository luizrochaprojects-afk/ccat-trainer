import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { DIFFICULTIES } from '../taxonomy'
import { gerarOrdenacao } from './ordenacao'
import { permutacoes } from './verdadeiroFalso'

const SEEDS = 120

/**
 * Leitor independente: reconstrói as regras só a partir do TEXTO do enunciado,
 * enumera todas as filas por força bruta e diz quais alternativas estão certas.
 * Não usa nada do gerador — se o gerador e o leitor discordarem, um dos dois
 * está errado, e a questão não pode ir para o banco.
 */
function resolver(stem: string, opcoes: string[]): boolean[] {
  const linhas = stem.split('\n')
  const nomes = linhas[0]!.replace('In a line (1st = front): ', '').replace(/\.$/, '').split(', ')
  const n = nomes.length
  const id = (nome: string) => {
    const i = nomes.indexOf(nome)
    if (i < 0) throw new Error(`nome desconhecido: ${nome}`)
    return i
  }
  const posicao = (t: string) => (t === 'last' ? n - 1 : Number(t.match(/^(\d)/)![1]) - 1)
  type Teste = (pos: number[]) => boolean
  const lerRegra = (frase: string): Teste => {
    let m: RegExpMatchArray | null
    if ((m = frase.match(/^(\w+) is somewhere ahead of (\w+)\.?$/))) {
      const [a, b] = [id(m[1]!), id(m[2]!)]
      return (p) => p[a]! < p[b]!
    }
    if ((m = frase.match(/^(\w+) is right in front of (\w+)\.$/))) {
      const [a, b] = [id(m[1]!), id(m[2]!)]
      return (p) => p[a]! + 1 === p[b]!
    }
    if ((m = frase.match(/^(\w+) stands next to (\w+)\.$/))) {
      const [a, b] = [id(m[1]!), id(m[2]!)]
      return (p) => Math.abs(p[a]! - p[b]!) === 1
    }
    if ((m = frase.match(/^(\w+) does not stand next to (\w+)\.$/))) {
      const [a, b] = [id(m[1]!), id(m[2]!)]
      return (p) => Math.abs(p[a]! - p[b]!) !== 1
    }
    if ((m = frase.match(/^(\w+) is neither 1st nor last\.$/))) {
      const a = id(m[1]!)
      return (p) => p[a] !== 0 && p[a] !== n - 1
    }
    if ((m = frase.match(/^If (\w+) is not 1st, (\w+) is last\.$/))) {
      const [a, b] = [id(m[1]!), id(m[2]!)]
      return (p) => p[a] === 0 || p[b] === n - 1
    }
    if ((m = frase.match(/^(\w+) is (\w+)\.?$/))) {
      const [a, k] = [id(m[1]!), posicao(m[2]!)]
      return (p) => p[a] === k
    }
    throw new Error(`regra ilegível: "${frase}"`)
  }

  let pergunta = linhas.at(-1)!
  const regras = linhas.slice(1, -1).map(lerRegra)
  const hip = pergunta.match(/^If (\w+) is (\w+), (.*)$/)
  if (hip) {
    regras.push(lerRegra(`${hip[1]} is ${hip[2]}.`))
    pergunta = hip[3]!.charAt(0).toUpperCase() + hip[3]!.slice(1)
  }

  const filas = permutacoes(n)
    .map((ordem) => {
      const pos = new Array<number>(n)
      ordem.forEach((pessoa, i) => (pos[pessoa] = i))
      return pos
    })
    .filter((pos) => regras.every((r) => r(pos)))
  expect(filas.length, stem).toBeGreaterThan(0)

  const podeEstar = (nome: string, k: number) => filas.some((p) => p[id(nome)] === k)
  let m: RegExpMatchArray | null
  if ((m = pergunta.match(/^Who must be (\w+)\?$/))) {
    const k = posicao(m[1]!)
    return opcoes.map((o) => filas.every((p) => p[id(o)] === k))
  }
  if ((m = pergunta.match(/^Who could be (\w+)\?$/))) {
    const k = posicao(m[1]!)
    return opcoes.map((o) => podeEstar(o, k))
  }
  if ((m = pergunta.match(/^Who CANNOT be (\w+)\?$/))) {
    const k = posicao(m[1]!)
    return opcoes.map((o) => !podeEstar(o, k))
  }
  if ((m = pergunta.match(/^Which list includes everyone who could be (\w+)\?$/))) {
    const k = posicao(m[1]!)
    const todos = nomes.filter((x) => podeEstar(x, k)).sort().join(', ')
    return opcoes.map((o) => o.split(', ').sort().join(', ') === todos)
  }
  if (pergunta === 'Which of the following must be true?') {
    return opcoes.map((o) => {
      const t = lerRegra(o)
      return filas.every(t)
    })
  }
  throw new Error(`pergunta ilegível: "${pergunta}"`)
}

describe('ordenacao — o gabarito é provado por força bruta', () => {
  it('o leitor independente acha exatamente uma alternativa certa, e é a marcada', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarOrdenacao(seed, d)
        const certas = resolver(
          q.stem,
          q.options.map((o) => o.text),
        )
        const ids = q.options.filter((_, i) => certas[i]).map((o) => o.id)
        expect(ids, `nível ${d} seed ${seed}\n${q.stem}\n${q.options.map((o) => o.text).join(' | ')}`).toEqual([
          q.answerId,
        ])
      }
    }
  })
})

describe('ordenacao — calibração por nível', () => {
  const pessoas = (stem: string) => stem.split('\n')[0]!.split(': ')[1]!.split(', ').length
  const regras = (stem: string) => stem.split('\n').length - 2

  it('5 pessoas nos níveis 1-2, 6 nos 3-4, 7 no 5; 4 regras até o 3, 5 depois', () => {
    const esperado = { 1: [5, 4], 2: [5, 4], 3: [6, 4], 4: [6, 5], 5: [7, 5] } as const
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 40; seed++) {
        const q = gerarOrdenacao(seed, d)
        expect([pessoas(q.stem), regras(q.stem)], `nível ${d} seed ${seed}`).toEqual(esperado[d])
      }
    }
  })

  it('os níveis altos trazem hipótese, lista e regra condicional; o 1 não', () => {
    const amostra = (d: 1 | 4 | 5) => Array.from({ length: 80 }, (_, i) => gerarOrdenacao(i + 1, d).stem)
    for (const d of [4, 5] as const) {
      const stems = amostra(d)
      expect(stems.some((s) => /\nIf \w+ is \w+, /.test(s)), `nível ${d} sem hipótese`).toBe(true)
      expect(stems.some((s) => /which list includes/i.test(s)), `nível ${d} sem lista`).toBe(true)
      expect(stems.some((s) => /^If \w+ is not 1st/m.test(s)), `nível ${d} sem condicional`).toBe(true)
      expect(stems.some((s) => /must be true/.test(s)), `nível ${d} sem "must be true"`).toBe(true)
    }
    for (const s of amostra(1)) expect(s).toMatch(/\nWho must be \w+\?$/)
  })

  it('nenhuma regra entrega a posição perguntada, e nenhuma pessoa tem duas regras de posição', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const linhas = gerarOrdenacao(seed, d).stem.split('\n')
        const pergunta = linhas.at(-1)!
        const k = pergunta.match(/be (\w+)\?$/)?.[1]
        const fixas = linhas.slice(1, -1).filter((l) => /^\w+ is (\d\w\w|last)\.$/.test(l))
        if (k) expect(fixas.some((l) => l.endsWith(` ${k}.`)), linhas.join('\n')).toBe(false)
        const pessoasFixas = linhas
          .slice(1, -1)
          .filter((l) => /^\w+ is (\d\w\w|last|neither 1st nor last)\.$/.test(l))
          .map((l) => l.split(' ')[0])
        expect(new Set(pessoasFixas).size, linhas.join('\n')).toBe(pessoasFixas.length)
      }
    }
  })

  it('cabe na tela: no máximo 8 linhas, cada uma curta, e alternativas curtas', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarOrdenacao(seed, d)
        const linhas = q.stem.split('\n')
        expect(linhas.length).toBeLessThanOrEqual(8)
        for (const l of linhas) expect(l.length, l).toBeLessThanOrEqual(64)
        for (const o of q.options) expect(o.text.length, o.text).toBeLessThanOrEqual(34)
      }
    }
  })

  it('os distratores vêm de erros reais: em boa parte das questões, alguém que só cabe esquecendo uma regra', () => {
    let comRegraEsquecida = 0
    let total = 0
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 60; seed++) {
        total++
        if (/esquecendo a regra/.test(gerarOrdenacao(seed, d).explanation.pt)) comRegraEsquecida++
      }
    }
    expect(comRegraEsquecida / total).toBeGreaterThan(0.4)
  })
})

describe('ordenacao — passa pelos gates', () => {
  it('muitas seeds × níveis aprovadas por runGates', () => {
    const drafts = DIFFICULTIES.flatMap((d) =>
      Array.from({ length: 30 }, (_, i) => buildQuestion('ordenacao', i + 1, d, '2026-09-30T12:00:00.000Z')),
    )
    const r = runGates(drafts)
    expect(r.rejected.map((x) => x.violations)).toEqual([])
    expect(r.approved).toHaveLength(drafts.length)
  })
})
