import { LOCALES, LOCALE_LABEL } from '../../core/i18n'
import { useLocale } from '../LocaleContext'

/**
 * Seletor de idioma da interface.
 *
 * Dois botões, não um dropdown: com apenas dois idiomas, o dropdown esconde a
 * opção atrás de um clique a mais e não economiza espaço nenhum. Aqui o estado
 * atual é visível sem interagir.
 *
 * Só troca a INTERFACE. As questões continuam em inglês, porque é nesse idioma
 * que a CCAT é aplicada.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className="idioma" role="group" aria-label={t('lang.label')}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className="idioma-opcao"
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          lang={l === 'pt' ? 'pt-BR' : 'en'}
        >
          {l.toUpperCase()}
          <span className="sr-only"> — {LOCALE_LABEL[l]}</span>
        </button>
      ))}
    </div>
  )
}
