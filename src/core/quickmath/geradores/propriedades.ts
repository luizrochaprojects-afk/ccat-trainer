import { expect } from 'vitest'
import { evaluateExpression } from '../../math/solver'
import { ordemDeGrandeza } from '../formato'
import type { QmGerador, QmOpcao, QmQuestao } from '../questao'
import { NIVEIS, type Nivel } from '../taxonomia'

/**
 * O "gate" do Quick Math: em vez de um banco aprovado, toda questão que um
 * gerador consegue produzir precisa passar por estas propriedades. Só os
 * testes importam este arquivo.
 */
export function verificarPropriedades(g: QmGerador, seeds = 200): void {
  for (const nivel of NIVEIS) {
    for (let seed = 1; seed <= seeds; seed++) {
      const q = g(seed, nivel)
      const rotulo = `${q.id}: ${q.enunciado.pt}`
      const certa = q.opcoes.find((o) => o.id === q.answerId)
      expect(certa, rotulo).toBeDefined()
      if (!certa) continue

      const exato = evaluateExpression(q.expression)
      const tolerancia = q.estimativa ? 0.05 : 1e-9
      expect(Math.abs(certa.valor - exato) / Math.abs(exato), rotulo).toBeLessThanOrEqual(tolerancia)
      expect(q.opcoes, rotulo).toHaveLength(5)

      const folga = q.estimativa ? 0.15 : 0.1
      const outras = q.opcoes.filter((o) => o !== certa)
      for (const o of outras) {
        expect(Math.abs(o.valor - certa.valor) / Math.abs(certa.valor), rotulo).toBeGreaterThanOrEqual(
          folga - 1e-12,
        )
      }
      const mesmaOrdem = outras.filter((o) => ordemDeGrandeza(o.valor) === ordemDeGrandeza(certa.valor))
      expect(mesmaOrdem.length, rotulo).toBeGreaterThanOrEqual(2)

      for (const l of ['pt', 'en'] as const) {
        expect(new Set(q.opcoes.map((o) => o.texto[l])).size, rotulo).toBe(5)
        expect(q.enunciado[l].length, rotulo).toBeGreaterThan(0)
        expect(q.atalho[l].length, rotulo).toBeGreaterThan(0)
        // resíduo de ponto flutuante ou número longo sem separador de milhar
        expect(q.atalho[l], `${rotulo} — atalho ilegível`).not.toMatch(/\d[.,]\d{4,}|\d{5,}/)
      }
      expect(q.nivel).toBe(nivel)
      expect(g(seed, nivel)).toEqual(q)
    }
  }
}

/** Primeira questão, nas seeds 1..500, que satisfaz o predicado. */
export function encontrar(g: QmGerador, nivel: Nivel, pred: (q: QmQuestao) => boolean): QmQuestao {
  for (let seed = 1; seed <= 500; seed++) {
    const q = g(seed, nivel)
    if (pred(q)) return q
  }
  throw new Error('nenhuma seed satisfez o predicado')
}

/**
 * Atalhos de quem tenta acertar sem fazer a conta. Cada um devolve a
 * alternativa que escolheria; a taxa de acerto deles mede o quanto as
 * alternativas entregam a resposta.
 *
 *  - mediana: o valor do meio;
 *  - dígitos repetidos: entre as alternativas cujos primeiros dígitos aparecem
 *    em mais de uma, a do meio (baixa ou alta).
 */
const chave = (v: number) => {
  const a = Math.abs(v)
  return String(Number((a / 10 ** Math.floor(Math.log10(a))).toPrecision(2)))
}
const ordenar = (os: QmOpcao[]) => [...os].sort((x, y) => x.valor - y.valor)

export const HEURISTICAS: Record<string, (q: QmQuestao) => QmOpcao | undefined> = {
  mediana: (q) => ordenar(q.opcoes)[2],
  repetidosBaixa: (q) => {
    const r = repetidos(q)
    return r.length ? r[Math.floor((r.length - 1) / 2)] : undefined
  },
  repetidosAlta: (q) => {
    const r = repetidos(q)
    return r.length ? r[Math.ceil((r.length - 1) / 2)] : undefined
  },
}

function repetidos(q: QmQuestao): QmOpcao[] {
  const contagem = new Map<string, number>()
  for (const o of q.opcoes) contagem.set(chave(o.valor), (contagem.get(chave(o.valor)) ?? 0) + 1)
  return ordenar(q.opcoes.filter((o) => (contagem.get(chave(o.valor)) ?? 0) > 1))
}

/** Taxa de acerto de cada heurística em `seeds` questões do nível. */
export function taxasDasHeuristicas(g: QmGerador, nivel: Nivel, seeds = 1000): Record<string, number> {
  const acertos: Record<string, number> = Object.fromEntries(Object.keys(HEURISTICAS).map((k) => [k, 0]))
  for (let seed = 1; seed <= seeds; seed++) {
    const q = g(seed, nivel)
    for (const [nome, h] of Object.entries(HEURISTICAS)) if (h(q)?.id === q.answerId) acertos[nome]!++
  }
  return Object.fromEntries(Object.entries(acertos).map(([k, v]) => [k, v / seeds]))
}
