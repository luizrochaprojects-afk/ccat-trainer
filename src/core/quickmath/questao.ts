import type { LocalizedText } from '../i18n'
import type { OptionId } from '../optionIds'
import type { Nivel, Subskill } from './taxonomia'

export interface QmOpcao {
  id: OptionId
  /** valor que a alternativa representa; numa estimativa, o já arredondado */
  valor: number
  texto: LocalizedText
  /** o erro que leva a este distrator; ausente na alternativa certa */
  erro?: LocalizedText
}

export interface QmQuestao {
  /** `${subskill}-${nivel}-${seed}` */
  id: string
  subskill: Subskill
  nivel: Nivel
  seed: number
  enunciado: LocalizedText
  opcoes: QmOpcao[]
  answerId: OptionId
  /** forma fechada do valor exato, avaliada por `evaluateExpression` nos testes */
  expression: string
  /** a resposta é o exato arredondado a 2 algarismos significativos */
  estimativa: boolean
  /** a conta feita do jeito rápido, mostrada no feedback */
  atalho: LocalizedText
  alvoMs: number
}

export type QmGerador = (seed: number, nivel: Nivel) => QmQuestao
