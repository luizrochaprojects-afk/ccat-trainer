import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { questionBankSchema, type Question } from '../schema'
import { EXAM_BLUEPRINT, EXAM_QUESTION_COUNT, TIPOS } from '../taxonomy'
import { composeDrill, composeExam } from './compose'
import { answer, createExam } from './engine'
import { scoreSession } from './score'

/**
 * Estes testes rodam contra o BANCO REAL, não contra fixtures.
 *
 * É de propósito: composição é onde o conteúdo e o motor se encontram, e um
 * banco que não sustenta o blueprint só aparece aqui. Fixture sintética
 * passaria e a simulação de verdade viria com 43 questões.
 */
let banco: Question[]

beforeAll(() => {
  banco = TIPOS.flatMap((tipo) => {
    const caminho = join(process.cwd(), 'content', 'approved', `${tipo}.json`)
    return questionBankSchema.parse(JSON.parse(readFileSync(caminho, 'utf8')))
  })
})

describe('composeExam', () => {
  it('monta exatamente 50 questões', () => {
    expect(composeExam(banco, { seed: 1 })).toHaveLength(EXAM_QUESTION_COUNT)
  })

  it('respeita o blueprint de tipos', () => {
    const fila = composeExam(banco, { seed: 7 })
    for (const tipo of TIPOS) {
      expect(fila.filter((q) => q.tipo === tipo).length, tipo).toBe(EXAM_BLUEPRINT[tipo])
    }
  })

  it('nunca repete questão dentro da mesma prova', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const fila = composeExam(banco, { seed })
      expect(new Set(fila.map((q) => q.id)).size).toBe(fila.length)
    }
  })

  it('a dificuldade é não-decrescente ao longo da prova', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const fila = composeExam(banco, { seed })
      for (let i = 1; i < fila.length; i++) {
        expect(
          fila[i]!.difficulty,
          `seed ${seed}: posição ${i} caiu de ${fila[i - 1]!.difficulty} para ${fila[i]!.difficulty}`,
        ).toBeGreaterThanOrEqual(fila[i - 1]!.difficulty)
      }
    }
  })

  it('intercala tipos: nunca 4 seguidos do mesmo', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const fila = composeExam(banco, { seed })
      let corrida = 1
      for (let i = 1; i < fila.length; i++) {
        corrida = fila[i]!.tipo === fila[i - 1]!.tipo ? corrida + 1 : 1
        expect(corrida, `seed ${seed}: ${corrida} ${fila[i]!.tipo} seguidos na posição ${i}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('cobre toda a faixa de dificuldade', () => {
    const fila = composeExam(banco, { seed: 3 })
    const niveis = new Set(fila.map((q) => q.difficulty))
    expect(niveis.size).toBeGreaterThanOrEqual(4)
  })

  it('evita questões já vistas quando há alternativa', () => {
    const primeira = composeExam(banco, { seed: 1 })
    const vistas = new Set(primeira.map((q) => q.id))
    const segunda = composeExam(banco, { seed: 2, seen: vistas })
    const repetidas = segunda.filter((q) => vistas.has(q.id))
    expect(repetidas).toHaveLength(0)
  })

  it('completa a prova mesmo com quase tudo já visto, em vez de encurtar', () => {
    const quaseTudo = new Set(banco.slice(0, banco.length - 20).map((q) => q.id))
    const fila = composeExam(banco, { seed: 5, seen: quaseTudo })
    expect(fila).toHaveLength(EXAM_QUESTION_COUNT)
  })

  it('é determinístico por seed', () => {
    expect(composeExam(banco, { seed: 42 }).map((q) => q.id)).toEqual(
      composeExam(banco, { seed: 42 }).map((q) => q.id),
    )
  })

  it('seeds diferentes dão provas diferentes', () => {
    const a = composeExam(banco, { seed: 1 }).map((q) => q.id).join()
    const b = composeExam(banco, { seed: 2 }).map((q) => q.id).join()
    expect(a).not.toBe(b)
  })

  /** A meta do PRD §8: o banco sustenta 20 simulações sem repetir questão. */
  it('rende 20 simulações consecutivas sem repetir nenhuma questão', () => {
    const vistas = new Set<string>()
    for (let prova = 1; prova <= 20; prova++) {
      const fila = composeExam(banco, { seed: prova, seen: vistas })
      expect(fila, `prova ${prova}`).toHaveLength(EXAM_QUESTION_COUNT)
      for (const q of fila) {
        expect(vistas.has(q.id), `prova ${prova}: "${q.id}" repetiu`).toBe(false)
        vistas.add(q.id)
      }
    }
    expect(vistas.size).toBe(20 * EXAM_QUESTION_COUNT)
  })
})

describe('composeDrill', () => {
  it('traz só o tipo pedido', () => {
    const fila = composeDrill(banco, { tipo: 'math_series', count: 12, seed: 1 })
    expect(fila).toHaveLength(12)
    expect(fila.every((q) => q.tipo === 'math_series')).toBe(true)
  })

  it('filtra por subtipo quando pedido', () => {
    const fila = composeDrill(banco, { tipo: 'spatial', subtipo: 'rotacao', count: 10, seed: 1 })
    expect(fila.every((q) => q.subtipo === 'rotacao')).toBe(true)
  })

  it('vem em dificuldade crescente', () => {
    const fila = composeDrill(banco, { tipo: 'verbal_vocab', count: 15, seed: 2 })
    for (let i = 1; i < fila.length; i++) {
      expect(fila[i]!.difficulty).toBeGreaterThanOrEqual(fila[i - 1]!.difficulty)
    }
  })

  it('não repete questão', () => {
    const fila = composeDrill(banco, { tipo: 'verbal_logic', count: 25, seed: 3 })
    expect(new Set(fila.map((q) => q.id)).size).toBe(fila.length)
  })

  it('devolve o que existe quando o pool é menor que o pedido', () => {
    const fila = composeDrill(banco, { tipo: 'spatial', subtipo: 'matriz', count: 10_000, seed: 1 })
    expect(fila.length).toBeGreaterThan(0)
    expect(fila.every((q) => q.subtipo === 'matriz')).toBe(true)
  })

  it('funciona para todos os tipos e subtipos do banco', () => {
    for (const tipo of TIPOS) {
      const subtipos = new Set(banco.filter((q) => q.tipo === tipo).map((q) => q.subtipo))
      for (const subtipo of subtipos) {
        const fila = composeDrill(banco, { tipo, subtipo, count: 5, seed: 1 })
        expect(fila.length, `${tipo}/${subtipo}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('integração: prova inteira respondida', () => {
  const T0 = 1_700_000_000_000

  it('acertando tudo: 50 acertos, percentil máximo, sem estouro', () => {
    let s = createExam(composeExam(banco, { seed: 11 }), T0)
    let t = T0
    for (let i = 0; i < EXAM_QUESTION_COUNT; i++) {
      const q = s.config.questions[s.index]
      if (!q) break
      t += 10_000
      s = answer(s, q.answerId, t)
    }
    const score = scoreSession(s, t)
    expect(score.raw).toBe(EXAM_QUESTION_COUNT)
    expect(score.reached).toBe(EXAM_QUESTION_COUNT)
    expect(score.percentile).toBe(99)
    expect(score.timedOut).toBe(0)
    expect(score.weakestTipo).toBeNull()
  })

  it('ritmo lento: o relógio corta a prova antes das 50', () => {
    let s = createExam(composeExam(banco, { seed: 12 }), T0)
    let t = T0
    for (let i = 0; i < EXAM_QUESTION_COUNT; i++) {
      const q = s.config.questions[s.index]
      if (!q || s.status === 'finished') break
      t += 30_000 // 30s por questão: o dobro do ritmo necessário
      s = answer(s, q.answerId, t)
    }
    const score = scoreSession(s, t)
    expect(score.reached).toBeLessThan(EXAM_QUESTION_COUNT)
    expect(score.raw).toBe(score.reached)
    expect(score.durationMs).toBeLessThanOrEqual(15 * 60 * 1000)
  })

  it('errando um tipo inteiro, o diagnóstico aponta esse tipo', () => {
    let s = createExam(composeExam(banco, { seed: 13 }), T0)
    let t = T0
    for (let i = 0; i < EXAM_QUESTION_COUNT; i++) {
      const q = s.config.questions[s.index]
      if (!q) break
      t += 5_000
      const errado = q.options.find((o) => o.id !== q.answerId)!.id
      s = answer(s, q.tipo === 'spatial' ? errado : q.answerId, t)
    }
    const score = scoreSession(s, t)
    expect(score.weakestTipo).toBe('spatial')
    expect(score.byTipo.find((b) => b.tipo === 'spatial')!.accuracy).toBe(0)
  })
})
