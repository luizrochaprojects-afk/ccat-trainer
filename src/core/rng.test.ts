import { describe, expect, it } from 'vitest'
import { mulberry32, seedFromString } from './rng'

describe('mulberry32', () => {
  it('é determinístico: mesma seed, mesma sequência', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('seeds diferentes divergem', () => {
    const a = Array.from({ length: 20 }, mulberry32(1).next)
    const b = Array.from({ length: 20 }, mulberry32(2).next)
    expect(a).not.toEqual(b)
  })

  it('next() fica em [0, 1)', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 2000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int() respeita os limites inclusive', () => {
    const rng = mulberry32(7)
    const vistos = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(3, 6)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(6)
      vistos.add(v)
    }
    expect([...vistos].sort()).toEqual([3, 4, 5, 6])
  })

  it('int() com min === max devolve sempre o mesmo valor', () => {
    const rng = mulberry32(7)
    expect(rng.int(4, 4)).toBe(4)
  })

  it('int() rejeita faixa invertida', () => {
    expect(() => mulberry32(1).int(5, 2)).toThrow()
  })

  it('shuffle() permuta sem mutar a entrada e sem perder elementos', () => {
    const origem = [1, 2, 3, 4, 5, 6, 7, 8]
    const rng = mulberry32(42)
    const saida = rng.shuffle(origem)
    expect(origem).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...saida].sort((x, y) => x - y)).toEqual(origem)
  })

  it('shuffle() é determinístico por seed', () => {
    const origem = ['a', 'b', 'c', 'd', 'e']
    expect(mulberry32(8).shuffle(origem)).toEqual(mulberry32(8).shuffle(origem))
  })

  it('pick() rejeita lista vazia', () => {
    expect(() => mulberry32(1).pick([])).toThrow()
  })
})

describe('seedFromString', () => {
  it('é estável e cabe em uint32', () => {
    const s = seedFromString('spatial:rotacao:3:017')
    expect(s).toBe(seedFromString('spatial:rotacao:3:017'))
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThan(2 ** 32)
  })

  it('strings diferentes dão seeds diferentes', () => {
    expect(seedFromString('a')).not.toBe(seedFromString('b'))
  })
})
