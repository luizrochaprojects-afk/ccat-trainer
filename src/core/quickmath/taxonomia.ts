import type { LocalizedText } from '../i18n'
import type { Difficulty } from '../taxonomy'

/**
 * Taxonomia do Quick Math — a conta de cabeça de case interview.
 *
 * Vive à parte da taxonomia da CCAT de propósito: nada aqui entra no simulado,
 * no banco aprovado nem nos gates. As questões são geradas na hora, e quem
 * prova o gabarito são os testes de propriedade dos geradores.
 */

export const SUBSKILLS = [
  'multiplicacao',
  'divisao',
  'porcentagem',
  'fracoes',
  'crescimento',
  'unidades',
  'breakeven',
  'media_ponderada',
  'cadeia',
] as const

export type Subskill = (typeof SUBSKILLS)[number]

/** Fatia 1: as subskills que já têm gerador. As outras quatro vêm na fatia 2. */
export const SUBSKILLS_ATIVAS = [
  'multiplicacao',
  'divisao',
  'porcentagem',
  'fracoes',
  'cadeia',
] as const satisfies readonly Subskill[]

export type SubskillAtiva = (typeof SUBSKILLS_ATIVAS)[number]

export type Nivel = Difficulty

export const NIVEIS: readonly Nivel[] = [1, 2, 3, 4, 5]

export const SUBSKILL_LABEL: Record<Subskill, LocalizedText> = {
  multiplicacao: { en: 'Big-number multiplication', pt: 'Multiplicação grande' },
  divisao: { en: 'Big-number division', pt: 'Divisão grande' },
  porcentagem: { en: 'Percentages', pt: 'Porcentagem' },
  fracoes: { en: 'Fractions and percentages', pt: 'Frações e porcentagens' },
  crescimento: { en: 'Growth', pt: 'Crescimento' },
  unidades: { en: 'Units and scale', pt: 'Unidades e escala' },
  breakeven: { en: 'Break-even and payback', pt: 'Break-even e payback' },
  media_ponderada: { en: 'Weighted average', pt: 'Média ponderada' },
  cadeia: { en: 'Chained estimates', pt: 'Cadeia de fatores' },
}

const s = (...segundos: [number, number, number, number, number]): Record<Nivel, number> => ({
  1: segundos[0] * 1000,
  2: segundos[1] * 1000,
  3: segundos[2] * 1000,
  4: segundos[3] * 1000,
  5: segundos[4] * 1000,
})

/**
 * Tempo-alvo por questão. Não estoura a questão — só mede: a sessão compara o
 * tempo gasto com o alvo para decidir subida de nível e onde focar.
 */
export const ALVO_MS: Record<Subskill, Record<Nivel, number>> = {
  multiplicacao: s(10, 15, 20, 30, 45),
  divisao: s(12, 18, 25, 35, 45),
  porcentagem: s(10, 15, 25, 30, 40),
  fracoes: s(8, 10, 15, 20, 25),
  cadeia: s(30, 45, 60, 75, 90),
  // fatia 2: provisórios até os geradores existirem
  crescimento: s(15, 20, 30, 40, 50),
  unidades: s(15, 20, 30, 40, 50),
  breakeven: s(15, 20, 30, 40, 50),
  media_ponderada: s(15, 20, 30, 40, 50),
}

export const DURACAO_SESSAO_MS = 15 * 60_000
export const AQUECIMENTO_MS = 2 * 60_000
export const TAMANHO_BLOCO = 5

/** Distância relativa mínima entre a resposta e qualquer distrator. */
export const FOLGA_EXATA = 0.1
/** Em conta de estimativa a folga é maior: quem arredonda com intenção ainda acerta. */
export const FOLGA_ESTIMATIVA = 0.15

/** Chance de um bloco ir para uma subskill sorteada em vez da mais fraca. */
export const CHANCE_EXPLORAR = 0.2
