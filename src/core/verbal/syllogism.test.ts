import { describe, expect, it } from 'vitest'
import {
  allStatements,
  entails,
  findCountermodel,
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
   * Este é o ponto que separa a lógica moderna da tradicional, e é uma
   * armadilha de prova: "All A are C" não garante que exista algum A.
   */
  it('All A are C NÃO entrega Some A are C', () => {
    expect(entails([all(0, 2)], some(0, 2))).toBe(false)
  })

  it('Barbara não entrega a versão particular', () => {
    expect(entails([all(0, 1), all(1, 2)], some(0, 2))).toBe(false)
  })

  it('o contramodelo é o conjunto vazio para A', () => {
    const cm = findCountermodel([all(0, 2)], some(0, 2))
    expect(cm).not.toBeNull()
    expect((cm as boolean[][])[0]!.some(Boolean)).toBe(false)
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
