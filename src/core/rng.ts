/**
 * RNG determinístico (mulberry32).
 *
 * Toda questão espacial guarda apenas a seed + o id do gerador; a figura é
 * reconstruída por regra na hora de renderizar. Isso só funciona se a mesma
 * seed produzir sempre exatamente a mesma sequência — por isso nada de
 * Math.random em caminho de geração.
 */
export interface Rng {
  /** float em [0, 1) */
  next(): number
  /** inteiro em [min, max] */
  int(min: number, max: number): number
  /** elemento aleatório (lança se a lista estiver vazia) */
  pick<T>(items: readonly T[]): T
  /** cópia embaralhada (Fisher-Yates) — não muta a entrada */
  shuffle<T>(items: readonly T[]): T[]
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`)
    return min + Math.floor(next() * (max - min + 1))
  }

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('rng.pick: lista vazia')
    return items[int(0, items.length - 1)] as T
  }

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      const tmp = out[i] as T
      out[i] = out[j] as T
      out[j] = tmp
    }
    return out
  }

  return { next, int, pick, shuffle }
}

/** Seed estável derivada de uma string (FNV-1a), para ids legíveis. */
export function seedFromString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
