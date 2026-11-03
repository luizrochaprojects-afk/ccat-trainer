import type { Rng } from '../../rng'
import type { Unidade } from '../formato'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import {
  arredondadoParaBaixo,
  ERRO_ARREDONDAMENTO,
  errosDeEscala,
  fmt,
  fmtResposta,
  gerar,
  mantissa,
  textoZeros,
  type Problema,
} from './comum'

/**
 * Multiplicação de números grandes ("3,5 mi × 240").
 *
 * O método que o atalho ensina é sempre o mesmo: separar os dígitos
 * significativos das potências de 10, multiplicar os dígitos e somar os zeros.
 * É o que evita as duas falhas que motivaram o treino — errar a ordem de
 * grandeza e errar dígito.
 *
 *  - 1: 1 dígito × 1 dígito, 3–6 zeros no total; exata
 *  - 2: 2 dígitos × 1 dígito, 4–8 zeros; exata
 *  - 3: 2 × 2 dígitos; estimativa
 *  - 4: 3 × 2 dígitos com troca de escala (mil × mi → bi); estimativa
 *  - 5: três fatores de 2–3 dígitos; estimativa
 */

interface Fator {
  m: number
  z: number
}

function fatoresDoNivel(rng: Rng, nivel: Nivel): Fator[] {
  switch (nivel) {
    case 1: {
      const total = rng.int(3, 6)
      const z1 = rng.int(Math.ceil(total / 2), total)
      return [
        { m: mantissa(rng, 1), z: z1 },
        { m: mantissa(rng, 1), z: total - z1 },
      ]
    }
    case 2: {
      const total = rng.int(4, 8)
      const z1 = rng.int(Math.ceil(total / 2), total)
      return [
        { m: mantissa(rng, 2), z: z1 },
        { m: mantissa(rng, 1), z: total - z1 },
      ]
    }
    case 3:
      return [
        { m: mantissa(rng, 2), z: rng.int(2, 5) },
        { m: mantissa(rng, 2), z: rng.int(0, 2) },
      ]
    case 4:
      return [
        { m: mantissa(rng, 3), z: rng.int(0, 2) },
        { m: mantissa(rng, 2), z: rng.int(5, 6) },
      ]
    case 5:
      return [
        { m: mantissa(rng, rng.pick([2, 3] as const)), z: rng.int(1, 3) },
        { m: mantissa(rng, 2), z: rng.int(0, 2) },
        { m: mantissa(rng, 2), z: rng.int(0, 2) },
      ]
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  const fatores = fatoresDoNivel(rng, nivel)
  const valores = fatores.map((f) => f.m * 10 ** f.z)
  const correta = valores.reduce((a, b) => a * b, 1)
  const estimativa = nivel >= 3
  const unidade: Unidade = rng.next() < 0.5 ? 'moeda' : 'numero'

  const textos = valores.map((v, i) => fmt(v, i === 0 ? unidade : 'numero'))
  const produtoMantissas = fatores.reduce((a, f) => a * f.m, 1)
  const totalZeros = fatores.reduce((a, f) => a + f.z, 0)
  const resposta = fmtResposta(correta, unidade, estimativa)
  const zerosTxt = textoZeros(totalZeros)
  const aprox = estimativa ? '≈ ' : ''

  const candidatos = errosDeEscala(correta)
  if (estimativa) {
    candidatos.push({
      valor: valores.map(arredondadoParaBaixo).reduce((a, b) => a * b, 1),
      erro: ERRO_ARREDONDAMENTO,
    })
  }

  return {
    enunciado: {
      pt: `Quanto é ${textos.map((t) => t.pt).join(' × ')}?`,
      en: `What is ${textos.map((t) => t.en).join(' × ')}?`,
    },
    correta,
    candidatos,
    unidade,
    estimativa,
    expression: valores.map(String).join('*'),
    atalho: {
      pt: `Separe dígitos e zeros: ${fatores.map((f) => f.m).join(' × ')} = ${produtoMantissas}, mais ${zerosTxt.pt} → ${aprox}${resposta.pt}.`,
      en: `Split digits from zeros: ${fatores.map((f) => f.m).join(' × ')} = ${produtoMantissas}, plus ${zerosTxt.en} → ${aprox}${resposta.en}.`,
    },
  }
}

export const gerarMultiplicacao: QmGerador = (seed, nivel) =>
  gerar('multiplicacao', construir, seed, nivel)
