/**
 * Trava de build: garante que nada não-aprovado chega ao usuário.
 *
 * Roda antes de `vite build`. É a métrica do PRD §8 ("100% das questões no ar
 * passaram pelos gates; nenhuma draft é servida") transformada em falha de CI,
 * porque promessa que não é verificada por máquina não sobrevive a uma
 * sexta-feira corrida.
 */
import { readApproved, REFERENCE_DIR } from './lib/bank'
import { runGates } from '../src/core/content/gates'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

let falhas = 0

// 1. Tudo em content/approved precisa ter status 'approved'.
const aprovadas = readApproved()
const naoAprovadas = aprovadas.filter((q) => q.status !== 'approved')
if (naoAprovadas.length > 0) {
  console.error(`✗ ${naoAprovadas.length} questões em content/approved sem status "approved":`)
  for (const q of naoAprovadas.slice(0, 10)) console.error(`    ${q.id} (${q.status})`)
  falhas++
}

// 2. E precisa continuar passando nos gates — não basta ter passado um dia.
//    Um banco vazio contra si mesmo acusaria tudo como duplicata, então a
//    verificação roda com a base de comparação vazia.
const r = runGates(aprovadas, [])
if (r.rejected.length > 0) {
  console.error(`✗ ${r.rejected.length} questões aprovadas NÃO passam mais nos gates:`)
  for (const { question, violations } of r.rejected.slice(0, 10)) {
    console.error(`    ${question?.id}: ${violations[0]?.gate} — ${violations[0]?.message}`)
  }
  falhas++
}

// 3. Amostras oficiais são material de calibração e nunca podem virar conteúdo.
const referencia = join(REFERENCE_DIR, 'official.json')
if (existsSync(referencia)) {
  const itens = JSON.parse(readFileSync(referencia, 'utf8')) as { status?: string }[]
  const vazadas = itens.filter((q) => q.status === 'approved')
  if (vazadas.length > 0) {
    console.error(`✗ ${vazadas.length} amostras oficiais marcadas como "approved" — elas nunca são servidas`)
    falhas++
  }
}

if (falhas > 0) {
  console.error('\nbuild bloqueado.')
  process.exit(1)
}

console.log(`✓ ${aprovadas.length} questões aprovadas, todas passando nos gates`)
