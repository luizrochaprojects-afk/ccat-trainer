import { describe, expect, it } from 'vitest'
import { NIVEIS } from '../taxonomia'
import { GERADORES } from './index'
import { taxasDasHeuristicas } from './propriedades'

/**
 * A anti-meta do spec: acertar sem fazer a conta. Nenhum atalho de quem chuta
 * (o meio, as pontas, o meio entre as de mesma ordem, as inteiras, os dígitos
 * repetidos) pode passar de 40%; chutar às cegas dá 20%.
 *
 * Arquivo à parte porque é o teste pesado (milhares de questões por subskill):
 * junto dos outros, prendia um worker do vitest além do tempo de RPC.
 */
const SEEDS = 600

describe.each(Object.entries(GERADORES))('%s', (_, g) => {
  it.each(NIVEIS)('nível %i não se resolve por padrão das alternativas', (nivel) => {
    for (const [nome, taxa] of Object.entries(taxasDasHeuristicas(g, nivel, SEEDS))) {
      expect(taxa, `${nome} no nível ${nivel}`).toBeLessThanOrEqual(0.4)
    }
  })
})
