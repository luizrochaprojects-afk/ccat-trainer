import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { runGates } from './gates'

const AGORA = '2026-09-21T12:00:00.000Z'
const gerar = (g: string, seed: number, d: 1 | 2 | 3 | 4 | 5 = 3): Question =>
  buildQuestion(g, seed, d, AGORA)

/**
 * Só as reprovações DIFUSAS. Seeds diferentes produzindo a mesma questão é
 * normal e a assinatura exata deve barrar — o pipeline apenas tenta a próxima
 * seed. O que não pode acontecer é questão legítima cair por similaridade.
 */
const quaseDuplicatas = (drafts: Question[]) =>
  runGates(drafts).violations.filter(
    (v) => v.gate === 'G4_dedup' && v.message.includes('quase-duplicata'),
  )

/**
 * O gate G4 tem duas naturezas e errou nas duas antes de acertar:
 *
 *  1. Assinatura EXATA — vale para tudo. Precisa enxergar a figura, senão todo
 *     espacial do mesmo subtipo colide (compartilham o texto do enunciado).
 *  2. Quase-duplicata difusa — vale só para texto ESCRITO. Em conteúdo gerado
 *     por regra, o boilerplate do template faz questões legítimas baterem 0,95
 *     de similaridade.
 */
describe('G4 — o que é duplicata e o que não é', () => {
  it('silogismos de formas lógicas diferentes convivem, mesmo com conclusão igual', () => {
    // celarent e cesare concluem ambos "No A are C" e compartilham quase todo
    // o texto; as premissas é que mudam.
    const drafts = Array.from({ length: 60 }, (_, i) => gerar('deducao', i + 1, 5))
    const difusas = quaseDuplicatas(drafts)
    expect(
      difusas.length,
      `${difusas.length} silogismos reprovados por similaridade: ` +
        difusas.slice(0, 3).map((v) => v.message).join(' / '),
    ).toBe(0)
  })

  it('problemas matemáticos do mesmo template com números diferentes convivem', () => {
    expect(
      quaseDuplicatas(Array.from({ length: 40 }, (_, i) => gerar('porcentagem', i + 1))),
    ).toHaveLength(0)
  })

  it('questões espaciais distintas do mesmo gerador convivem', () => {
    expect(
      quaseDuplicatas(Array.from({ length: 40 }, (_, i) => gerar('rotacao', i + 1))),
    ).toHaveLength(0)
  })

  it('mas a MESMA questão repetida continua sendo barrada', () => {
    for (const g of ['deducao', 'porcentagem', 'rotacao', 'antonimo', 'analogia']) {
      const q = gerar(g, 11)
      const r = runGates([q, { ...q, id: `${q.id}-clone` }])
      expect(r.approved, `${g}: clone passou`).toHaveLength(1)
      expect(r.violations.map((v) => v.gate)).toContain('G4_dedup')
    }
  })

  it('o gate difuso continua ativo para conteúdo escrito por modelo', () => {
    const base = {
      id: 'verbal-escrito-1',
      tipo: 'verbal_vocab',
      subtipo: 'antonimo',
      difficulty: 3,
      stem: 'Which word is most nearly OPPOSITE in meaning to "EPHEMERAL"?',
      options: [
        { id: 'a', text: 'everlasting' },
        { id: 'b', text: 'transitory' },
        { id: 'c', text: 'rapid' },
        { id: 'd', text: 'humid' },
        { id: 'e', text: 'timid' },
      ],
      answerId: 'a',
      explanation: 'Explicação suficientemente longa para o schema aceitar.',
      theoryRef: 'verbal_vocab.md#antonimo',
      origin: 'claude-code',
      status: 'draft',
      verification: { method: 'second-model', model: 'claude-opus-5', modelAnswerId: 'a' },
      createdAt: AGORA,
    }
    // mesma questão reescrita: pontuação e caixa mudam, o resto não
    const parafrase = {
      ...base,
      id: 'verbal-escrito-2',
      stem: 'Which word is most nearly OPPOSITE in meaning to "EPHEMERAL"',
    }

    const r = runGates([base, parafrase])
    expect(r.approved).toHaveLength(1)
    expect(r.violations.map((v) => v.gate)).toContain('G4_dedup')
  })
})
