import { describe, expect, it } from 'vitest'
import {
  ALL_SUBTIPOS,
  EXAM_BLUEPRINT,
  EXAM_QUESTION_COUNT,
  SUBTIPOS,
  SUBTIPO_LABEL,
  TIPOS,
  TIPO_LABEL,
  tipoOfSubtipo,
} from './taxonomy'

describe('taxonomia', () => {
  it('o blueprint da simulação soma exatamente 50 questões', () => {
    const total = TIPOS.reduce((acc, t) => acc + EXAM_BLUEPRINT[t], 0)
    expect(total).toBe(EXAM_QUESTION_COUNT)
  })

  it('todo tipo aparece no blueprint com pelo menos uma questão', () => {
    for (const tipo of TIPOS) {
      expect(EXAM_BLUEPRINT[tipo]).toBeGreaterThan(0)
    }
  })

  it('não há subtipo repetido entre tipos', () => {
    expect(new Set(ALL_SUBTIPOS).size).toBe(ALL_SUBTIPOS.length)
  })

  it('todo tipo e subtipo tem rótulo de UI', () => {
    for (const tipo of TIPOS) expect(TIPO_LABEL[tipo]).toBeTruthy()
    for (const sub of ALL_SUBTIPOS) expect(SUBTIPO_LABEL[sub]).toBeTruthy()
  })

  it('tipoOfSubtipo faz o caminho de volta para todos os subtipos', () => {
    for (const tipo of TIPOS) {
      for (const sub of SUBTIPOS[tipo] as readonly string[]) {
        expect(tipoOfSubtipo(sub)).toBe(tipo)
      }
    }
    expect(tipoOfSubtipo('nao_existe')).toBeUndefined()
  })
})
