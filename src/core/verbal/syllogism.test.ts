import { describe, expect, it } from 'vitest'
import {
  allStatements,
  entails,
  findCountermodel,
  isSatisfiable,
  renderStatement,
  VALID_FORMS,
  type Statement,
} from './syllogism'

const all = (s: number, p: number): Statement => ({ quantifier: 'all', subject: s, predicate: p })
const no = (s: number, p: number): Statement => ({ quantifier: 'no', subject: s, predicate: p })
const some = (s: number, p: number): Statement => ({ quantifier: 'some', subject: s, predicate: p })
const someNot = (s: number, p: number): Statement => ({
  quantifier: 'some-not',
  subject: s,
  predicate: p,
})

describe('entails — formas válidas clássicas', () => {
  it('Barbara: All A are B; All B are C ⟹ All A are C', () => {
    expect(entails([all(0, 1), all(1, 2)], all(0, 2))).toBe(true)
  })

  it('Celarent: All A are B; No B are C ⟹ No A are C', () => {
    expect(entails([all(0, 1), no(1, 2)], no(0, 2))).toBe(true)
  })

  it('Darii: All B are C; Some A are B ⟹ Some A are C', () => {
    expect(entails([all(1, 2), some(0, 1)], some(0, 2))).toBe(true)
  })

  it('Ferio: No B are C; Some A are B ⟹ Some A are not C', () => {
    expect(entails([no(1, 2), some(0, 1)], someNot(0, 2))).toBe(true)
  })

  it('toda forma declarada em VALID_FORMS é de fato válida', () => {
    for (const forma of VALID_FORMS) {
      expect(entails(forma.premises, forma.conclusion), `${forma.id} não é válida`).toBe(true)
    }
  })
})

describe('entails — falácias clássicas são rejeitadas', () => {
  it('conversão ilícita: All A are B NÃO dá All B are A', () => {
    expect(entails([all(0, 1)], all(1, 0))).toBe(false)
  })

  it('termo médio não distribuído: All A are B; All C are B NÃO dá All A are C', () => {
    expect(entails([all(0, 1), all(2, 1)], all(0, 2))).toBe(false)
  })

  it('a partir de Barbara, "All C are A" não se segue', () => {
    expect(entails([all(0, 1), all(1, 2)], all(2, 0))).toBe(false)
  })

  it('negação ilícita: No A are B; No B are C NÃO dá No A are C', () => {
    expect(entails([no(0, 1), no(1, 2)], no(0, 2))).toBe(false)
  })

  it('duas premissas particulares não concluem nada universal', () => {
    expect(entails([some(0, 1), some(1, 2)], some(0, 2))).toBe(false)
  })
})

describe('importação existencial', () => {
  /**
   * Este é o ponto que separa a lógica moderna da tradicional. Na booleana,
   * "All A are C" não garante que exista algum A; com importação existencial
   * (todo termo nomeado tem membro), garante.
   */
  const comImportacao = { existentialImport: true }

  it('booleana: All A are C NÃO entrega Some A are C', () => {
    expect(entails([all(0, 2)], some(0, 2))).toBe(false)
  })

  it('com importação: All A are C entrega Some A are C', () => {
    expect(entails([all(0, 2)], some(0, 2), comImportacao)).toBe(true)
  })

  it('booleana: o contramodelo é o conjunto vazio para A', () => {
    const cm = findCountermodel([all(0, 2)], some(0, 2))
    expect(cm).not.toBeNull()
    expect((cm as boolean[][])[0]!.some(Boolean)).toBe(false)
  })

  it('com importação: todo contramodelo tem os três predicados não vazios', () => {
    for (const conclusao of allStatements()) {
      const cm = findCountermodel([all(0, 1), all(2, 1)], conclusao, comImportacao)
      if (cm === null) continue
      for (const extensao of cm) expect(extensao.some(Boolean)).toBe(true)
    }
  })

  /**
   * O caso da auditoria: "No graduates are analysts. All engineers are
   * analysts." O gabarito é "No engineers are graduates", mas "Some engineers
   * are not graduates" também se segue para quem assume que existem
   * engenheiros — e o distrator virava segunda resposta certa.
   */
  it('Cesare com importação entrega a subalterna "Some A are not C"', () => {
    const cesare = [no(2, 1), all(0, 1)]
    expect(entails(cesare, no(0, 2))).toBe(true)
    expect(entails(cesare, someNot(0, 2))).toBe(false)
    expect(entails(cesare, someNot(0, 2), comImportacao)).toBe(true)
  })

  it('tudo que a booleana prova, a com importação também prova', () => {
    for (const forma of VALID_FORMS) {
      for (const conclusao of allStatements()) {
        if (entails(forma.premises, conclusao)) {
          expect(entails(forma.premises, conclusao, comImportacao), forma.id).toBe(true)
        }
      }
    }
  })

  it('continua rejeitando as falácias que não dependem de classe vazia', () => {
    // conversão ilícita e termo médio não distribuído seguem inválidos
    expect(entails([all(0, 1)], all(1, 0), comImportacao)).toBe(false)
    expect(entails([all(0, 1), all(2, 1)], all(0, 2), comImportacao)).toBe(false)
    expect(entails([all(0, 1), all(2, 1)], some(0, 2), comImportacao)).toBe(false)
  })
})

describe('isSatisfiable', () => {
  it('toda forma de VALID_FORMS tem premissas compatíveis com termos não vazios', () => {
    for (const forma of VALID_FORMS) {
      expect(isSatisfiable(forma.premises, { existentialImport: true }), forma.id).toBe(true)
    }
  })

  it('detecta premissas contraditórias', () => {
    expect(isSatisfiable([all(0, 1), no(0, 1)], { existentialImport: true })).toBe(false)
    // sem importação, A vazio satisfaz as duas
    expect(isSatisfiable([all(0, 1), no(0, 1)])).toBe(true)
  })
})

describe('VALID_FORMS — nenhuma forma é degenerada', () => {
  it('a conclusão precisa das DUAS premissas (nenhuma sozinha basta)', () => {
    for (const forma of VALID_FORMS) {
      for (const premissa of forma.premises) {
        expect(
          entails([premissa], forma.conclusion, { existentialImport: true }),
          `${forma.id}: uma premissa sozinha já dá a conclusão`,
        ).toBe(false)
      }
    }
  })

  it('a conclusão liga os termos extremos A e C, nunca o termo médio', () => {
    for (const forma of VALID_FORMS) {
      expect([forma.conclusion.subject, forma.conclusion.predicate].sort()).toEqual([0, 2])
    }
  })

  it('cada premissa usa o termo médio B', () => {
    for (const forma of VALID_FORMS) {
      for (const p of forma.premises) expect([p.subject, p.predicate]).toContain(1)
    }
  })

  it('sobram distratores de sobra mesmo com importação existencial', () => {
    for (const forma of VALID_FORMS) {
      const distratores = allStatements().filter(
        (s) => !entails(forma.premises, s, { existentialImport: true }),
      )
      expect(distratores.length, forma.id).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('findCountermodel', () => {
  it('devolve null exatamente quando a conclusão se segue', () => {
    for (const conclusao of allStatements()) {
      const premissas = [all(0, 1), all(1, 2)]
      expect(findCountermodel(premissas, conclusao) === null).toBe(
        entails(premissas, conclusao),
      )
    }
  })

  it('o contramodelo satisfaz as premissas e refuta a conclusão', () => {
    const premissas = [all(0, 1), all(2, 1)]
    const cm = findCountermodel(premissas, all(0, 2))
    expect(cm).not.toBeNull()
    // A ⊆ B e C ⊆ B, mas algum A fora de C
    const [A, B, C] = cm as boolean[][]
    for (let x = 0; x < A!.length; x++) {
      if (A![x]) expect(B![x]).toBe(true)
      if (C![x]) expect(B![x]).toBe(true)
    }
    expect(A!.some((temA, x) => temA && !C![x])).toBe(true)
  })
})

describe('renderStatement', () => {
  const termos = ['Zorans', 'Milvers', 'Trents']

  it('escreve as quatro formas em inglês', () => {
    expect(renderStatement(all(0, 1), termos)).toBe('All Zorans are Milvers.')
    expect(renderStatement(no(0, 1), termos)).toBe('No Zorans are Milvers.')
    expect(renderStatement(some(0, 1), termos)).toBe('Some Zorans are Milvers.')
    expect(renderStatement(someNot(0, 1), termos)).toBe('Some Zorans are not Milvers.')
  })
})

describe('allStatements', () => {
  it('cobre 4 quantificadores × 6 pares ordenados de predicados distintos', () => {
    expect(allStatements()).toHaveLength(24)
  })

  it('nunca relaciona um predicado consigo mesmo', () => {
    for (const s of allStatements()) expect(s.subject).not.toBe(s.predicate)
  })
})
