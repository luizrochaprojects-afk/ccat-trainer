import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import { normalizeText } from '../schema'
import { buildQuestion } from '../generators'
import { dedupSignature, runGates } from '../content/gates'
import { gerarSerieLetras } from './letras'
import { componentesDe, lerSerieDeLetras, termosDoEnunciado } from './alfabeto'

const RUNS = 200
const AGORA = '2026-09-21T12:00:00.000Z'

const FAMILIAS: Record<Difficulty, string[]> = {
  1: ['salto_fixo', 'trio_deslocado'],
  2: ['salto_crescente', 'trio_espelhado'],
  3: ['duas_trilhas', 'trio_passos_diferentes', 'letra_numero_linear'],
  4: ['letra_numero_geometrico', 'trio_salto_crescente', 'salto_crescente_reverso'],
  5: ['letra_numero_quadrado', 'duas_trilhas_crescente', 'trio_misto'],
}

const formaDe = (t: string): string => (componentesDe(t) ?? []).map((c) => c.tipo[0]).join('')
const resposta = (q: ReturnType<typeof gerarSerieLetras>): string =>
  q.options.find((o) => o.id === q.answerId)!.text

// --- O leitor do gate, contra os exemplos da prova real ------------------------

describe('leitor de séries de letras (segundo caminho do gate)', () => {
  it('resolve os exemplos reais da CCAT', () => {
    expect(lerSerieDeLetras('CEG, DFH, EGI, FHJ, ?')).toEqual(['GIK'])
    expect(lerSerieDeLetras('GHG, HHH, IHI, JHJ, ?')).toEqual(['KHK'])
    expect(lerSerieDeLetras('A, C, F, J, ?')).toEqual(['O'])
    expect(lerSerieDeLetras('A2, C4, E8, ?')).toEqual(['G16'])
  })

  it('lê duas trilhas trançadas', () => {
    expect(lerSerieDeLetras('A, Z, C, X, E, V, ?')).toEqual(['G'])
    expect(lerSerieDeLetras('A, Z, C, X, E, V, G, ?')).toEqual(['T'])
  })

  it('lê número que é o quadrado da posição da letra', () => {
    expect(lerSerieDeLetras('B4, D16, F36, H64, ?')).toEqual(['J100'])
  })

  it('não inventa regra onde não há', () => {
    expect(lerSerieDeLetras('A, Q, C, B, ?')).toEqual([])
    expect(lerSerieDeLetras('AB, C, DE, ?')).toEqual([]) // a forma muda de termo para termo
    expect(lerSerieDeLetras('A, b, C, ?')).toEqual([]) // minúscula não é termo válido
  })

  it('a leitura inteira e a trançada não brigam quando a série é de uma regra só', () => {
    expect(lerSerieDeLetras('A, B, C, D, E, ?')).toEqual(['F'])
    expect(lerSerieDeLetras('A1, B2, C4, D8, ?')).toEqual(['E16'])
  })

  it('não passa do Z', () => {
    expect(lerSerieDeLetras('Q, T, W, Z, ?')).toEqual([])
  })

  it('exige a vaga no fim', () => {
    expect(termosDoEnunciado('A, C, E, G')).toBeNull()
    expect(lerSerieDeLetras('A, C, E, G')).toEqual([])
  })
})

// --- Contrato comum -------------------------------------------------------------

describe('serie_letras', () => {
  it('é determinística por seed e nível', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const d of DIFFICULTIES) expect(gerarSerieLetras(seed, d)).toEqual(gerarSerieLetras(seed, d))
    }
  })

  it('o leitor independente fecha com uma resposta só, e ela é a marcada', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        const msg = `nível ${d} seed ${seed} [${q.familia}] ${q.stem}`
        expect(lerSerieDeLetras(q.stem), msg).toEqual([resposta(q)])
      }
    }
  })

  it('5 alternativas distintas, nenhuma igual a outra depois de normalizar', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        const textos = q.options.map((o) => normalizeText(o.text))
        expect(q.options).toHaveLength(OPCOES_POR_QUESTAO)
        expect(new Set(textos).size, `nível ${d} seed ${seed}`).toBe(OPCOES_POR_QUESTAO)
        expect(q.options.filter((o) => o.id === q.answerId)).toHaveLength(1)
      }
    }
  })

  it('o enunciado não contém a resposta, e nenhum distrator repete termo do enunciado', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        const termos = termosDoEnunciado(q.stem)!
        const msg = `nível ${d} seed ${seed}: ${q.stem} | ${q.options.map((o) => o.text).join(' ')}`
        expect(` ${normalizeText(q.stem)} `, msg).not.toContain(` ${normalizeText(resposta(q))} `)
        for (const o of q.options) expect(termos, msg).not.toContain(o.text)
      }
    }
  })

  it('todo distrator tem a forma da resposta (trio continua trio, letra + número continua)', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        const forma = formaDe(resposta(q))
        for (const o of q.options) expect(formaDe(o.text), `nível ${d} seed ${seed}: ${o.text}`).toBe(forma)
      }
    }
  })

  it('sempre há o deslize de contagem: um distrator a uma letra (ou unidade) da resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        const certa = componentesDe(resposta(q))!
        const umaCasa = q.options.filter((o) => {
          const difs = componentesDe(o.text)!.map((p, k) => Math.abs(p.valor - certa[k]!.valor))
          return difs.filter((x) => x !== 0).length === 1 && difs.includes(1)
        })
        expect(umaCasa.length, `nível ${d} seed ${seed}: ${q.options.map((o) => o.text).join(' ')}`).toBeGreaterThan(0)
      }
    }
  })

  it('cada nível usa só as famílias dele, e todas aparecem', () => {
    for (const d of DIFFICULTIES) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= RUNS; seed++) vistas.add(gerarSerieLetras(seed, d).familia as string)
      expect([...vistas].sort(), `nível ${d}`).toEqual([...FAMILIAS[d]].sort())
    }
  })

  it('números só entram do nível 3 em diante; trança só nos níveis 3 e 5', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = gerarSerieLetras(seed, d)
        if (d <= 2) expect(q.stem, `nível ${d}`).not.toMatch(/\d/)
        if (q.familia?.startsWith('duas_trilhas')) expect([3, 5]).toContain(d)
      }
    }
  })

  it('nível 1 fecha por diferença constante; do 4 em diante a maioria exige mais que isso', () => {
    const soDiferencaConstante = (stem: string): boolean => {
      const termos = termosDoEnunciado(stem)!.map((t) => componentesDe(t)!.map((c) => c.valor))
      return termos[0]!.every((_, k) => {
        const col = termos.map((t) => t[k]!)
        const d = col.slice(1).map((v, i) => v - col[i]!)
        return d.every((x) => x === d[0])
      })
    }
    for (let seed = 1; seed <= RUNS; seed++) {
      expect(soDiferencaConstante(gerarSerieLetras(seed, 1).stem)).toBe(true)
    }
    for (const d of [4, 5] as const) {
      let lineares = 0
      for (let seed = 1; seed <= RUNS; seed++) if (soDiferencaConstante(gerarSerieLetras(seed, d).stem)) lineares++
      expect(lineares / RUNS, `nível ${d}`).toBeLessThan(0.2)
    }
  })

  it('explicação nos dois idiomas, citando a resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 30; seed++) {
        const q = gerarSerieLetras(seed, d)
        expect(q.explanation.pt).toContain(resposta(q))
        expect(q.explanation.en).toContain(resposta(q))
        expect(q.explanation.pt.length).toBeGreaterThan(80)
        expect(q.explanation.en.length).toBeGreaterThan(80)
      }
    }
  })

  it('passa nos gates que o pipeline aplica, verificada por regra (sem expressão)', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 60; seed++) {
        const q = buildQuestion('serie_letras', seed, d, AGORA)
        expect(q.tipo).toBe('math_series')
        expect(q.verification.method).toBe('rule')
        expect(q.verification.expression).toBeUndefined()
        const r = runGates([q])
        expect(r.violations, `nível ${d} seed ${seed}: ${q.stem}`).toEqual([])
      }
    }
  })

  it('rende 50 questões distintas por nível dentro do orçamento de seeds', () => {
    for (const d of DIFFICULTIES) {
      const vistas = new Set<string>()
      for (let seed = 1; seed <= 400 && vistas.size < 50; seed++) {
        vistas.add(dedupSignature(buildQuestion('serie_letras', seed, d, AGORA)))
      }
      expect(vistas.size, `nível ${d}: espaço de questões pequeno demais`).toBe(50)
    }
  })
})
