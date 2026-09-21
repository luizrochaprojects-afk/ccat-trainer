/**
 * Idiomas do CCAT Trainer.
 *
 * Distinção que organiza tudo aqui:
 *
 *  - **O conteúdo das questões é sempre inglês.** A CCAT é aplicada em inglês,
 *    e treinar analogia ou problema matemático em português não transfere para
 *    a prova — o vocabulário e a leitura fazem parte do que está sendo medido.
 *    Antes desta decisão o banco era bilíngue por acidente (verbal em inglês,
 *    math_word e spatial em português), o que não corresponde a prova nenhuma.
 *
 *  - **Tudo que explica é traduzido.** Explicação de questão, teoria, rótulos
 *    e interface seguem o idioma escolhido. Entender por que errou é mais
 *    rápido na própria língua, e isso não contamina a medição.
 */

export const LOCALES = ['en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
}

/** Texto que existe nos dois idiomas. */
export interface LocalizedText {
  en: string
  pt: string
}

export function pick(text: LocalizedText, locale: Locale): string {
  return text[locale]
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
