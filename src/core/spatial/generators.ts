import { mulberry32 } from '../rng'
import type { Difficulty } from '../taxonomy'
import { FAMILIAS, type FamiliaQualquer } from './figuras/index'
import { familiaCombina, FORMAS, type QuestaoEspacial } from './formas'

/**
 * Geradores de questão espacial (PRD §4.10).
 *
 * Cada gerador é uma combinação FORMA × FAMÍLIA: `rotacao.arcos`,
 * `matriz.raios`, `identical_pair.composta`. A forma diz o que se pergunta, a
 * família diz com que vocabulário visual — e é do produto das duas que vem a
 * variedade que as provas reais têm.
 *
 * Contrato: dada uma seed e um nível, devolve a questão completa **e** o
 * gabarito, derivado da regra que construiu a figura, nunca de um julgamento
 * posterior. O gate re-executa com a mesma seed e compara.
 *
 * Invariantes que o teste verifica em massa:
 *  (a) mesma seed → questão idêntica
 *  (b) exatamente UMA alternativa satisfaz a regra
 *  (c) nenhuma alternativa com o mesmo desenho de outra
 */

export type SpatialGenerated = QuestaoEspacial

export type SpatialGenerator = (seed: number, difficulty: Difficulty) => SpatialGenerated

function construir(forma: string, fam: FamiliaQualquer): SpatialGenerator {
  const { fn } = FORMAS[forma] as (typeof FORMAS)[string]
  return (seed: number, difficulty: Difficulty) => fn(fam, mulberry32(seed), difficulty)
}

/**
 * O produto forma × família, filtrado pela tabela de compatibilidade.
 *
 * Combinações inválidas não são registradas em vez de falharem em tempo de
 * execução: `rotacao.atributos` não existe porque a família é aquiral, e uma
 * questão de rotação ali teria duas respostas certas.
 */
export const SPATIAL_GENERATORS: Record<string, SpatialGenerator> = Object.fromEntries(
  Object.keys(FORMAS).flatMap((forma) =>
    Object.entries(FAMILIAS)
      .filter(([, fam]) => familiaCombina(forma, fam))
      .map(([idFamilia, fam]) => [`${forma}.${idFamilia}`, construir(forma, fam)] as const),
  ),
)

export const SPATIAL_GENERATOR_IDS = Object.keys(SPATIAL_GENERATORS)
