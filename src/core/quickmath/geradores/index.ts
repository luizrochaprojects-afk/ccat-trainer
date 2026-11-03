import type { QmGerador, QmQuestao } from '../questao'
import { SUBSKILLS_ATIVAS, type Nivel, type Subskill, type SubskillAtiva } from '../taxonomia'
import { gerarCadeia } from './cadeia'
import { gerarDivisao } from './divisao'
import { gerarFracoes } from './fracoes'
import { gerarMultiplicacao } from './multiplicacao'
import { gerarPorcentagem } from './porcentagem'

export const GERADORES: Record<SubskillAtiva, QmGerador> = {
  multiplicacao: gerarMultiplicacao,
  divisao: gerarDivisao,
  porcentagem: gerarPorcentagem,
  fracoes: gerarFracoes,
  cadeia: gerarCadeia,
}

export function gerarQuestao(subskill: Subskill, nivel: Nivel, seed: number): QmQuestao {
  if (!(SUBSKILLS_ATIVAS as readonly Subskill[]).includes(subskill)) {
    throw new Error(`subskill sem gerador nesta fatia: ${subskill}`)
  }
  return GERADORES[subskill as SubskillAtiva](seed, nivel)
}
