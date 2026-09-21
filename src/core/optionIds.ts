/** Ids de alternativa, compartilhados por todos os geradores. A ordem casa com
 *  os atalhos de teclado A-E / 1-5 da tela de sessão (PRD §6). */
export const OPTION_IDS = ['a', 'b', 'c', 'd', 'e'] as const

export type OptionId = (typeof OPTION_IDS)[number]

export function optionIdAt(index: number): OptionId {
  const id = OPTION_IDS[index]
  if (!id) throw new Error(`índice de alternativa fora da faixa: ${index}`)
  return id
}
