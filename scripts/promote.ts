/**
 * Promove drafts aprovados para content/approved/<tipo>.json.
 *
 * Roda os gates de novo (não confia no relatório anterior) e escreve apenas o
 * que passou, já com status 'approved'. Idempotente: rodar duas vezes não
 * duplica nada, porque o gate de dedup compara contra o banco existente.
 *
 *   npx tsx scripts/promote.ts [--dry-run]
 */
import { runGates } from '../src/core/content/gates'
import type { Question } from '../src/core/schema'
import { TIPOS, type Tipo } from '../src/core/taxonomy'
import { readApproved, readDrafts, resumo, writeApproved } from './lib/bank'

const dryRun = process.argv.includes('--dry-run')

const drafts = readDrafts()
if (drafts.length === 0) {
  console.log('nenhum draft em content/drafts — nada a promover')
  process.exit(0)
}

const bancoAtual = readApproved()
const novas: Question[] = []
let reprovadas = 0

// Acumula: uma questão promovida neste lote entra na base de comparação da
// próxima, senão o mesmo enunciado passa duas vezes em arquivos diferentes.
for (const { arquivo, questoes } of drafts) {
  const r = runGates(questoes, [...bancoAtual, ...novas])
  novas.push(...r.approved)
  reprovadas += r.rejected.length
  console.log(`${arquivo}: +${r.approved.length} aprovadas, ${r.rejected.length} reprovadas`)
}

if (novas.length === 0) {
  console.log('\nnenhuma questão nova passou nos gates — banco inalterado')
  process.exit(0)
}

const porTipo = new Map<Tipo, Question[]>()
for (const q of [...bancoAtual, ...novas]) {
  porTipo.set(q.tipo, [...(porTipo.get(q.tipo) ?? []), q])
}

console.log(`\n${novas.length} questões novas · ${reprovadas} reprovadas`)

if (dryRun) {
  console.log('(--dry-run: nada foi escrito)')
} else {
  for (const tipo of TIPOS) {
    const questoes = porTipo.get(tipo)
    if (questoes && questoes.length > 0) writeApproved(tipo, questoes)
  }
  console.log('banco atualizado em content/approved/')
}

console.log('\nbanco final:')
const contagem = resumo([...bancoAtual, ...novas])
for (const tipo of TIPOS) {
  console.log(`  ${tipo.padEnd(15)} ${String(contagem[tipo] ?? 0).padStart(4)}`)
}
