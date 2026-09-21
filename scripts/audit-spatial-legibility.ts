/**
 * Auditoria de legibilidade de TODOS os subtipos espaciais.
 *
 * Usa as mesmas métricas que o gerador aplica (core/spatial/legibility.ts) —
 * medir com régua diferente da usada para construir só produziria números
 * incomparáveis.
 *
 * O gate prova que existe exatamente uma resposta certa. Isto verifica a outra
 * metade: que dá para VER qual é.
 */
import { SPATIAL_GENERATORS, SPATIAL_GENERATOR_IDS } from '../src/core/spatial/generators'
import { reflect } from '../src/core/spatial/glyph'
import {
  corpo,
  distanciaVisual,
  MIN_CORPO,
  MIN_QUIRALIDADE,
  MIN_SEPARACAO_ALTERNATIVAS,
  quiralidadeVisual,
} from '../src/core/spatial/legibility'
import { DIFFICULTIES } from '../src/core/taxonomy'

const SEEDS = 300

interface Falha {
  id: string
  nivel: number
  seed: number
  motivo: string
  valor: number
}

const falhas: Falha[] = []
let total = 0

for (const id of SPATIAL_GENERATOR_IDS) {
  for (const nivel of DIFFICULTIES) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      let q
      try {
        q = SPATIAL_GENERATORS[id](seed, nivel)
      } catch (e) {
        falhas.push({ id, nivel, seed, motivo: 'gerador falhou', valor: 0 })
        continue
      }
      total++

      // separação entre TODAS as alternativas, duas a duas
      let menorSeparacao = Number.POSITIVE_INFINITY
      for (let i = 0; i < q.optionGlyphs.length; i++) {
        for (let j = i + 1; j < q.optionGlyphs.length; j++) {
          menorSeparacao = Math.min(
            menorSeparacao,
            distanciaVisual(q.optionGlyphs[i]!, q.optionGlyphs[j]!),
          )
        }
      }
      if (menorSeparacao < MIN_SEPARACAO_ALTERNATIVAS) {
        falhas.push({ id, nivel, seed, motivo: 'alternativas coladas', valor: menorSeparacao })
      }

      // a figura de base precisa ter lado visível e corpo
      const idx = q.options.findIndex((o) => o.id === q.answerId)
      const correta = q.optionGlyphs[idx]!
      const base = id === 'reflexao' ? reflect(correta) : correta

      const quiral = quiralidadeVisual(base)
      if (quiral < MIN_QUIRALIDADE) {
        falhas.push({ id, nivel, seed, motivo: 'figura quase simétrica', valor: quiral })
      }
      const c = corpo(base)
      if (c < MIN_CORPO) {
        falhas.push({ id, nivel, seed, motivo: 'figura quase colinear', valor: c })
      }
    }
  }
}

console.log(`questões analisadas: ${total}`)
console.log(`falhas: ${falhas.length}`)

if (falhas.length > 0) {
  const porMotivo = new Map<string, number>()
  for (const f of falhas) porMotivo.set(f.motivo, (porMotivo.get(f.motivo) ?? 0) + 1)
  console.log('\npor motivo:')
  for (const [m, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m.padEnd(24)} ${n}`)
  }

  const porGerador = new Map<string, number>()
  for (const f of falhas) porGerador.set(f.id, (porGerador.get(f.id) ?? 0) + 1)
  console.log('\npor gerador:')
  for (const [g, n] of [...porGerador].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g.padEnd(16)} ${n}`)
  }

  console.log('\nexemplos:')
  for (const f of falhas.slice(0, 6)) {
    console.log(`  ${f.id} n${f.nivel} seed ${f.seed}: ${f.motivo} (${f.valor.toFixed(1)})`)
  }
  process.exit(1)
}

console.log('\n✓ toda questão espacial tem figura legível e alternativas separáveis')
