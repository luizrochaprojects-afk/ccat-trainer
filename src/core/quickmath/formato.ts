import type { Locale, LocalizedText } from '../i18n'

/**
 * Como o entrevistador fala o número: "R$ 1,4 bi", não "1.400.000.000".
 *
 * A mantissa é arredondada a 3 algarismos significativos ANTES de escolher a
 * escala. Na ordem inversa, 999,6 mi viraria "1.000 mi" — um número que
 * ninguém fala e que ainda engana a regra de ordem de grandeza.
 */

export type Unidade = 'moeda' | 'numero' | 'percent'

const SIG_EXIBICAO = 3

const ESCALAS: readonly { base: number; pt: string; en: string }[] = [
  { base: 1e12, pt: 'tri', en: 'T' },
  { base: 1e9, pt: 'bi', en: 'B' },
  { base: 1e6, pt: 'mi', en: 'M' },
  { base: 1e3, pt: 'mil', en: 'K' },
]

export function arredondarSig(valor: number, sig: number): number {
  if (valor === 0 || !Number.isFinite(valor)) return valor
  const casas = sig - Math.ceil(Math.log10(Math.abs(valor)))
  // Dividir por potência positiva (em vez de multiplicar por 0.1) evita o
  // resíduo binário: 83 / 0.1 = 830.0000000000001, 83 * 10 = 830.
  if (casas < 0) {
    const passo = 10 ** -casas
    return Math.round(valor / passo) * passo
  }
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

/** `floor(log10)` do valor como ele aparece na tela. */
export function ordemDeGrandeza(valor: number): number {
  const exibido = Math.abs(arredondarSig(valor, SIG_EXIBICAO))
  if (exibido === 0) return Number.NEGATIVE_INFINITY
  return Math.floor(Math.log10(exibido))
}

export function formatarValor(valor: number, unidade: Unidade, locale: Locale): string {
  if (unidade === 'percent') {
    const arredondado = Math.round(valor * 10) / 10
    return `${decimal(arredondado, locale)}%`
  }

  const sinal = valor < 0 ? '-' : ''
  const exibido = arredondarSig(Math.abs(valor), SIG_EXIBICAO)
  const escala = ESCALAS.find((e) => exibido >= e.base)
  const mantissa = escala ? arredondarSig(exibido / escala.base, SIG_EXIBICAO) : exibido
  const numero = decimal(mantissa, locale)

  if (locale === 'pt') {
    const corpo = escala ? `${numero} ${escala.pt}` : numero
    return unidade === 'moeda' ? `${sinal}R$ ${corpo}` : `${sinal}${corpo}`
  }
  const corpo = escala ? `${numero}${escala.en}` : numero
  return unidade === 'moeda' ? `${sinal}$${corpo}` : `${sinal}${corpo}`
}

export function formatarLocalizado(valor: number, unidade: Unidade): LocalizedText {
  return { pt: formatarValor(valor, unidade, 'pt'), en: formatarValor(valor, unidade, 'en') }
}

/** Número sem zeros à direita, com o separador decimal do idioma. */
function decimal(valor: number, locale: Locale): string {
  // toPrecision corta o resíduo de ponto flutuante; Number() tira os zeros.
  const texto = String(Number(valor.toPrecision(12)))
  return locale === 'pt' ? texto.replace('.', ',') : texto
}
