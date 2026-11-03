import type { LocalizedText } from '../../i18n'
import { mulberry32, type Rng } from '../../rng'
import { montarAlternativas, type Candidato } from '../alternativas'
import { arredondarSig, formatarValor, type Unidade } from '../formato'
import type { QmQuestao } from '../questao'
import { ALVO_MS, type Nivel, type Subskill } from '../taxonomia'

/**
 * O que todo gerador de Quick Math compartilha: o laço de sorteio, os erros de
 * escala e a mantissa sorteada.
 */

export interface Problema {
  enunciado: LocalizedText
  /** valor exato da resposta; a montagem arredonda quando é estimativa */
  correta: number
  candidatos: Candidato[]
  unidade: Unidade
  estimativa: boolean
  expression: string
  atalho: LocalizedText
}

/** Devolve null quando o sorteio caiu num caso degenerado; aí se sorteia de novo. */
export type Construtor = (rng: Rng, nivel: Nivel) => Problema | null

const TENTATIVAS = 50

export function gerar(subskill: Subskill, construir: Construtor, seed: number, nivel: Nivel): QmQuestao {
  const rng = mulberry32(seed)
  for (let i = 0; i < TENTATIVAS; i++) {
    const p = construir(rng, nivel)
    if (!p) continue
    const alternativas = montarAlternativas(rng, p.correta, p.candidatos, p.unidade, p.estimativa)
    if (!alternativas) continue
    return {
      id: `${subskill}-${nivel}-${seed}`,
      subskill,
      nivel,
      seed,
      enunciado: p.enunciado,
      opcoes: alternativas.opcoes,
      answerId: alternativas.answerId,
      expression: p.expression,
      estimativa: p.estimativa,
      atalho: p.atalho,
      alvoMs: ALVO_MS[subskill][nivel],
    }
  }
  throw new Error(`gerador ${subskill} não fechou questão (seed ${seed}, nível ${nivel})`)
}

/** Inteiro de `digitos` algarismos, sem zero no fim (o zero vai para a potência de 10). */
export function mantissa(rng: Rng, digitos: 1 | 2 | 3): number {
  const min = digitos === 1 ? 2 : 10 ** (digitos - 1) + 1
  const max = 10 ** digitos - 1
  for (;;) {
    const m = rng.int(min, max)
    if (digitos === 1 || m % 10 !== 0) return m
  }
}

export const zeros = (n: number): number => 10 ** n

/** Os erros de contar zeros: um a mais, um a menos, e a escala trocada (mil ↔ milhão). */
export function errosDeEscala(valor: number): Candidato[] {
  return [
    { valor: valor * 10, fator: 10, erro: { pt: 'Você colocou um zero a mais.', en: 'You added an extra zero.' } },
    { valor: valor / 10, fator: 0.1, erro: { pt: 'Você perdeu um zero.', en: 'You dropped a zero.' } },
    {
      valor: valor * 1000,
      fator: 1000,
      erro: { pt: 'Errou a escala: três zeros a mais (mil ↔ milhão).', en: 'Wrong scale: three extra zeros (thousand ↔ million).' },
    },
    {
      valor: valor / 1000,
      fator: 0.001,
      erro: { pt: 'Errou a escala: três zeros a menos (milhão ↔ mil).', en: 'Wrong scale: three zeros short (million ↔ thousand).' },
    },
  ]
}

/** Arredondar cada fator para 1 algarismo para baixo: o atalho ingênuo que desvia demais. */
export function arredondadoParaBaixo(fator: number): number {
  const p = 10 ** Math.floor(Math.log10(fator))
  return Math.floor(fator / p) * p
}

export const ERRO_ARREDONDAMENTO: LocalizedText = {
  pt: 'Arredondou os fatores demais, todos para o mesmo lado.',
  en: 'Rounded the factors too far, all in the same direction.',
}

export function fmt(valor: number, unidade: Unidade): LocalizedText {
  return { pt: formatarValor(valor, unidade, 'pt'), en: formatarValor(valor, unidade, 'en') }
}

/** O resultado como aparece na alternativa certa. */
export function fmtResposta(valor: number, unidade: Unidade, estimativa: boolean): LocalizedText {
  return fmt(estimativa ? arredondarSig(valor, 2) : valor, unidade)
}

export function textoZeros(n: number): LocalizedText {
  return {
    pt: n === 1 ? '1 zero' : `${n} zeros`,
    en: n === 1 ? '1 zero' : `${n} zeros`,
  }
}
