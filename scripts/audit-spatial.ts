/**
 * Calibra os limiares de legibilidade e mostra quanto do espaço de figuras
 * sobrevive a eles. Se sobrar pouco, o gerador não consegue encher a cota.
 */
import { mulberry32 } from '../src/core/rng'
import { ANGULAR_STEPS, isUsable, MAX_RADIUS, MIN_RADIUS, type Cell, type Glyph } from '../src/core/spatial/glyph'
import { corpo, quiralidadeVisual } from '../src/core/spatial/legibility'

function sortear(rng: ReturnType<typeof mulberry32>, cells: number): Glyph | null {
  const usadas = new Set<string>()
  const g: Cell[] = []
  let guard = 0
  while (g.length < cells) {
    if (guard++ > 400) return null
    const a = rng.int(0, ANGULAR_STEPS - 1)
    const r = rng.int(MIN_RADIUS, MAX_RADIUS)
    const k = `${a}:${r}`
    if (usadas.has(k)) continue
    usadas.add(k)
    g.push({ a, r })
  }
  return g
}

const rng = mulberry32(20260921)

console.log('células | usáveis hoje | corpo>=0.10 | quiral>=18px | os dois')
for (const cells of [3, 4, 5, 6]) {
  let usaveis = 0
  let comCorpo = 0
  let comQuiral = 0
  let ambos = 0
  const amostras = 20_000

  for (let i = 0; i < amostras; i++) {
    const g = sortear(rng, cells)
    if (!g || !isUsable(g)) continue
    usaveis++
    const c = corpo(g)
    const q = quiralidadeVisual(g)
    if (c >= 0.1) comCorpo++
    if (q >= 18) comQuiral++
    if (c >= 0.1 && q >= 18) ambos++
  }

  const pct = (n: number) => `${((n / usaveis) * 100).toFixed(0)}%`
  console.log(
    `   ${cells}    | ${String(usaveis).padStart(6)}       | ${pct(comCorpo).padStart(5)}       | ${pct(comQuiral).padStart(5)}        | ${pct(ambos).padStart(5)}`,
  )
}

console.log('\ndistribuição da quiralidade visual entre as figuras "usáveis" de hoje:')
for (const cells of [3, 5]) {
  const valores: number[] = []
  for (let i = 0; i < 6000; i++) {
    const g = sortear(rng, cells)
    if (g && isUsable(g)) valores.push(quiralidadeVisual(g))
  }
  valores.sort((a, b) => a - b)
  const p = (q: number) => valores[Math.floor(valores.length * q)]?.toFixed(1)
  console.log(`  ${cells} células: p10=${p(0.1)} p25=${p(0.25)} mediana=${p(0.5)} p75=${p(0.75)}`)
}
