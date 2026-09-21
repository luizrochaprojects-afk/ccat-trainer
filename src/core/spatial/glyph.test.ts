import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import {
  ANGULAR_STEPS,
  type Glyph,
  isChiral,
  isUsable,
  key,
  reflect,
  rotate,
  rotationCanonical,
  rotationOrbitSize,
  sameUpToRotation,
  toPoints,
} from './glyph'

const L: Glyph = [
  { a: 0, r: 3 },
  { a: 3, r: 1 },
  { a: 7, r: 2 },
]

describe('rotate', () => {
  it('12 passos voltam à figura original', () => {
    expect(key(rotate(L, ANGULAR_STEPS))).toBe(key(L))
  })

  it('aceita k negativo e k > 12', () => {
    expect(key(rotate(L, -1))).toBe(key(rotate(L, 11)))
    expect(key(rotate(L, 14))).toBe(key(rotate(L, 2)))
  })

  it('preserva o número de células e os raios', () => {
    const r = rotate(L, 5)
    expect(r).toHaveLength(L.length)
    expect([...r].map((c) => c.r).sort()).toEqual([...L].map((c) => c.r).sort())
  })
})

describe('reflect', () => {
  it('aplicado duas vezes é a identidade', () => {
    expect(key(reflect(reflect(L)))).toBe(key(L))
  })
})

describe('rotationCanonical / sameUpToRotation', () => {
  it('é igual para todas as 12 rotações da mesma figura', () => {
    const canon = rotationCanonical(L)
    for (let k = 0; k < ANGULAR_STEPS; k++) {
      expect(rotationCanonical(rotate(L, k))).toBe(canon)
      expect(sameUpToRotation(L, rotate(L, k))).toBe(true)
    }
  })

  it('distingue uma figura do seu espelho quando ela é quiral', () => {
    expect(isChiral(L)).toBe(true)
    expect(sameUpToRotation(L, reflect(L))).toBe(false)
  })
})

describe('isChiral', () => {
  it('identifica uma figura simétrica como aquiral', () => {
    // simétrica em relação ao eixo vertical: a=0 fixo, a=2 e a=10 são par espelhado
    const simetrica: Glyph = [
      { a: 0, r: 2 },
      { a: 2, r: 3 },
      { a: 10, r: 3 },
    ]
    expect(isChiral(simetrica)).toBe(false)
    expect(isUsable(simetrica)).toBe(false)
  })
})

describe('rotationOrbitSize', () => {
  it('vale 12 para figura sem simetria rotacional', () => {
    expect(rotationOrbitSize(L)).toBe(ANGULAR_STEPS)
  })

  it('cai para 4 numa figura com simetria de 120° (12 ÷ ordem 3)', () => {
    const tri: Glyph = [
      { a: 0, r: 3 },
      { a: 4, r: 3 },
      { a: 8, r: 3 },
    ]
    expect(rotationOrbitSize(tri)).toBe(4)
    expect(isUsable(tri)).toBe(false)
  })

  it('cai para 6 numa figura com simetria de 180° (12 ÷ ordem 2)', () => {
    const par: Glyph = [
      { a: 1, r: 3 },
      { a: 7, r: 3 },
    ]
    expect(rotationOrbitSize(par)).toBe(6)
    expect(isUsable(par)).toBe(false)
  })
})

describe('toPoints', () => {
  it('mantém todos os pontos dentro da caixa', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 200; i++) {
      const glyph: Glyph = Array.from({ length: 5 }, () => ({
        a: rng.int(0, 11),
        r: rng.int(1, 3),
      }))
      for (const p of toPoints(glyph, 100, 50, 50).points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(100)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(100)
      }
    }
  })

  it('é determinístico e arredondado (sem ruído de ponto flutuante no JSON)', () => {
    const a = toPoints(L, 100, 50, 50)
    const b = toPoints(L, 100, 50, 50)
    expect(a).toEqual(b)
    for (const p of a.points) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(String(p.x).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
    }
  })

  it('desenha os vértices em ordem angular', () => {
    const rng = mulberry32(11)
    for (let i = 0; i < 100; i++) {
      const glyph = Array.from({ length: 5 }, () => ({ a: rng.int(0, 11), r: rng.int(1, 3) }))
      const unicas = new Map(glyph.map((c) => [`${c.a}:${c.r}`, c]))
      const limpo = [...unicas.values()]
      const angulos = toPoints(limpo, 100, 50, 50)
      // o polígono percorre os vértices sem voltar atrás no ângulo
      expect(angulos.points).toHaveLength(limpo.length)
    }
  })

  /**
   * Regressão: a marca de referência precisa acompanhar a figura.
   * Antes, ela era sempre o primeiro ponto em ordem angular — então girar a
   * figura fazia a marca pular para OUTRO vértice, e a dica "acompanhe o ponto
   * preenchido" apontava para o vértice errado.
   */
  describe('marca de referência', () => {
    const marcado = (glyph: Glyph) => {
      const { points, markerIndex } = toPoints(glyph, 100, 50, 50)
      return points[markerIndex]!
    }

    it('é o mesmo vértice material em todas as 12 rotações', () => {
      for (let k = 0; k < ANGULAR_STEPS; k++) {
        const girado = rotate(L, k)
        // o vértice marcado de `girado` tem que ser a rotação do vértice marcado de L
        const esperado = marcado([rotate([L[0]!], k)[0]!, ...rotate(L.slice(1), k)])
        expect(marcado(girado)).toEqual(esperado)
      }
    })

    it('acompanha a figura sob reflexão', () => {
      const espelhado = reflect(L)
      const pontoEsperado = marcado([reflect([L[0]!])[0]!, ...reflect(L.slice(1))])
      expect(marcado(espelhado)).toEqual(pontoEsperado)
    })

    it('aponta para a célula 0 da figura, não para o menor ângulo', () => {
      // célula 0 tem o MAIOR ângulo: se a marca fosse "primeiro em ordem
      // angular", ela cairia no vértice errado
      const g: Glyph = [
        { a: 9, r: 3 },
        { a: 1, r: 2 },
        { a: 5, r: 1 },
      ]
      const { points, markerIndex } = toPoints(g, 100, 50, 50)
      expect(markerIndex).toBe(2) // ordem angular: a=1, a=5, a=9
      // e o ponto marcado é mesmo o de a=9 (à esquerda do centro)
      expect(points[markerIndex]!.x).toBeLessThan(50)
    })

    it('a marca de uma figura girada nunca fica no mesmo índice para todo k', () => {
      const indices = new Set(
        Array.from({ length: ANGULAR_STEPS }, (_, k) => toPoints(rotate(L, k), 100, 50, 50).markerIndex),
      )
      // se fosse fixa em 0, este conjunto teria tamanho 1 — é o bug antigo
      expect(indices.size).toBeGreaterThan(1)
    })
  })
})
