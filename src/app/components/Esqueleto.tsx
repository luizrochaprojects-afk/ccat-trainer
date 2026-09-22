/**
 * Placeholder da FORMA do conteúdo que está vindo.
 *
 * Existe porque o banco de questões é um chunk de alguns megabytes: em rede
 * lenta há um vão longo o bastante para a tela parecer quebrada. Esqueleto, e
 * não spinner — um spinner informa que algo acontece; o esqueleto informa o
 * que vai aparecer e não deixa o layout saltar quando aparece.
 *
 * A animação é neutralizada pelo bloco `prefers-reduced-motion` global.
 */
export function Esqueleto({
  variante = 'linha',
  linhas = 5,
}: {
  variante?: 'linha' | 'manchete' | 'tabela' | 'chips'
  linhas?: number
}) {
  if (variante === 'tabela' || variante === 'chips') {
    return (
      <div className={`esqueleto-grupo ${variante}`} aria-hidden="true">
        {Array.from({ length: linhas }, (_, i) => (
          <span key={i} className={`esqueleto ${variante === 'chips' ? 'pilula' : 'linha'}`} />
        ))}
      </div>
    )
  }

  return <span className={`esqueleto ${variante}`} aria-hidden="true" />
}
