import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { questionBankSchema, type Question } from '../../src/core/schema'
import { TIPOS, type Tipo } from '../../src/core/taxonomy'

/** Leitura e escrita do banco de questões versionado no repositório. */

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const CONTENT_DIR = join(ROOT, 'content')
export const APPROVED_DIR = join(CONTENT_DIR, 'approved')
export const DRAFTS_DIR = join(CONTENT_DIR, 'drafts')
export const REFERENCE_DIR = join(CONTENT_DIR, 'reference')

export function readApproved(tipo?: Tipo): Question[] {
  const tipos = tipo ? [tipo] : TIPOS
  return tipos.flatMap((t) => readJsonArray(join(APPROVED_DIR, `${t}.json`)))
}

export function readDrafts(): { arquivo: string; questoes: unknown[] }[] {
  mkdirSync(DRAFTS_DIR, { recursive: true })
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      arquivo: f,
      questoes: JSON.parse(readFileSync(join(DRAFTS_DIR, f), 'utf8')) as unknown[],
    }))
}

export function writeApproved(tipo: Tipo, questoes: Question[]): void {
  mkdirSync(APPROVED_DIR, { recursive: true })
  // Ordenado por id: o diff do git fica legível e a escrita é idempotente.
  const ordenadas = [...questoes].sort((a, b) => a.id.localeCompare(b.id))
  questionBankSchema.parse(ordenadas)
  writeFileSync(join(APPROVED_DIR, `${tipo}.json`), `${JSON.stringify(ordenadas, null, 2)}\n`, 'utf8')
}

export function writeDraftPack(nome: string, questoes: Question[]): string {
  mkdirSync(DRAFTS_DIR, { recursive: true })
  const caminho = join(DRAFTS_DIR, `${nome}.json`)
  writeFileSync(caminho, `${JSON.stringify(questoes, null, 2)}\n`, 'utf8')
  return caminho
}

function readJsonArray(caminho: string): Question[] {
  try {
    const bruto = JSON.parse(readFileSync(caminho, 'utf8')) as unknown
    return questionBankSchema.parse(bruto)
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw erro
  }
}

/** Contagem por tipo e por nível — o que os relatórios do pipeline mostram. */
export function resumo(questoes: Question[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const q of questoes) {
    out[q.tipo] = (out[q.tipo] ?? 0) + 1
    out[`${q.tipo}/n${q.difficulty}`] = (out[`${q.tipo}/n${q.difficulty}`] ?? 0) + 1
  }
  return out
}
