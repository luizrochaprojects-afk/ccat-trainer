import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { QmResposta } from '../core/quickmath/selecao'
import type { QmResumoLinha } from '../core/quickmath/sessao'
import type { Nivel, Subskill } from '../core/quickmath/taxonomia'

/**
 * Persistência do Quick Math.
 *
 * Banco próprio, e não stores novas no `ccat-trainer`: subir a versão daquele
 * banco é uma migração no aparelho de quem já usa a CCAT, e um erro nela
 * custaria o histórico de provas. Aqui o pior caso é perder o histórico de
 * contas.
 *
 * As respostas são gravadas uma a uma, conforme saem. Não há sessão em
 * andamento para restaurar: um F5 começa uma sessão nova, mas o que foi
 * respondido já está salvo e continua alimentando a seleção.
 */

const LOCAL_USER = 'local'

export interface QmSessaoGravada {
  id: string
  startedAt: number
  encerradaEm: number
  resumo: QmResumoLinha[]
}

interface QmDB extends DBSchema {
  respostas: { key: string; value: QmResposta; indexes: { 'by-respondida': number } }
  niveis: { key: string; value: { userId: string; niveis: Record<Subskill, Nivel> } }
  sessoes: { key: string; value: QmSessaoGravada }
}

let conexao: Promise<IDBPDatabase<QmDB>> | null = null

function db(): Promise<IDBPDatabase<QmDB>> {
  conexao ??= openDB<QmDB>('ccat-quickmath', 1, {
    upgrade(database) {
      const respostas = database.createObjectStore('respostas', { keyPath: 'id' })
      respostas.createIndex('by-respondida', 'respondidaEm')
      database.createObjectStore('niveis', { keyPath: 'userId' })
      database.createObjectStore('sessoes', { keyPath: 'id' })
    },
  })
  return conexao
}

/** Mesmo contrato de `db.ts`: armazenamento bloqueado não derruba a sessão. */
async function comFallback<T>(fn: (d: IDBPDatabase<QmDB>) => Promise<T>, padrao: T): Promise<T> {
  try {
    return await fn(await db())
  } catch (erro) {
    console.warn('[ccat] armazenamento do quick math indisponível:', erro)
    return padrao
  }
}

export async function salvarResposta(r: QmResposta): Promise<void> {
  await comFallback(async (d) => {
    await d.put('respostas', r)
  }, undefined)
}

/** As `limite` respostas mais recentes, em ordem cronológica. */
export async function carregarHistorico(limite = 500): Promise<QmResposta[]> {
  return comFallback(async (d) => {
    const todas = await d.getAllFromIndex('respostas', 'by-respondida')
    return todas.slice(-limite)
  }, [])
}

export async function carregarNiveis(): Promise<Partial<Record<Subskill, Nivel>>> {
  return comFallback(async (d) => (await d.get('niveis', LOCAL_USER))?.niveis ?? {}, {})
}

export async function salvarNiveis(niveis: Record<Subskill, Nivel>): Promise<void> {
  await comFallback(async (d) => {
    await d.put('niveis', { userId: LOCAL_USER, niveis })
  }, undefined)
}

export async function salvarSessaoQm(s: QmSessaoGravada): Promise<void> {
  await comFallback(async (d) => {
    await d.put('sessoes', s)
  }, undefined)
}

export async function limparQuickMath(): Promise<void> {
  await comFallback(async (d) => {
    await Promise.all([d.clear('respostas'), d.clear('niveis'), d.clear('sessoes')])
  }, undefined)
}
