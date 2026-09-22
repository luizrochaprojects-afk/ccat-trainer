import type { Question } from '../core/schema'

/**
 * Questões de mentira para os testes de componente.
 *
 * Deliberadamente NÃO lê o banco real: um teste de interface não deve quebrar
 * porque o conteúdo mudou, e carregar 4 MB de questões para verificar um
 * `role="radio"` seria absurdo.
 */
export function questaoFalsa(n: number): Question {
  return {
    id: `q-${n}`,
    tipo: 'verbal_vocab',
    subtipo: 'sinonimo',
    difficulty: 2,
    stem: `Pergunta ${n}`,
    options: [
      { id: `q-${n}-a`, text: 'alfa' },
      { id: `q-${n}-b`, text: 'beta' },
      { id: `q-${n}-c`, text: 'gama' },
      { id: `q-${n}-d`, text: 'delta' },
      { id: `q-${n}-e`, text: 'epsilon' },
    ],
    answerId: `q-${n}-c`,
    explanation: { en: 'Because gamma.', pt: 'Porque gama.' },
    theoryRef: 'verbal_vocab#sinonimo',
    origin: 'claude-code',
    status: 'approved',
    verification: { method: 'rule' },
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

export const questoesFalsas = (quantas: number): Question[] =>
  Array.from({ length: quantas }, (_, i) => questaoFalsa(i + 1))
