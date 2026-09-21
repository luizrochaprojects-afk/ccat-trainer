import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AnswerRecord, SessionState } from '../core/session/engine'
import type { SessionScore } from '../core/session/score'

/**
 * Persistência local (PRD §4.21–4.22).
 *
 * Todo registro carrega `userId`, fixo em 'local' na Fase 0. É o único preço
 * pago antecipadamente pela fase de contas: quando a sincronização entrar, o
 * schema já está no formato certo e não há migração de dados do usuário.
 *
 * Nenhuma tela fala com o IndexedDB direto — tudo passa por aqui.
 */

export const LOCAL_USER = 'local'

export interface StoredSession {
  id: string
  userId: string
  mode: 'exam' | 'drill'
  /** filtro do drill, para a tela de progresso agrupar */
  tipo?: string
  subtipo?: string
  startedAt: number
  finishedAt: number
  score: SessionScore
}

export interface StoredAnswer extends AnswerRecord {
  id: string
  userId: string
  sessionId: string
  answeredAt: number
}

export interface SeenQuestion {
  key: string
  userId: string
  questionId: string
  lastSeenAt: number
}

interface CcatDB extends DBSchema {
  sessions: {
    key: string
    value: StoredSession
    indexes: { 'by-user': string; 'by-finished': number }
  }
  answers: {
    key: string
    value: StoredAnswer
    indexes: { 'by-session': string; 'by-user': string }
  }
  seen: {
    key: string
    value: SeenQuestion
    indexes: { 'by-user': string }
  }
  /** sessão em andamento, para sobreviver a um F5 no meio da prova */
  active: { key: string; value: { userId: string; state: SessionState } }
}

const DB_NAME = 'ccat-trainer'
const DB_VERSION = 1

let conexao: Promise<IDBPDatabase<CcatDB>> | null = null

function db(): Promise<IDBPDatabase<CcatDB>> {
  conexao ??= openDB<CcatDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const sessions = database.createObjectStore('sessions', { keyPath: 'id' })
      sessions.createIndex('by-user', 'userId')
      sessions.createIndex('by-finished', 'finishedAt')

      const answers = database.createObjectStore('answers', { keyPath: 'id' })
      answers.createIndex('by-session', 'sessionId')
      answers.createIndex('by-user', 'userId')

      const seen = database.createObjectStore('seen', { keyPath: 'key' })
      seen.createIndex('by-user', 'userId')

      database.createObjectStore('active', { keyPath: 'userId' })
    },
  })
  return conexao
}

/**
 * IndexedDB falha em aba anônima, com site data bloqueado e em alguns
 * navegadores embarcados. Nada disso pode derrubar uma prova em andamento:
 * o app continua funcionando, só perde o histórico.
 */
async function comFallback<T>(fn: (d: IDBPDatabase<CcatDB>) => Promise<T>, padrao: T): Promise<T> {
  try {
    return await fn(await db())
  } catch (erro) {
    console.warn('[ccat] armazenamento local indisponível:', erro)
    return padrao
  }
}

// --- Sessões -----------------------------------------------------------------

export async function saveSession(
  state: SessionState,
  score: SessionScore,
  extra: { tipo?: string; subtipo?: string } = {},
): Promise<string> {
  const id = `s-${state.config.startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const finishedAt = state.finishedAt ?? Date.now()

  return comFallback(async (d) => {
    const tx = d.transaction(['sessions', 'answers', 'seen'], 'readwrite')

    await tx.objectStore('sessions').put({
      id,
      userId: LOCAL_USER,
      mode: state.config.mode,
      ...(extra.tipo ? { tipo: extra.tipo } : {}),
      ...(extra.subtipo ? { subtipo: extra.subtipo } : {}),
      startedAt: state.config.startedAt,
      finishedAt,
      score,
    })

    const answersStore = tx.objectStore('answers')
    const seenStore = tx.objectStore('seen')

    for (const [i, a] of state.answers.entries()) {
      await answersStore.put({
        ...a,
        id: `${id}-${i}`,
        userId: LOCAL_USER,
        sessionId: id,
        answeredAt: finishedAt,
      })
      await seenStore.put({
        key: `${LOCAL_USER}:${a.questionId}`,
        userId: LOCAL_USER,
        questionId: a.questionId,
        lastSeenAt: finishedAt,
      })
    }

    await tx.done
    return id
  }, id)
}

export async function listSessions(limit = 100): Promise<StoredSession[]> {
  return comFallback(async (d) => {
    const todas = await d.getAllFromIndex('sessions', 'by-user', LOCAL_USER)
    return todas.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, limit)
  }, [])
}

export async function getSession(id: string): Promise<StoredSession | undefined> {
  return comFallback((d) => d.get('sessions', id), undefined)
}

export async function getSessionAnswers(sessionId: string): Promise<StoredAnswer[]> {
  return comFallback((d) => d.getAllFromIndex('answers', 'by-session', sessionId), [])
}

// --- Questões já vistas ------------------------------------------------------

/**
 * Janela de questões já vistas, usada pelo compositor para não repetir.
 *
 * A janela é deliberadamente longa (90 dias): com ~1.100 questões e 20
 * simulações possíveis, repetir cedo demais transformaria a medição em teste
 * de memória em vez de raciocínio.
 */
const JANELA_VISTAS_MS = 90 * 24 * 60 * 60 * 1000

export async function seenQuestionIds(now = Date.now()): Promise<Set<string>> {
  return comFallback(async (d) => {
    const todas = await d.getAllFromIndex('seen', 'by-user', LOCAL_USER)
    return new Set(
      todas.filter((s) => now - s.lastSeenAt <= JANELA_VISTAS_MS).map((s) => s.questionId),
    )
  }, new Set<string>())
}

// --- Sessão em andamento -----------------------------------------------------

export async function saveActiveSession(state: SessionState): Promise<void> {
  await comFallback(async (d) => {
    await d.put('active', { userId: LOCAL_USER, state })
  }, undefined)
}

export async function loadActiveSession(): Promise<SessionState | null> {
  return comFallback(async (d) => {
    const registro = await d.get('active', LOCAL_USER)
    return registro?.state ?? null
  }, null)
}

export async function clearActiveSession(): Promise<void> {
  await comFallback(async (d) => {
    await d.delete('active', LOCAL_USER)
  }, undefined)
}

// --- Manutenção --------------------------------------------------------------

export async function clearAllData(): Promise<void> {
  await comFallback(async (d) => {
    await Promise.all([
      d.clear('sessions'),
      d.clear('answers'),
      d.clear('seen'),
      d.clear('active'),
    ])
  }, undefined)
}
