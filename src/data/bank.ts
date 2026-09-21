import { approvedBankSchema, type Question } from '../core/schema'
import { TIPOS, type Tipo } from '../core/taxonomy'

/**
 * Carregamento do banco de questões.
 *
 * Import dinâmico por tipo: o Vite gera um chunk separado para cada arquivo,
 * então um drill de séries numéricas não baixa os 325 espaciais (o maior
 * arquivo, de longe, por causa das figuras).
 *
 * O schema é revalidado no cliente. Parece redundante — o gate já validou —
 * mas o que chega aqui é um arquivo servido pela rede, e um deploy parcial ou
 * um cache velho entregando JSON de outra versão tem de falhar alto, não
 * renderizar questão quebrada.
 */

const LOADERS: Record<Tipo, () => Promise<{ default: unknown }>> = {
  verbal_analogy: () => import('../../content/approved/verbal_analogy.json'),
  verbal_vocab: () => import('../../content/approved/verbal_vocab.json'),
  verbal_logic: () => import('../../content/approved/verbal_logic.json'),
  math_series: () => import('../../content/approved/math_series.json'),
  math_word: () => import('../../content/approved/math_word.json'),
  spatial: () => import('../../content/approved/spatial.json'),
}

const cache = new Map<Tipo, Question[]>()

export async function loadTipo(tipo: Tipo): Promise<Question[]> {
  const emCache = cache.get(tipo)
  if (emCache) return emCache

  const modulo = await LOADERS[tipo]()
  const questoes = approvedBankSchema.parse(modulo.default) as Question[]
  cache.set(tipo, questoes)
  return questoes
}

/** Banco completo — necessário para compor uma simulação. */
export async function loadFullBank(): Promise<Question[]> {
  const porTipo = await Promise.all(TIPOS.map(loadTipo))
  return porTipo.flat()
}

/** Quantas questões existem de cada tipo, sem baixar o conteúdo todo. */
export async function bankCounts(): Promise<Record<Tipo, number>> {
  const banco = await loadFullBank()
  return Object.fromEntries(
    TIPOS.map((t) => [t, banco.filter((q) => q.tipo === t).length]),
  ) as Record<Tipo, number>
}

export function subtiposDisponiveis(banco: Question[], tipo: Tipo): string[] {
  return [...new Set(banco.filter((q) => q.tipo === tipo).map((q) => q.subtipo))].sort()
}
