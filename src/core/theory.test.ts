import { describe, expect, it } from 'vitest'
import { LOCALES } from './i18n'
import { ALL_THEORY, subtipoTheory, subtiposSemTeoria, THEORY, theoryFor } from './theory'
import { SUBTIPOS, SUBTIPO_LABEL, TIPOS } from './taxonomy'

/**
 * A teoria é linkada da explicação de cada questão e da tela de resultado.
 * Um verbete faltando vira link quebrado exatamente quando a pessoa errou e
 * quer entender por quê — que é o pior momento possível.
 *
 * Desde o i18n, cada verificação roda nos DOIS idiomas: uma tradução faltando
 * é tão quebrada quanto um verbete faltando, e sem varrer os dois só apareceria
 * para quem trocasse o idioma.
 */
describe('cobertura da teoria', () => {
  it('todo tipo tem verbete', () => {
    for (const tipo of TIPOS) expect(theoryFor(tipo), tipo).toBeDefined()
    expect(ALL_THEORY).toHaveLength(TIPOS.length)
  })

  it('todo subtipo da taxonomia tem verbete', () => {
    expect(subtiposSemTeoria()).toEqual([])
  })

  it('não há verbete órfão apontando para subtipo inexistente', () => {
    for (const tipo of TIPOS) {
      const validos = new Set(SUBTIPOS[tipo] as readonly string[])
      for (const s of THEORY[tipo].subtipos) {
        expect(validos.has(s.subtipo), `${tipo}/${s.subtipo} não existe na taxonomia`).toBe(true)
      }
    }
  })

  it('o campo tipo do verbete bate com a chave do mapa', () => {
    for (const tipo of TIPOS) expect(THEORY[tipo].tipo).toBe(tipo)
  })

  it('não repete subtipo dentro do mesmo tipo', () => {
    for (const tipo of TIPOS) {
      const ids = THEORY[tipo].subtipos.map((s) => s.subtipo)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('qualidade do conteúdo, nos dois idiomas', () => {
  for (const locale of LOCALES) {
    describe(locale, () => {
      it('todo tipo tem título, resumo e dica de ritmo substantivos', () => {
        for (const t of ALL_THEORY) {
          expect(t.titulo[locale].length, `${t.tipo} título`).toBeGreaterThan(3)
          expect(t.resumo[locale].length, `${t.tipo} resumo`).toBeGreaterThan(80)
          expect(t.ritmo[locale].length, `${t.tipo} ritmo`).toBeGreaterThan(50)
        }
      })

      it('todo subtipo tem método com pelo menos 3 passos', () => {
        for (const t of ALL_THEORY) {
          for (const s of t.subtipos) {
            expect(s.metodo[locale].length, `${t.tipo}/${s.subtipo}`).toBeGreaterThanOrEqual(3)
            for (const passo of s.metodo[locale]) expect(passo.length).toBeGreaterThan(15)
          }
        }
      })

      it('os dois idiomas têm o MESMO número de passos', () => {
        for (const t of ALL_THEORY) {
          for (const s of t.subtipos) {
            expect(
              s.metodo.en.length,
              `${t.tipo}/${s.subtipo}: método com contagem diferente entre idiomas`,
            ).toBe(s.metodo.pt.length)
          }
        }
      })

      it('todo subtipo descreve o que a questão pede e a armadilha', () => {
        for (const t of ALL_THEORY) {
          for (const s of t.subtipos) {
            expect(s.oQuePede[locale].length, `${t.tipo}/${s.subtipo}`).toBeGreaterThan(20)
            expect(s.armadilha[locale].length, `${t.tipo}/${s.subtipo}`).toBeGreaterThan(40)
          }
        }
      })

      it('não sobrou marcação de rascunho', () => {
        const rascunho = /\b(TODO|FIXME|XXX)\b|lorem ipsum/
        for (const t of ALL_THEORY) {
          const texto = [
            t.resumo[locale],
            t.ritmo[locale],
            ...t.subtipos.flatMap((s) => [
              s.oQuePede[locale],
              s.armadilha[locale],
              ...s.metodo[locale],
            ]),
          ]
          for (const bloco of texto) expect(bloco, t.tipo).not.toMatch(rascunho)
        }
      })
    })
  }

  it('a dica de ritmo cita um alvo de tempo — a prova é cronometrada', () => {
    for (const t of ALL_THEORY) {
      expect(t.ritmo.pt, `${t.tipo} pt`).toMatch(/segundos?/)
      expect(t.ritmo.en, `${t.tipo} en`).toMatch(/seconds?/)
    }
  })
})

describe('subtipoTheory', () => {
  it('encontra o verbete de qualquer par tipo/subtipo válido', () => {
    for (const tipo of TIPOS) {
      for (const subtipo of SUBTIPOS[tipo] as readonly string[]) {
        const v = subtipoTheory(tipo, subtipo)
        expect(v, `${tipo}/${subtipo}`).toBeDefined()
        expect(v!.subtipo).toBe(subtipo)
        // o título do verbete e o rótulo da taxonomia falam do mesmo assunto
        expect(SUBTIPO_LABEL[v!.subtipo]).toBeTruthy()
      }
    }
  })

  it('devolve undefined para subtipo inexistente', () => {
    expect(subtipoTheory('spatial', 'telepatia')).toBeUndefined()
  })
})
