import type { Rng } from '../../rng'
import { ordemDeGrandeza, type Unidade } from '../formato'
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
 * Divisão de números grandes ("R$ 48 bi ÷ 1.200 agências").
 *
 * Mesmo método da multiplicação, ao contrário: divide os dígitos e subtrai os
 * zeros. O distrator mais traiçoeiro é o quociente invertido — dividir os
 * dígitos ao contrário e acertar os zeros —, porque cai na mesma ordem de
 * grandeza da resposta.
 *
 *  - 1: quociente de 1 dígito, limpo; exata
 *  - 2: quociente de 2 dígitos, limpo; exata
 *  - 3: mantissas de 2 dígitos; estimativa
 *  - 4: escalas diferentes (bi ÷ mil); estimativa
 *  - 5: dividendo e divisor de 3 dígitos, escalas diferentes; estimativa
 */

interface Divisao {
  /** dígitos e zeros do dividendo e do divisor */
  mn: number
  zn: number
  md: number
  zd: number
}

function sortear(rng: Rng, nivel: Nivel): Divisao {
  switch (nivel) {
    case 1: {
      const q = mantissa(rng, 1)
      const md = mantissa(rng, 1)
      return { mn: q * md, zn: rng.int(3, 7), md, zd: rng.int(0, 2) }
    }
    case 2: {
      const q = mantissa(rng, 2)
      const md = mantissa(rng, 1)
      return { mn: q * md, zn: rng.int(4, 8), md, zd: rng.int(0, 2) }
    }
    case 3:
      return { mn: mantissa(rng, 2), zn: rng.int(4, 7), md: mantissa(rng, 2), zd: rng.int(0, 2) }
    case 4:
      return { mn: mantissa(rng, rng.pick([2, 3] as const)), zn: rng.int(8, 10), md: mantissa(rng, 2), zd: rng.int(2, 4) }
    case 5:
      return { mn: mantissa(rng, 3), zn: rng.int(7, 10), md: mantissa(rng, 3), zd: rng.int(1, 4) }
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  const { mn, zn, md, zd } = sortear(rng, nivel)
  const dividendo = mn * 10 ** zn
  const divisor = md * 10 ** zd
  const correta = dividendo / divisor
  if (correta < 1) return null

  const estimativa = nivel >= 3
  const unidade: Unidade = rng.next() < 0.5 ? 'moeda' : 'numero'
  const a = fmt(dividendo, unidade)
  const b = fmt(divisor, 'numero')
  const resposta = fmtResposta(correta, unidade, estimativa)
  const aprox = estimativa ? '≈ ' : ''
  const quocienteDigitos = String(Number((mn / md).toPrecision(3)))
  const z = textoZeros(zn - zd)

  const candidatos = errosDeEscala(correta)
  // Dígitos divididos ao contrário, na ordem de grandeza da resposta.
  const invertido = md / mn
  const ajuste = 10 ** (ordemDeGrandeza(correta) - Math.floor(Math.log10(invertido)))
  candidatos.splice(2, 0, {
    valor: invertido * ajuste,
    erro: { pt: 'Inverteu a divisão dos dígitos.', en: 'Divided the digits the wrong way round.' },
  })
  if (estimativa) {
    // Dividendo arredondado para baixo e divisor para cima: os dois erros
    // empurram o quociente para o mesmo lado.
    const p = 10 ** Math.floor(Math.log10(divisor))
    const divisorParaCima = (Math.floor(divisor / p) + 1) * p
    candidatos.push({ valor: arredondadoParaBaixo(dividendo) / divisorParaCima, erro: ERRO_ARREDONDAMENTO })
  }

  return {
    enunciado: {
      pt: `Quanto é ${a.pt} ÷ ${b.pt}?`,
      en: `What is ${a.en} ÷ ${b.en}?`,
    },
    correta,
    candidatos,
    unidade,
    estimativa,
    expression: `${dividendo}/${divisor}`,
    atalho: {
      pt: `Divida dígitos e subtraia zeros: ${mn} ÷ ${md} ${estimativa ? '≈' : '='} ${quocienteDigitos}, com ${zn} − ${zd} = ${z.pt} → ${aprox}${resposta.pt}.`,
      en: `Divide digits, subtract zeros: ${mn} ÷ ${md} ${estimativa ? '≈' : '='} ${quocienteDigitos}, with ${zn} − ${zd} = ${z.en} → ${aprox}${resposta.en}.`,
    },
  }
}

export const gerarDivisao: QmGerador = (seed, nivel) => gerar('divisao', construir, seed, nivel)

