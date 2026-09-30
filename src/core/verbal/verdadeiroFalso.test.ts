import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'
import { DIFFICULTIES } from '../taxonomy'
import { allStatements, renderStatement, type Statement } from './syllogism'
import {
  CENARIOS,
  gerarVerdadeiroFalso,
  permutacoes,
  VEREDITOS,
  vereditoPorEnumeracao,
  vereditoSilogismo,
  type Veredito,
} from './verdadeiroFalso'

const SEEDS = 200

/** Divide o enunciado em premissas, afirmação e pergunta. */
function partes(stem: string) {
  const linhas = stem.split('\n')
  return { premissas: linhas.slice(0, -2), afirmacao: linhas.at(-2)!, pergunta: linhas.at(-1)! }
}

const marcadaDe = (q: ReturnType<typeof gerarVerdadeiroFalso>) =>
  q.options.find((o) => o.id === q.answerId)!.text as Veredito

describe('verdadeiro_falso — formato da prova', () => {
  it('sempre True, False, Uncertain, nessa ordem, e só três', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 50; seed++) {
        const q = gerarVerdadeiroFalso(seed, d)
        expect(q.options.map((o) => o.text)).toEqual(['True', 'False', 'Uncertain'])
      }
    }
  })

  it('a pergunta conta as premissas certo e a afirmação não repete premissa', () => {
    const extenso = ['', 'one', 'two', 'three', 'four']
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { premissas, afirmacao, pergunta } = partes(gerarVerdadeiroFalso(seed, d).stem)
        expect(premissas.length).toBeGreaterThanOrEqual(2)
        expect(premissas.length).toBeLessThanOrEqual(4)
        expect(pergunta).toContain(`first ${extenso[premissas.length]} statements are true`)
        expect(premissas, `nível ${d} seed ${seed}`).not.toContain(afirmacao)
      }
    }
  })

  it('os três vereditos saem equilibrados em cada nível', () => {
    for (const d of DIFFICULTIES) {
      const conta: Record<Veredito, number> = { True: 0, False: 0, Uncertain: 0 }
      for (let seed = 1; seed <= 300; seed++) conta[marcadaDe(gerarVerdadeiroFalso(seed, d))]++
      for (const v of VEREDITOS) {
        expect(conta[v], `nível ${d}: ${JSON.stringify(conta)}`).toBeGreaterThan(70)
        expect(conta[v], `nível ${d}: ${JSON.stringify(conta)}`).toBeLessThan(130)
      }
    }
  })

  it('nível 1-2 sem regras; nível 5 traz regra com "or"/"and"', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      expect(gerarVerdadeiroFalso(seed, 1).stem).toMatch(/ than /)
      for (const d of [1, 2] as const) {
        expect(gerarVerdadeiroFalso(seed, d).stem).not.toMatch(/Everyone who|Nobody who/)
      }
    }
    const comConectivo = Array.from({ length: 80 }, (_, i) => gerarVerdadeiroFalso(i + 1, 5).stem).some(
      (s) => /^Everyone who .+ (or|and) /m.test(s),
    )
    expect(comConectivo).toBe(true)
  })
})

/**
 * Conferência independente do gabarito: relê o enunciado, reconstrói as
 * premissas e enumera os cenários de novo, usando só o texto.
 */
describe('verdadeiro_falso — o gabarito é provado por enumeração', () => {
  const MAIS = new Set(['taller', 'older', 'faster', 'heavier', 'richer', 'tallest', 'oldest', 'fastest', 'heaviest', 'richest'])

  function relerComparacao(stem: string): Veredito | null {
    const { premissas, afirmacao } = partes(stem)
    const nomes: string[] = []
    const id = (n: string) => {
      if (!nomes.includes(n)) nomes.push(n)
      return nomes.indexOf(n)
    }
    const ler = (frase: string) => {
      const c = frase.match(/^(\w+) is (\w+) than (\w+)\.$/)
      if (c) {
        const [a, b] = [id(c[1]!), id(c[3]!)]
        const mais = MAIS.has(c[2]!)
        return (o: number[]) => (o.indexOf(a) < o.indexOf(b)) === mais
      }
      const s = frase.match(/^(\w+) is the (\w+) of the \w+\.$/)
      if (!s) throw new Error(`não li "${frase}"`)
      const a = id(s[1]!)
      return (o: number[]) => (MAIS.has(s[2]!) ? o[0] === a : o.at(-1) === a)
    }
    const p = premissas.map(ler)
    const af = ler(afirmacao)
    return vereditoPorEnumeracao(permutacoes(nomes.length), p, af)
  }

  function relerSilogismo(stem: string): Veredito | null {
    const { premissas, afirmacao } = partes(stem)
    const termos: string[] = []
    for (const f of [...premissas, afirmacao]) {
      const m = f.match(/^(?:All|No|Some) (\w+) are (?:not )?(\w+)\.$/)!
      for (const t of [m[1]!, m[2]!]) if (!termos.includes(t)) termos.push(t)
    }
    const ler = (f: string): Statement => allStatements().find((s) => renderStatement(s, termos) === f)!
    return vereditoSilogismo(premissas.map(ler), ler(afirmacao))
  }

  /** Lê regras e fatos casando as frases exatas dos cenários. */
  function relerRegras(stem: string, ou: 'inclusiva' | 'exclusiva'): Veredito | null {
    const { premissas, afirmacao } = partes(stem)
    const cenario = CENARIOS.find((c) => c.some((a) => stem.includes(a.sim) || stem.includes(a.nao)))!
    const frases = cenario
      .flatMap((a, i) => [
        { texto: a.nao, i, positivo: false },
        { texto: a.sim, i, positivo: true },
      ])
      .sort((x, y) => y.texto.length - x.texto.length)
    /** literais na ordem em que aparecem, sem sobreposição */
    const literais = (corpo: string) => {
      const achados: { pos: number; i: number; positivo: boolean }[] = []
      let resto = corpo
      for (const f of frases) {
        const pos = resto.indexOf(f.texto)
        if (pos < 0) continue
        achados.push({ pos, i: f.i, positivo: f.positivo })
        resto = resto.slice(0, pos) + '#'.repeat(f.texto.length) + resto.slice(pos + f.texto.length)
      }
      return achados.sort((a, b) => a.pos - b.pos)
    }
    const vale = (l: { i: number; positivo: boolean }, m: number) => (((m >> l.i) & 1) === 1) === l.positivo
    const ler = (frase: string) => {
      const ls = literais(frase)
      if (frase.startsWith('Nobody who ')) return (m: number) => !vale(ls[0]!, m) || !vale(ls[1]!, m)
      if (frase.startsWith('Everyone who ')) {
        const [a, b, c] = ls
        if (ls.length === 2) return (m: number) => !vale(a!, m) || vale(b!, m)
        const conectivo = frase.includes(' or ') ? 'or' : 'and'
        return (m: number) => {
          const dispara =
            conectivo === 'and'
              ? vale(a!, m) && vale(b!, m)
              : ou === 'inclusiva'
                ? vale(a!, m) || vale(b!, m)
                : vale(a!, m) !== vale(b!, m)
          return !dispara || vale(c!, m)
        }
      }
      return (m: number) => vale(ls[0]!, m)
    }
    const mundos = Array.from({ length: 16 }, (_, i) => i)
    return vereditoPorEnumeracao(mundos, premissas.map(ler), ler(afirmacao))
  }

  it('comparações e silogismos: a releitura chega ao mesmo veredito', () => {
    let conferidas = 0
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarVerdadeiroFalso(seed, d)
        if (/ than /.test(q.stem)) {
          expect(relerComparacao(q.stem), `nível ${d} seed ${seed}\n${q.stem}`).toBe(marcadaDe(q))
          conferidas++
        } else if (/^(All|No|Some) /.test(q.stem)) {
          expect(relerSilogismo(q.stem), `nível ${d} seed ${seed}\n${q.stem}`).toBe(marcadaDe(q))
          conferidas++
        }
      }
    }
    expect(conferidas).toBeGreaterThan(500)
  })

  it('regras: a releitura chega ao mesmo veredito, com o "or" lido dos dois jeitos', () => {
    let conferidas = 0
    for (const d of [3, 4, 5] as const) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarVerdadeiroFalso(seed, d)
        if (!/Everyone who|Nobody who/.test(q.stem)) continue
        for (const ou of ['inclusiva', 'exclusiva'] as const) {
          expect(relerRegras(q.stem, ou), `nível ${d} seed ${seed} (${ou})\n${q.stem}`).toBe(marcadaDe(q))
        }
        conferidas++
      }
    }
    expect(conferidas).toBeGreaterThan(150)
  })

  it('comparação: toda pessoa citada aparece em alguma premissa', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = gerarVerdadeiroFalso(seed, d)
        if (!/ than /.test(q.stem)) continue
        const { premissas, afirmacao } = partes(q.stem)
        const nomes = afirmacao.match(/\b[A-Z][a-z]{2}\b/g)!
        for (const n of nomes) expect(premissas.join(' '), `${n} em\n${q.stem}`).toContain(n)
      }
    }
  })
})

describe('verdadeiro_falso — passa pelos gates', () => {
  it('muitas seeds × níveis aprovadas por runGates, com 3 alternativas', () => {
    const drafts = DIFFICULTIES.flatMap((d) =>
      Array.from({ length: 60 }, (_, i) =>
        buildQuestion('verdadeiro_falso', i + 1, d, '2026-09-30T12:00:00.000Z'),
      ),
    )
    const r = runGates(drafts)
    expect(r.rejected.map((x) => x.violations)).toEqual([])
    expect(r.approved).toHaveLength(drafts.length)
    for (const q of r.approved) expect(q.options).toHaveLength(3)
  })
})
