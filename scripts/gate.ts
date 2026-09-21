/**
 * Roda os cinco gates sobre os drafts e relata o veredito.
 *
 * Só relata — não promove nada. Quem escreve no banco é `content:promote`,
 * e ele roda os mesmos gates de novo antes de escrever.
 *
 *   npx tsx scripts/gate.ts
 */
import { runGates, type Violation } from '../src/core/content/gates'
import { readApproved, readDrafts } from './lib/bank'

const drafts = readDrafts()
if (drafts.length === 0) {
  console.log('nenhum draft em content/drafts — nada a verificar')
  process.exit(0)
}

const aprovadas = readApproved()
let totalOk = 0
let totalReprovado = 0
const porGate = new Map<string, number>()

for (const { arquivo, questoes } of drafts) {
  const r = runGates(questoes, aprovadas)
  totalOk += r.approved.length
  totalReprovado += r.rejected.length

  for (const v of r.violations) porGate.set(v.gate, (porGate.get(v.gate) ?? 0) + 1)

  console.log(
    `${arquivo}: ${r.approved.length} passaram, ${r.rejected.length} reprovadas ` +
      `(de ${questoes.length})`,
  )

  for (const { question, violations } of r.rejected.slice(0, 10)) {
    console.log(`  ✗ ${question?.id ?? '(sem id)'}`)
    for (const v of violations.slice(0, 3)) console.log(`      ${v.gate}: ${v.message}`)
  }
  if (r.rejected.length > 10) console.log(`  … e mais ${r.rejected.length - 10} reprovadas`)
}

console.log(`\nresumo: ${totalOk} aprovadas · ${totalReprovado} reprovadas`)
if (porGate.size > 0) {
  console.log('violações por gate:')
  for (const [gate, n] of [...porGate].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${gate.padEnd(18)} ${n}`)
  }
}

// Reprovar draft é o gate funcionando, não falha de build. O que quebra o
// pipeline é NENHUMA questão passar — aí tem algo errado no gerador.
if (totalOk === 0) {
  console.error('\nnenhuma questão passou nos gates — verifique os geradores')
  process.exit(1)
}

export type { Violation }
