import type { QmGerador, QmQuestao } from '../questao'
import { SUBSKILLS_ATIVAS, type Nivel, type Subskill, type SubskillAtiva } from '../taxonomia'
import { gerarBreakeven } from './breakeven'
import { gerarCadeia } from './cadeia'
import { gerarCrescimento } from './crescimento'
import { gerarDivisao } from './divisao'
import { gerarFracoes } from './fracoes'
import { gerarMultiplicacao } from './multiplicacao'
import { gerarMediaPonderada } from './mediaPonderada'
import { gerarPorcentagem } from './porcentagem'
import { gerarUnidades } from './unidades'

export const GERADORES: Record<SubskillAtiva, QmGerador> = {
  multiplicacao: gerarMultiplicacao,
  divisao: gerarDivisao,
  porcentagem: gerarPorcentagem,
  fracoes: gerarFracoes,
  cadeia: gerarCadeia,
  crescimento: gerarCrescimento,
  unidades: gerarUnidades,
  breakeven: gerarBreakeven,
  media_ponderada: gerarMediaPonderada,
}

export function gerarQuestao(subskill: Subskill, nivel: Nivel, seed: number): QmQuestao {
  if (!(SUBSKILLS_ATIVAS as readonly Subskill[]).includes(subskill)) {
    throw new Error(`subskill sem gerador: ${subskill}`)
  }
  return GERADORES[subskill as SubskillAtiva](seed, nivel)
}
