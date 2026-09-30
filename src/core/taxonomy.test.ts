import { describe, expect, it } from 'vitest'
import {
  acceptsVerification,
  ALL_SUBTIPOS,
  EXAM_BLUEPRINT,
  EXAM_QUESTION_COUNT,
  SUBTIPOS,
  SUBTIPO_LABEL,
  TIPOS,
  TIPO_LABEL,
  opcoesDoSubtipo,
  OPCOES_POR_QUESTAO,
  OPCOES_POR_SUBTIPO,
  tipoOfSubtipo,
  VERIFICATION_METHODS,
  VERIFICATION_METHODS_POR_SUBTIPO,
  verificationMethodsOf,
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

  it('série de letras é verificada por regra; as séries numéricas continuam exigindo o solver', () => {
    expect(verificationMethodsOf('math_series', 'serie_letras')).toEqual(['rule'])
    expect(acceptsVerification('math_series', 'rule', 'serie_letras')).toBe(true)
    expect(acceptsVerification('math_series', 'solver', 'serie_letras')).toBe(false)
    for (const sub of ['serie_simples', 'serie_alternada', 'serie_dois_passos']) {
      expect(acceptsVerification('math_series', 'rule', sub), sub).toBe(false)
      expect(acceptsVerification('math_series', 'solver', sub), sub).toBe(true)
    }
    // sem subtipo, vale a regra do tipo
    expect(verificationMethodsOf('math_series')).toEqual(VERIFICATION_METHODS.math_series)
  })

  it('toda exceção de verificação aponta para um subtipo que existe', () => {
    for (const sub of Object.keys(VERIFICATION_METHODS_POR_SUBTIPO)) {
      expect(tipoOfSubtipo(sub), sub).toBeDefined()
    }
  })

  it('tipoOfSubtipo faz o caminho de volta para todos os subtipos', () => {
    for (const tipo of TIPOS) {
      for (const sub of SUBTIPOS[tipo] as readonly string[]) {
        expect(tipoOfSubtipo(sub)).toBe(tipo)
      }
    }
    expect(tipoOfSubtipo('nao_existe')).toBeUndefined()
  })

  it('verdadeiro/falso/incerto tem 3 alternativas; todo outro subtipo continua com 5', () => {
    expect(opcoesDoSubtipo('verdadeiro_falso')).toBe(3)
    for (const sub of ALL_SUBTIPOS) {
      if (sub === 'verdadeiro_falso') continue
      expect(opcoesDoSubtipo(sub), sub).toBe(OPCOES_POR_QUESTAO)
    }
    expect(OPCOES_POR_QUESTAO).toBe(5)
    for (const sub of Object.keys(OPCOES_POR_SUBTIPO)) expect(tipoOfSubtipo(sub), sub).toBeDefined()
  })
})
