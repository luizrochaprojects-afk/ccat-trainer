import { describe, expect, it } from 'vitest'
import { avancar, criarSessao, encerrar, responder, restanteMs, resumir, type QmSessao } from './sessao'
import { SUBSKILLS } from './taxonomia'

const t0 = 1_000_000
const nova = (niveis = {}) => criarSessao({ seed: 1, agora: t0, niveis, historico: [] })
const certa = (s: QmSessao, agora: number) => responder(s, s.atual.answerId, agora)

describe('sessão diária', () => {
  it('aquecimento usa nível ≤ 2', () => {
    const cinco = Object.fromEntries(SUBSKILLS.map((s) => [s, 5]))
    expect(nova(cinco).atual.nivel).toBeLessThanOrEqual(2)
  })

  it('responder não avança; avancar avança', () => {
    let s = certa(nova(), t0 + 2_000)
    expect(s.indice).toBe(0)
    expect(s.respostas).toHaveLength(1)
    expect(s.revelada).not.toBeNull()
    s = avancar(s, t0 + 4_000)
    expect(s.indice).toBe(1)
    expect(s.revelada).toBeNull()
    expect(s.questaoIniciadaEm).toBe(t0 + 4_000)
  })

  it('responder duas vezes a mesma questão não grava duas respostas', () => {
    const s = responder(certa(nova(), t0 + 1_000), 'a', t0 + 2_000)
    expect(s.respostas).toHaveLength(1)
  })

  it('pular registra errada com o tempo gasto', () => {
    const s = responder(nova(), null, t0 + 7_000)
    expect(s.respostas[0]).toMatchObject({ chosenId: null, correta: false, elapsedMs: 7_000 })
  })

  it('depois do aquecimento, blocos de 5 na mesma subskill', () => {
    let s = avancar(certa(nova(), t0 + 1_000), t0 + 3 * 60_000)
    const subskills = new Set<string>()
    let agora = t0 + 3 * 60_000
    for (let i = 0; i < 5; i++) {
      subskills.add(s.atual.subskill)
      agora += 1_000
      s = avancar(certa(s, agora), agora)
    }
    expect(subskills.size).toBe(1)
  })

  it('bloco com 5 certas no tempo sobe o nível daquela subskill', () => {
    let agora = t0 + 3 * 60_000
    let s = avancar(certa(nova(), t0 + 1_000), agora)
    const alvo = s.atual.subskill
    for (let i = 0; i < 5; i++) {
      agora += 1_000
      s = avancar(certa(s, agora), agora)
    }
    expect(s.niveis[alvo]).toBe(2)
  })

  it('respostas do aquecimento não mexem no nível', () => {
    let s = nova()
    for (let i = 0; i < 10; i++) s = avancar(certa(s, t0 + i * 1_000 + 500), t0 + (i + 1) * 1_000)
    expect(Object.values(s.niveis).every((n) => n === 1)).toBe(true)
  })

  it('passar de 15 min com feedback aberto: avancar encerra', () => {
    let s = responder(nova(), 'a', t0 + 14 * 60_000 + 59_000)
    expect(s.status).toBe('rodando')
    s = avancar(s, t0 + 15 * 60_000 + 5_000)
    expect(s.status).toBe('encerrada')
    expect(s.respostas).toHaveLength(1)
    expect(restanteMs(s, t0 + 16 * 60_000)).toBe(0)
  })

  it('encerrar fecha a sessão e ignora respostas depois', () => {
    const s = encerrar(nova(), t0 + 5_000)
    expect(s.status).toBe('encerrada')
    expect(responder(s, 'a', t0 + 6_000).respostas).toHaveLength(0)
  })

  it('resumir agrupa por subskill', () => {
    let s = nova()
    s = avancar(certa(s, t0 + 2_000), t0 + 3_000)
    s = responder(s, null, t0 + 7_000)
    const linhas = resumir(s)
    expect(linhas.reduce((a, l) => a + l.n, 0)).toBe(2)
    expect(linhas.reduce((a, l) => a + l.certas, 0)).toBe(1)
    for (const l of linhas) expect(l.tempoMedioMs).toBeGreaterThan(0)
  })

  it('determinística para a mesma seed e os mesmos instantes', () => {
    const roda = () => avancar(certa(nova(), t0 + 1_000), t0 + 2_000)
    expect(roda()).toEqual(roda())
  })
})
