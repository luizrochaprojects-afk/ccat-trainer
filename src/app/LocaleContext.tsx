import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, isLocale, pick, type Locale, type LocalizedText } from '../core/i18n'
import { formatString, STRINGS, type StringKey } from './strings'

/**
 * Idioma da interface.
 *
 * Vive acima das rotas e é persistido em localStorage: trocar de idioma no meio
 * de um treino não pode reiniciar nada, e reabrir o app tem de respeitar a
 * escolha anterior.
 *
 * O padrão é INGLÊS — é o idioma da prova, e abrir o app já nele é mais um
 * empurrão de imersão. Quem prefere português troca uma vez e fica.
 */

const CHAVE = 'ccat.locale'

interface LocaleContexto {
  locale: Locale
  setLocale: (l: Locale) => void
  /** string da interface, com interpolação de `{chave}` */
  t: (key: StringKey, vars?: Record<string, string | number>) => string
  /** texto de conteúdo que já vem nos dois idiomas */
  tx: (text: LocalizedText) => string
}

const Ctx = createContext<LocaleContexto | null>(null)

function localeInicial(): Locale {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (isLocale(salvo)) return salvo
  } catch {
    // aba anônima ou site data bloqueado: cai no padrão
  }

  // Sem preferência salva, o padrão vence — e NÃO o idioma do navegador.
  // Deixar o navegador decidir abriria o app em português para praticamente
  // todo usuário brasileiro, que é justamente quem mais se beneficia da
  // imersão no idioma da prova. Quem prefere português troca uma vez e a
  // escolha fica salva.
  return DEFAULT_LOCALE
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(localeInicial)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(CHAVE, l)
    } catch {
      // preferência não persiste, mas a sessão atual funciona
    }
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'
  }, [])

  const valor = useMemo<LocaleContexto>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => formatString(STRINGS[locale][key], vars),
      tx: (text) => pick(text, locale),
    }),
    [locale, setLocale],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useLocale(): LocaleContexto {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLocale precisa estar dentro de <LocaleProvider>')
  return ctx
}
