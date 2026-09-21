import type { SpatialSpec } from '../../core/schema'
import { specToSvgString } from '../../core/spatial/svg'

/**
 * Renderiza uma figura espacial.
 *
 * Usa o MESMO `specToSvgString` do núcleo que os scripts de auditoria usam —
 * se o preview desenhasse diferente do app, conferir o gabarito no preview não
 * provaria nada sobre o que o usuário vê.
 *
 * `dangerouslySetInnerHTML` aqui é seguro e deliberado: o markup é produzido
 * pelo nosso gerador a partir de inteiros, validado pelo zod, e nunca contém
 * entrada de usuário.
 */
export function SpatialFigure({ spec, label }: { spec: SpatialSpec; label: string }) {
  return (
    <span
      aria-label={label}
      role="img"
      dangerouslySetInnerHTML={{ __html: specToSvgString(spec, { label }) }}
    />
  )
}
