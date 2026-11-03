import type { OptionId } from '../optionIds'
import type { Rng } from '../rng'
import { CHANCE_EXPLORAR, type Nivel, type Subskill } from './taxonomia'

/**
 * Para onde vai o próximo bloco e quando o nível muda.
 *
 * A sessão diária tem 15 minutos; gastar 3 deles numa subskill que já está
 * afiada é desperdício. Por isso cada bloco vai para a mais fraca — com uma
 * chance de exploração, para que nenhuma subskill fique esquecida só porque
 * estava boa na semana passada.
 */

export interface QmResposta {
  id: string
  sessaoId: string
  questaoId: string
  subskill: Subskill
  nivel: Nivel
  /** null = pulada */
  chosenId: OptionId | null
  correta: boolean
  elapsedMs: number
  alvoMs: number
  respondidaEm: number
}

const JANELA = 20
const MINIMO_PARA_JULGAR = 5

/**
 * Quanto a subskill precisa de treino: erro + lentidão. Com menos de 5
 * respostas não há o que julgar, e a subskill vem antes de qualquer outra.
 */
export function fraqueza(respostas: QmResposta[], subskill: Subskill): number {
  const recentes = respostas.filter((r) => r.subskill === subskill).slice(-JANELA)
  if (recentes.length < MINIMO_PARA_JULGAR) return Number.POSITIVE_INFINITY
  const acerto = recentes.filter((r) => r.correta).length / recentes.length
  const tempo = recentes.reduce((a, r) => a + r.elapsedMs, 0)
  const alvo = recentes.reduce((a, r) => a + r.alvoMs, 0)
  return 1 - acerto + 0.5 * Math.max(0, tempo / alvo - 1)
}

export function escolherSubskill(rng: Rng, respostas: QmResposta[], ativas: readonly Subskill[]): Subskill {
  if (rng.next() < CHANCE_EXPLORAR) return rng.pick(ativas)
  let melhor = ativas[0]!
  let maior = Number.NEGATIVE_INFINITY
  for (const s of ativas) {
    const f = fraqueza(respostas, s)
    if (f > maior) {
      maior = f
      melhor = s
    }
  }
  return melhor
}

/** Sobe com 4+ certas dentro do tempo; desce com 2 ou menos certas. */
export function ajustarNivel(nivel: Nivel, bloco: QmResposta[]): Nivel {
  const noTempo = bloco.filter((r) => r.correta && r.elapsedMs <= r.alvoMs).length
  const certas = bloco.filter((r) => r.correta).length
  if (noTempo >= 4) return Math.min(5, nivel + 1) as Nivel
  if (certas <= 2) return Math.max(1, nivel - 1) as Nivel
  return nivel
}
