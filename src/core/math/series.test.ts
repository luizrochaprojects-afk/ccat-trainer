import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, type Difficulty } from '../taxonomy'
import { SERIES_GENERATORS, SERIES_GENERATOR_IDS } from './series'
import { evaluateExpression, parseNumber } from './solver'
import { normalizeText } from '../schema'
import { buildQuestion } from '../generators'
import { runGates } from '../content/gates'

const RUNS = 200

const termosDe = (stem: string): number[] =>
  stem
    .replace(', ?', '')
    .split(',')
    .map((t) => parseNumber(t.trim()))

const difs = (t: number[]): number[] => t.slice(1).map((v, i) => v - (t[i] as number))
const constantes = (xs: number[]): boolean =>
  xs.length > 0 && xs.every((x) => Math.abs(x - (xs[0] as number)) < 1e-9)

// --- Leitores independentes ---------------------------------------------------
//
// Cada leitor olha SÓ os termos exibidos e tenta recuperar a regra. Se o
// gerador afirma a família X, o leitor de X precisa fechar com todos os termos
// e prever exatamente a resposta — é a garantia de que a regra está na tela,
// não só na cabeça do gerador.

/** Diferenças sucessivas até ficarem constantes (polinômio de grau ≤ ordemMax). */
function porDiferencas(t: number[], ordemMax: number): number | null {
  const niveis = [t]
  for (let o = 1; o <= ordemMax; o++) {
    const d = difs(niveis.at(-1) as number[])
    if (d.length < 2) return null
    niveis.push(d)
    if (constantes(d)) {
      let prox = d[0] as number
      for (let k = niveis.length - 2; k >= 0; k--) prox = ((niveis[k] as number[]).at(-1) as number) + prox
      return prox
    }
  }
  return null
}

function porRazao(t: number[]): number | null {
  if (t.some((v) => v === 0)) return null
  const r = t.slice(1).map((v, i) => v / (t[i] as number))
  return constantes(r) ? (t.at(-1) as number) * (r[0] as number) : null
}

function porSomaDosAnteriores(t: number[], quantos: number): number | null {
  for (let i = quantos; i < t.length; i++) {
    const soma = t.slice(i - quantos, i).reduce((a, b) => a + b, 0)
    if (t[i] !== soma) return null
  }
  return t.slice(-quantos).reduce((a, b) => a + b, 0)
}

/** t(i+1) = r·t(i) + c */
function porAfim(t: number[]): number | null {
  const [t0, t1, t2] = t as [number, number, number]
  if (t1 === t0) return null
  const r = (t2 - t1) / (t1 - t0)
  const c = t1 - r * t0
  for (let i = 1; i < t.length; i++) {
    if (Math.abs((t[i] as number) - (r * (t[i - 1] as number) + c)) > 1e-9) return null
  }
  return r * (t.at(-1) as number) + c
}

function porDiferencasGeometricas(t: number[]): number | null {
  const d = difs(t)
  const r = porRazao(d)
  return r === null ? null : (t.at(-1) as number) + r
}

function porMultiplicadorCrescente(t: number[]): number | null {
  if (t.some((v) => v === 0)) return null
  const q = t.slice(1).map((v, i) => v / (t[i] as number))
  if (!difs(q).every((x) => x === 1)) return null
  return (t.at(-1) as number) * ((q.at(-1) as number) + 1)
}

const LEITOR_SIMPLES: Record<string, (t: number[]) => number | null> = {
  diferenca_crescente: (t) => porDiferencas(t, 2),
  dobro: porRazao,
  quadrados: (t) => porDiferencas(t, 2),
  segunda_diferenca: (t) => porDiferencas(t, 2),
  geometrica: porRazao,
  fibonacci: (t) => porSomaDosAnteriores(t, 2),
  quadrados_mais_k: (t) => porDiferencas(t, 2),
  segunda_diferenca_mista: (t) => porDiferencas(t, 2),
  geometrica_grande: porRazao,
  afim: porAfim,
  cubos: (t) => porDiferencas(t, 3),
  produto_consecutivo: (t) => porDiferencas(t, 2),
  diferencas_geometricas: porDiferencasGeometricas,
  segunda_diferenca_negativa: (t) => porDiferencas(t, 2),
  cubos_mais_k: (t) => porDiferencas(t, 3),
  multiplicador_crescente: porMultiplicadorCrescente,
  geometrica_negativa: porRazao,
  fracionaria: porRazao,
  tribonacci: (t) => porSomaDosAnteriores(t, 3),
  diferencas_alternadas: porDiferencasGeometricas,
}

const FAMILIAS_SIMPLES: Record<Difficulty, string[]> = {
  1: ['diferenca_crescente', 'dobro', 'quadrados'],
  2: ['segunda_diferenca', 'geometrica', 'fibonacci', 'quadrados_mais_k'],
  3: ['segunda_diferenca_mista', 'geometrica_grande', 'afim', 'cubos'],
  4: ['produto_consecutivo', 'diferencas_geometricas', 'segunda_diferenca_negativa', 'cubos_mais_k'],
  5: ['multiplicador_crescente', 'geometrica_negativa', 'fracionaria', 'tribonacci', 'diferencas_alternadas'],
}

const FAMILIAS_ALTERNADAS: Record<Difficulty, string[]> = {
  1: ['duas_lineares'],
  2: ['linear_com_curva'],
  3: ['duas_curvas'],
  4: ['curva_com_negativos'],
  5: ['pares', 'duas_negativas'],
}

const FAMILIAS_DOIS_PASSOS: Record<Difficulty, string[]> = {
  1: ['soma_e_subtrai', 'soma_e_dobra'],
  2: ['soma_e_triplica', 'dobra_e_subtrai'],
  3: ['triplica_e_subtrai', 'subtrai_e_dobra', 'quadruplica_e_soma'],
  4: ['ciclo_de_tres', 'soma_crescente'],
  5: ['sinal_alternado', 'ciclo_de_tres_negativo', 'subtracao_crescente'],
}

const FAMILIAS = {
  serie_simples: FAMILIAS_SIMPLES,
  serie_alternada: FAMILIAS_ALTERNADAS,
  serie_dois_passos: FAMILIAS_DOIS_PASSOS,
} as const

// --- Contrato comum -----------------------------------------------------------

describe('geradores de séries numéricas', () => {
  for (const id of SERIES_GENERATOR_IDS) {
    const gerar = SERIES_GENERATORS[id]

    describe(id, () => {
      it('é determinístico por seed e nível', () => {
        for (let seed = 1; seed <= 50; seed++) {
          for (const d of DIFFICULTIES) {
            expect(gerar(seed, d)).toEqual(gerar(seed, d))
          }
        }
      })

      it('a expressão canônica confere com a alternativa marcada', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const marcada = q.options.find((o) => o.id === q.answerId)
            expect(marcada, `${id} nível ${d} seed ${seed}`).toBeDefined()

            // caminho 1: o valor que o gerador afirma
            // caminho 2: a expressão avaliada pelo solver, independente
            expect(evaluateExpression(q.expression)).toBeCloseTo(q.answerValue, 9)
            // e o que está escrito na alternativa bate com os dois
            expect(parseNumber(marcada!.text)).toBeCloseTo(q.answerValue, 9)
          }
        }
      })

      it('nenhum distrator é igual à resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const valores = q.options.map((o) => parseNumber(o.text))
            const iguais = valores.filter((v) => Math.abs(v - q.answerValue) < 1e-9)
            expect(iguais, `${id} nível ${d} seed ${seed}`).toHaveLength(1)
          }
        }
      })

      it('não repete alternativa, nem depois de normalizar (o gate descarta o sinal)', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const textos = q.options.map((o) => normalizeText(o.text))
            expect(new Set(textos).size, `${id} nível ${d} seed ${seed}`).toBe(textos.length)
          }
        }
      })

      it('4 alternativas nos níveis 1-2, 5 nos níveis 3-5', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 40; seed++) {
            expect(gerar(seed, d).options).toHaveLength(d <= 2 ? 4 : 5)
          }
        }
      })

      it('o enunciado mostra a série e termina em "?"', () => {
        for (const d of DIFFICULTIES) {
          const q = gerar(7, d)
          expect(q.stem.endsWith(', ?')).toBe(true)
          expect(q.stem.split(',').length).toBeGreaterThanOrEqual(5)
        }
      })

      it('o enunciado não contém a resposta', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const mostrados = termosDe(q.stem).map(Math.abs)
            expect(mostrados, `${id} nível ${d} seed ${seed}`).not.toContain(Math.abs(q.answerValue))
          }
        }
      })

      it('nenhuma série tem diferença constante entre vizinhos', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            expect(constantes(difs(termosDe(q.stem))), `${id} nível ${d} seed ${seed}: ${q.stem}`).toBe(false)
          }
        }
      })

      it('nenhum distrator repete número do enunciado nem destoa no sinal ou na escala', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const termos = termosDe(q.stem)
            const mostrados = termos.map(Math.abs)
            const soPositivos = Math.min(...termos, q.answerValue) > 0
            const limite = Math.max(Math.abs(q.answerValue), Math.abs(termos.at(-1) as number), 12)
            const msg = `${id} nível ${d} seed ${seed}: ${q.stem} | ${q.options.map((o) => o.text).join(' ')}`
            for (const o of q.options) {
              const v = parseNumber(o.text)
              expect(mostrados, msg).not.toContain(Math.abs(v))
              if (soPositivos) expect(v, msg).toBeGreaterThan(0)
              expect(Math.abs(v - q.answerValue), msg).toBeLessThanOrEqual(limite)
            }
          }
        }
      })

      it('só a família fracionária sai do inteiro, e com no máximo duas casas', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= RUNS; seed++) {
            const q = gerar(seed, d)
            const valores = [...termosDe(q.stem), ...q.options.map((o) => parseNumber(o.text))]
            for (const v of valores) {
              expect(Math.abs(v * 100 - Math.round(v * 100))).toBeLessThan(1e-9)
            }
            if (q.familia !== 'fracionaria') {
              expect(valores.every(Number.isInteger), `${id} nível ${d} seed ${seed}`).toBe(true)
            }
          }
        }
      })

      it('cada nível usa só as famílias dele, e todas aparecem', () => {
        for (const d of DIFFICULTIES) {
          const esperadas = FAMILIAS[id][d]
          const vistas = new Set<string>()
          for (let seed = 1; seed <= RUNS; seed++) vistas.add(gerar(seed, d).familia as string)
          expect([...vistas].sort(), `${id} nível ${d}`).toEqual([...esperadas].sort())
        }
      })

      it('passa nos gates que o pipeline aplica', () => {
        for (const d of DIFFICULTIES) {
          for (let seed = 1; seed <= 60; seed++) {
            const r = runGates([buildQuestion(id, seed, d, '2026-09-21T12:00:00.000Z')])
            expect(r.violations, `${id} nível ${d} seed ${seed}`).toEqual([])
          }
        }
      })

      /**
       * O que importa não é "seeds diferentes dão questões diferentes" (colisão
       * é normal e o gate de dedup resolve), e sim: o espaço de questões é
       * grande o bastante para preencher a meta de 150 aprovadas por tipo?
       * Um gerador com espaço pequeno só é descoberto quando o pipeline já
       * está cuspindo duplicata.
       */
      it('rende 50 questões distintas por nível dentro do orçamento de seeds', () => {
        for (const d of DIFFICULTIES) {
          const stems = new Set<string>()
          for (let seed = 1; seed <= 400 && stems.size < 50; seed++) {
            stems.add(gerar(seed, d).stem)
          }
          expect(stems.size, `${id} nível ${d}: espaço de questões pequeno demais`).toBe(50)
        }
      })
    })
  }
})

// --- serie_simples ------------------------------------------------------------

describe('serie_simples: a regra é recuperável dos termos mostrados', () => {
  it('o leitor da família declarada fecha com todos os termos e prevê a resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_simples(seed, d)
        const ler = LEITOR_SIMPLES[q.familia as string]
        expect(ler, `família sem leitor: ${q.familia}`).toBeDefined()
        expect(ler!(termosDe(q.stem)), `nível ${d} seed ${seed} [${q.familia}] ${q.stem}`).toBe(q.answerValue)
      }
    }
  })

  it('nível 1 já pede regra não linear: diferença que cresce, dobro ou quadrados', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SERIES_GENERATORS.serie_simples(seed, 1)
      const t = termosDe(q.stem)
      expect(porDiferencas(t, 1), q.stem).toBeNull()
      expect(porDiferencas(t, 2) ?? porRazao(t), q.stem).toBe(q.answerValue)
      // números pequenos: é o nível de entrada
      expect(Math.max(...t, q.answerValue)).toBeLessThanOrEqual(1000)
    }
  })

  it('níveis 4-5 exigem mais que diferença de 2ª ordem ou razão constante na maioria das vezes', () => {
    for (const d of [4, 5] as const) {
      let simples = 0
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_simples(seed, d)
        const t = termosDe(q.stem)
        if (porDiferencas(t, 2) === q.answerValue || porRazao(t) === q.answerValue) simples++
      }
      // Caem aqui de propósito: n² + n e a diferença que atravessa o zero (nível 4),
      // razão negativa e razão fracionária (nível 5). O resto precisa de outra leitura.
      expect(simples / RUNS, `nível ${d}`).toBeLessThan(0.6)
    }
  })

  it('negativos e decimais só aparecem no fim da escala', () => {
    for (const d of DIFFICULTIES) {
      let negativos = 0
      let decimais = 0
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_simples(seed, d)
        const t = [...termosDe(q.stem), q.answerValue]
        if (t.some((v) => v < 0)) negativos++
        if (t.some((v) => !Number.isInteger(v))) decimais++
      }
      if (d <= 2) expect(negativos, `nível ${d}`).toBe(0)
      if (d >= 4) expect(negativos, `nível ${d}`).toBeGreaterThan(20)
      if (d < 5) expect(decimais, `nível ${d}`).toBe(0)
      else expect(decimais).toBeGreaterThan(10)
    }
  })
})

// --- serie_alternada ------------------------------------------------------------

/** Candidatas a f em (x, f(x)) — o leitor procura TODAS as que fecham. */
const FUNCOES_CANDIDATAS: ((x: number) => number)[] = [
  (x) => x * x,
  ...[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map((k) => (x: number) => 2 * x + k),
  ...[1, 2, 3, 4, 5].map((k) => (x: number) => 3 * x - k),
  ...[-3, -2, -1, 1, 2, 3].map((k) => (x: number) => x * x + k),
]

const trilhas = (t: number[]): [number[], number[]] => [
  t.filter((_, i) => i % 2 === 0),
  t.filter((_, i) => i % 2 === 1),
]
const linear = (trilha: number[]): boolean => constantes(difs(trilha))

describe('serie_alternada: a dificuldade cresce com o nível', () => {
  it('a vaga continua a trilha certa, e a regra dela é recuperável', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_alternada(seed, d)
        if (q.familia === 'pares') continue
        const t = termosDe(q.stem)
        const [impares, pares] = trilhas(t)
        const daVaga = t.length % 2 === 0 ? impares : pares
        const previsto = porDiferencas(daVaga, 2) ?? porRazao(daVaga)
        expect(previsto, `nível ${d} seed ${seed}: ${q.stem}`).toBe(q.answerValue)
      }
    }
  })

  it('nível 1: duas lineares; nível 2: uma linear; nível 3+: nenhuma', () => {
    const esperado: Record<Difficulty, number> = { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0 }
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_alternada(seed, d)
        const quantas = trilhas(termosDe(q.stem)).filter(linear).length
        expect(quantas, `nível ${d} seed ${seed}: ${q.stem}`).toBe(esperado[d])
      }
    }
  })

  it('a vaga cai ora numa trilha, ora na outra', () => {
    for (const d of DIFFICULTIES) {
      const paridades = new Set<number>()
      for (let seed = 1; seed <= 60; seed++) {
        paridades.add(termosDe(SERIES_GENERATORS.serie_alternada(seed, d).stem).length % 2)
      }
      if (d !== 5) expect(paridades.size, `nível ${d}`).toBe(2)
    }
  })

  it('níveis 4-5 passam por número negativo, exceto os pares (x, f(x))', () => {
    for (const d of [4, 5] as const) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_alternada(seed, d)
        if (q.familia === 'pares') continue
        expect(termosDe(q.stem).some((v) => v < 0), q.stem).toBe(true)
      }
    }
  })

  it('pares (x, f(x)): toda f que fecha com os pares visíveis dá a mesma resposta', () => {
    let vistos = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SERIES_GENERATORS.serie_alternada(seed, 5)
      if (q.familia !== 'pares') continue
      vistos++
      const t = termosDe(q.stem)
      const xs = t.filter((_, i) => i % 2 === 0)
      const ys = t.filter((_, i) => i % 2 === 1)
      const fecham = FUNCOES_CANDIDATAS.filter((f) => ys.every((y, i) => f(xs[i] as number) === y))
      expect(fecham.length, q.stem).toBeGreaterThan(0)
      for (const f of fecham) expect(f(xs.at(-1) as number), q.stem).toBe(q.answerValue)
      // e os x seguem regra própria, não linear
      expect(porDiferencas(xs, 2), q.stem).not.toBeNull()
      expect(linear(xs)).toBe(false)
    }
    expect(vistos).toBeGreaterThan(50)
  })
})

// --- serie_dois_passos ----------------------------------------------------------

/**
 * Lê o ciclo de operações dos termos: para cada comprimento de ciclo L, cada
 * fase precisa fechar como soma constante, multiplicação constante ou soma que
 * cresce de 1 em 1. Devolve a previsão de cada L que fecha.
 */
function leiturasDeCiclo(t: number[]): number[] {
  const previsoes: number[] = []
  const transicoes = t.slice(1).map((y, i) => [t[i] as number, y] as const)
  const alvo = transicoes.length // índice da próxima transição

  for (const L of [2, 3]) {
    const preverFase: ((x: number) => number)[] = []
    let fecha = true
    for (let fase = 0; fase < L; fase++) {
      const trans = transicoes.filter((_, i) => i % L === fase)
      if (trans.length < 2) {
        fecha = false
        break
      }
      const somas = trans.map(([x, y]) => y - x)
      const razoes = trans.every(([x]) => x !== 0) ? trans.map(([x, y]) => y / x) : []
      const passos = difs(somas)
      if (constantes(somas)) preverFase.push((x) => x + (somas[0] as number))
      else if (razoes.length > 0 && constantes(razoes)) preverFase.push((x) => x * (razoes[0] as number))
      else if (passos.every((p) => p === 1) || passos.every((p) => p === -1)) {
        preverFase.push((x) => x + (somas.at(-1) as number) + (passos[0] as number))
      } else {
        fecha = false
        break
      }
    }
    if (fecha) previsoes.push((preverFase[alvo % L] as (x: number) => number)(t.at(-1) as number))
  }
  return previsoes
}

describe('serie_dois_passos: o ciclo de operações é recuperável', () => {
  it('toda leitura de ciclo que fecha com os termos dá a resposta', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_dois_passos(seed, d)
        const leituras = leiturasDeCiclo(termosDe(q.stem))
        const msg = `nível ${d} seed ${seed} [${q.familia}] ${q.stem}`
        expect(leituras.length, msg).toBeGreaterThan(0)
        for (const v of leituras) expect(v, msg).toBe(q.answerValue)
      }
    }
  })

  it('não é geométrica por acaso', () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= RUNS; seed++) {
        const q = SERIES_GENERATORS.serie_dois_passos(seed, d)
        expect(porRazao(termosDe(q.stem)), q.stem).toBeNull()
      }
    }
  })

  it('do nível 2 em diante a vaga cai em qualquer uma das operações', () => {
    for (const d of [2, 3, 4, 5] as const) {
      const tamanhos = new Set<number>()
      for (let seed = 1; seed <= 60; seed++) {
        tamanhos.add(termosDe(SERIES_GENERATORS.serie_dois_passos(seed, d).stem).length)
      }
      expect(tamanhos.size, `nível ${d}`).toBeGreaterThan(1)
    }
  })

  it('nível 5 passa por número negativo na maioria das vezes', () => {
    let negativos = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const q = SERIES_GENERATORS.serie_dois_passos(seed, 5)
      if ([...termosDe(q.stem), q.answerValue].some((v) => v < 0)) negativos++
    }
    expect(negativos / RUNS).toBeGreaterThan(0.5)
  })
})
