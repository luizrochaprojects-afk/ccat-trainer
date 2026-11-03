import type { OptionId } from '../optionIds'
import { mulberry32, seedFromString } from '../rng'
import { gerarQuestao } from './geradores'
import type { QmQuestao } from './questao'
import { ajustarNivel, escolherSubskill, type QmResposta } from './selecao'
import {
  AQUECIMENTO_MS,
  DURACAO_SESSAO_MS,
  SUBSKILLS,
  SUBSKILLS_ATIVAS,
  TAMANHO_BLOCO,
  type Nivel,
  type Subskill,
} from './taxonomia'

/**
 * Sessão diária de Quick Math — reducer puro.
 *
 * Diferente do motor da CCAT em três pontos, e por isso é outro reducer:
 *  - a fila não existe de antemão: cada questão é escolhida no momento, pela
 *    fraqueza mais recente;
 *  - o tempo da questão não estoura, só é medido contra o alvo;
 *  - a sessão termina por tempo total, mas na transição: quem está lendo o
 *    feedback quando dá 15 minutos termina a leitura.
 *
 * Estrutura: 2 minutos de aquecimento (subskills sorteadas, nível ≤ 2) e depois
 * blocos de 5 questões da mesma subskill. Ao fechar um bloco, o nível daquela
 * subskill é ajustado.
 */

export interface QmSessao {
  id: string
  seed: number
  startedAt: number
  niveis: Record<Subskill, Nivel>
  /** respostas de sessões anteriores, só para a seleção */
  historico: QmResposta[]
  respostas: QmResposta[]
  atual: QmQuestao
  indice: number
  questaoIniciadaEm: number
  /** a resposta da questão atual, enquanto o feedback está na tela */
  revelada: QmResposta | null
  /** null durante o aquecimento; `inicio` é o índice em `respostas` */
  bloco: { subskill: Subskill; inicio: number } | null
  status: 'rodando' | 'encerrada'
  encerradaEm?: number
}

export interface QmResumoLinha {
  subskill: Subskill
  n: number
  certas: number
  tempoMedioMs: number
  alvoMedioMs: number
  nivelFinal: Nivel
}

const AQUECIMENTO_NIVEL_MAX: Nivel = 2

export function criarSessao(p: {
  seed: number
  agora: number
  niveis: Partial<Record<Subskill, Nivel>>
  historico: QmResposta[]
}): QmSessao {
  const niveis = Object.fromEntries(SUBSKILLS.map((s) => [s, p.niveis[s] ?? 1])) as Record<Subskill, Nivel>
  const base = {
    id: `qm-${p.agora}`,
    seed: p.seed,
    startedAt: p.agora,
    niveis,
    historico: p.historico,
    respostas: [],
    indice: 0,
    questaoIniciadaEm: p.agora,
    revelada: null,
    bloco: null,
    status: 'rodando' as const,
  }
  return { ...base, atual: questaoDeAquecimento(base.seed, 0, niveis) }
}

export function responder(s: QmSessao, chosenId: OptionId | null, agora: number): QmSessao {
  if (s.status === 'encerrada' || s.revelada) return s
  const q = s.atual
  const resposta: QmResposta = {
    id: `${s.id}-${s.indice}`,
    sessaoId: s.id,
    questaoId: q.id,
    subskill: q.subskill,
    nivel: q.nivel,
    chosenId,
    correta: chosenId !== null && chosenId === q.answerId,
    elapsedMs: Math.max(0, agora - s.questaoIniciadaEm),
    alvoMs: q.alvoMs,
    respondidaEm: agora,
  }
  return { ...s, respostas: [...s.respostas, resposta], revelada: resposta }
}

export function avancar(s: QmSessao, agora: number): QmSessao {
  if (s.status === 'encerrada' || !s.revelada) return s
  const fechado = fecharBlocoCompleto({ ...s, revelada: null })
  if (agora - s.startedAt >= DURACAO_SESSAO_MS) return encerrar(fechado, agora)

  const indice = s.indice + 1
  if (agora - s.startedAt < AQUECIMENTO_MS) {
    return {
      ...fechado,
      indice,
      questaoIniciadaEm: agora,
      atual: questaoDeAquecimento(s.seed, indice, fechado.niveis),
    }
  }

  let bloco = fechado.bloco
  if (!bloco) {
    const rng = mulberry32(seedDaQuestao(s.seed, indice))
    const subskill = escolherSubskill(rng, [...s.historico, ...fechado.respostas], SUBSKILLS_ATIVAS)
    bloco = { subskill, inicio: fechado.respostas.length }
  }
  return {
    ...fechado,
    bloco,
    indice,
    questaoIniciadaEm: agora,
    atual: gerarQuestao(bloco.subskill, fechado.niveis[bloco.subskill], seedDaQuestao(s.seed, indice)),
  }
}

export function encerrar(s: QmSessao, agora: number): QmSessao {
  if (s.status === 'encerrada') return s
  return { ...fecharBlocoCompleto(s), status: 'encerrada', encerradaEm: agora }
}

export function restanteMs(s: QmSessao, agora: number): number {
  if (s.status === 'encerrada') return 0
  return Math.max(0, DURACAO_SESSAO_MS - (agora - s.startedAt))
}

export function resumir(s: QmSessao): QmResumoLinha[] {
  return SUBSKILLS.flatMap((subskill) => {
    const r = s.respostas.filter((x) => x.subskill === subskill)
    if (r.length === 0) return []
    return [
      {
        subskill,
        n: r.length,
        certas: r.filter((x) => x.correta).length,
        tempoMedioMs: r.reduce((a, x) => a + x.elapsedMs, 0) / r.length,
        alvoMedioMs: r.reduce((a, x) => a + x.alvoMs, 0) / r.length,
        nivelFinal: s.niveis[subskill],
      },
    ]
  })
}

// --- internos ----------------------------------------------------------------

function seedDaQuestao(seed: number, indice: number): number {
  return seedFromString(`${seed}:${indice}`)
}

function questaoDeAquecimento(seed: number, indice: number, niveis: Record<Subskill, Nivel>): QmQuestao {
  const s = seedDaQuestao(seed, indice)
  const subskill = mulberry32(s).pick(SUBSKILLS_ATIVAS)
  const nivel = Math.min(niveis[subskill], AQUECIMENTO_NIVEL_MAX) as Nivel
  return gerarQuestao(subskill, nivel, s)
}

/** Bloco com 5 respostas: ajusta o nível da subskill e libera a vaga. */
function fecharBlocoCompleto(s: QmSessao): QmSessao {
  if (!s.bloco) return s
  const doBloco = s.respostas.slice(s.bloco.inicio)
  if (doBloco.length < TAMANHO_BLOCO) return s
  const { subskill } = s.bloco
  return { ...s, bloco: null, niveis: { ...s.niveis, [subskill]: ajustarNivel(s.niveis[subskill], doBloco) } }
}
