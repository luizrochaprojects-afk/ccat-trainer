import type { Familia } from './contrato'
import { familiaAninhadas } from './aninhadas'
import { familiaArcos } from './arcos'
import { familiaAtributos } from './atributos'
import { familiaComposta } from './composta'
import { familiaRaios } from './raios'

export * from './contrato'
export { familiaAninhadas, familiaArcos, familiaAtributos, familiaComposta, familiaRaios }

/**
 * O registro de vocabulários visuais disponíveis.
 *
 * `Familia<unknown>` não serviria — o parâmetro é usado em posição de entrada e
 * de saída ao mesmo tempo. Cada família só é manipulada através do próprio
 * contrato, então o tipo existencial aqui é honesto: quem consome não sabe
 * (nem precisa saber) o que é `F`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FamiliaQualquer = Familia<any>

export const FAMILIAS: Record<string, FamiliaQualquer> = {
  arcos: familiaArcos,
  raios: familiaRaios,
  atributos: familiaAtributos,
  aninhadas: familiaAninhadas,
  composta: familiaComposta,
}

export const IDS_FAMILIAS = Object.keys(FAMILIAS)
