import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { dedupSignature, jaccard, runGates, trigrams, type GateId } from './gates'
import { SPATIAL_GENERATOR_IDS } from '../spatial/generators'

const AGORA = '2026-09-21T12:00:00.000Z'

/** Uma questão boa, vinda de um gerador determinístico real. */
function boa(generator = 'serie_simples', seed = 42, difficulty: 1 | 3 = 3): Question {
  return buildQuestion(generator, seed, difficulty, AGORA)
}

function gatesDisparados(draft: unknown): GateId[] {
  const { violations } = runGates([draft])
  return [...new Set(violations.map((v) => v.gate))]
}

describe('runGates — caminho feliz', () => {
  it('aprova questões vindas dos geradores determinísticos', () => {
    const drafts = [
      boa('serie_simples', 1),
      boa('serie_alternada', 2),
      boa('rotacao.arcos', 3),
      boa('porcentagem', 4),
      boa('matriz.raios', 5),
    ]
    const r = runGates(drafts)
    expect(r.violations, JSON.stringify(r.violations, null, 2)).toHaveLength(0)
    expect(r.approved).toHaveLength(5)
  })

  it('promove o status de draft para approved', () => {
    expect(boa().status).toBe('draft')
    expect(runGates([boa()]).approved[0]!.status).toBe('approved')
  })

  it('nunca devolve uma questão que não passou', () => {
    const r = runGates([boa('serie_simples', 7), { id: 'lixo' }])
    expect(r.approved).toHaveLength(1)
    expect(r.rejected).toHaveLength(1)
    for (const q of r.approved) expect(q.status).toBe('approved')
  })
})

describe('G1 — schema', () => {
  it('barra objeto que não é questão', () => {
    expect(gatesDisparados({ id: 'nada' })).toContain('G1_schema')
  })

  it('barra tipo fora da taxonomia', () => {
    expect(gatesDisparados({ ...boa(), tipo: 'telepatia' })).toContain('G1_schema')
  })

  it('barra dificuldade fora de 1..5', () => {
    expect(gatesDisparados({ ...boa(), difficulty: 9 })).toContain('G1_schema')
  })

  it('barra answerId que não existe entre as alternativas', () => {
    expect(gatesDisparados({ ...boa(), answerId: 'z' })).toContain('G1_schema')
  })

  it('barra alternativa sem texto nem figura', () => {
    const q = boa()
    const quebrada = { ...q, options: [...q.options.slice(1), { id: 'z' }] }
    expect(gatesDisparados(quebrada)).toContain('G1_schema')
  })

  it('barra explicação vazia', () => {
    expect(gatesDisparados({ ...boa(), explanation: '' })).toContain('G1_schema')
  })
})

describe('G5 — alternativas', () => {
  /**
   * Contagem, ids duplicados e texto repetido já são barrados pelo schema (G1),
   * que roda primeiro e curto-circuita. Estes testes fixam esse contrato e
   * cobrem o que só o G5 enxerga.
   */
  it('o schema é a primeira linha: 3 alternativas nem chegam ao G5', () => {
    const q = boa()
    expect(gatesDisparados({ ...q, options: q.options.slice(0, 3) })).toEqual(['G1_schema'])
  })

  it('o schema barra alternativas com o mesmo texto', () => {
    const q = boa()
    const dup = { ...q, options: [...q.options.slice(0, -1), { ...q.options[0]!, id: 'z' }] }
    expect(gatesDisparados(dup)).toEqual(['G1_schema'])
  })

  it('barra "nenhuma das anteriores" no meio de alternativas numéricas', () => {
    const q = boa()
    const misturada = {
      ...q,
      options: [...q.options.slice(0, -1), { id: 'z', text: 'nenhuma das anteriores' }],
    }
    expect(gatesDisparados(misturada)).toContain('G5_alternativas')
  })

  it('barra alternativa que fica vazia depois de normalizar', () => {
    const q = boa()
    const vazia = { ...q, options: [...q.options.slice(0, -1), { id: 'z', text: '---' }] }
    expect(gatesDisparados(vazia)).toContain('G5_alternativas')
  })
})

describe('G3 — dificuldade', () => {
  it('barra nível 1 com 5 alternativas', () => {
    const q = boa('serie_simples', 42, 3) // nível 3 → 5 alternativas
    expect(gatesDisparados({ ...q, difficulty: 1 })).toContain('G3_dificuldade')
  })

  it('barra nível 5 com 4 alternativas', () => {
    const q = boa('serie_simples', 42, 1) // nível 1 → 4 alternativas
    expect(gatesDisparados({ ...q, difficulty: 5 })).toContain('G3_dificuldade')
  })
})

describe('G2 — gabarito', () => {
  it('barra gabarito trocado à mão', () => {
    const q = boa()
    const outra = q.options.find((o) => o.id !== q.answerId)!
    expect(gatesDisparados({ ...q, answerId: outra.id })).toContain('G2_gabarito')
  })

  it('barra enunciado editado à mão (não reproduz pela seed)', () => {
    expect(gatesDisparados({ ...boa(), stem: '2, 4, 6, 8, 10, ?' })).toContain('G2_gabarito')
  })

  it('barra alternativa editada à mão', () => {
    const q = boa()
    const adulterada = {
      ...q,
      options: q.options.map((o) => (o.id === q.answerId ? { ...o, text: '999999' } : o)),
    }
    expect(gatesDisparados(adulterada)).toContain('G2_gabarito')
  })

  it('barra verificação sem seed (irreproduzível)', () => {
    const q = boa()
    const semSeed = { ...q, verification: { ...q.verification, seed: undefined } }
    expect(gatesDisparados(semSeed)).toContain('G2_gabarito')
  })

  it('barra gerador inexistente', () => {
    const q = boa()
    expect(
      gatesDisparados({ ...q, verification: { ...q.verification, generator: 'inventado' } }),
    ).toContain('G2_gabarito')
  })

  it('barra método de verificação errado para o tipo', () => {
    const q = boa()
    const errado = { ...q, verification: { ...q.verification, method: 'second-model' as const } }
    expect(gatesDisparados(errado)).toContain('G2_gabarito')
  })

  it('barra expressão que não bate com a alternativa marcada', () => {
    const q = boa()
    const mentirosa = { ...q, verification: { ...q.verification, expression: '1+1' } }
    expect(gatesDisparados(mentirosa)).toContain('G2_gabarito')
  })

  it('barra expressão que não é aritmética pura', () => {
    const q = boa()
    const veneno = {
      ...q,
      verification: { ...q.verification, expression: 'process.exit(1)' },
    }
    expect(gatesDisparados(veneno)).toContain('G2_gabarito')
  })

  describe('conteúdo verbal (segundo modelo)', () => {
    const verbal = (extra: Record<string, unknown>): unknown => ({
      ...boa(),
      tipo: 'verbal_vocab',
      subtipo: 'antonimo',
      stem: 'Qual é o antônimo de "efêmero"?',
      options: [
        { id: 'a', text: 'duradouro' },
        { id: 'b', text: 'passageiro' },
        { id: 'c', text: 'breve' },
        { id: 'd', text: 'fugaz' },
        { id: 'e', text: 'transitório' },
      ],
      answerId: 'a',
      verification: { method: 'second-model', checkedAt: AGORA, ...extra },
    })

    it('aprova quando o segundo modelo concorda', () => {
      const r = runGates([verbal({ model: 'claude-opus-5', modelAnswerId: 'a' })])
      expect(r.violations, JSON.stringify(r.violations)).toHaveLength(0)
    })

    it('barra quando o segundo modelo discorda', () => {
      expect(
        gatesDisparados(verbal({ model: 'claude-opus-5', modelAnswerId: 'b' })),
      ).toContain('G2_gabarito')
    })

    it('barra quando ninguém revisou', () => {
      expect(gatesDisparados(verbal({}))).toContain('G2_gabarito')
    })

    it('barra quando o revisor não é identificado', () => {
      expect(gatesDisparados(verbal({ modelAnswerId: 'a' }))).toContain('G2_gabarito')
    })
  })
})

describe('G4 — dedup', () => {
  it('barra enunciado idêntico dentro do mesmo lote', () => {
    const q = boa('serie_simples', 42)
    const clone = { ...q, id: 'outro-id' }
    const r = runGates([q, clone])
    expect(r.approved).toHaveLength(1)
    expect(r.violations.map((v) => v.gate)).toContain('G4_dedup')
  })

  it('barra enunciado idêntico ao que já está aprovado', () => {
    const jaAprovada = { ...boa('serie_simples', 42), status: 'approved' as const }
    const r = runGates([{ ...boa('serie_simples', 42), id: 'novo' }], [jaAprovada])
    expect(r.approved).toHaveLength(0)
    expect(r.violations.map((v) => v.gate)).toContain('G4_dedup')
  })

  it('barra quase-duplicata (mesmo enunciado com pontuação trocada)', () => {
    const q = boa('porcentagem', 5)
    const quase = {
      ...q,
      id: 'quase',
      stem: `${q.stem} `,
      verification: { ...q.verification, generator: q.verification.generator },
    }
    const r = runGates([q, quase])
    // a segunda é barrada — por dedup ou por não reproduzir; o que não pode é passar
    expect(r.approved).toHaveLength(1)
  })

  it('deixa passar questões genuinamente diferentes do mesmo gerador', () => {
    const drafts = [1, 2, 3, 4, 5].map((s) => boa('serie_simples', s))
    const r = runGates(drafts)
    expect(r.approved.length).toBeGreaterThanOrEqual(4)
  })
})

describe('similaridade', () => {
  it('jaccard vale 1 para textos idênticos e 0 para disjuntos', () => {
    expect(jaccard(trigrams('abcdef'), trigrams('abcdef'))).toBe(1)
    expect(jaccard(trigrams('xyz'), trigrams('qwerty'))).toBeLessThan(0.2)
  })

  it('reconhece variação mínima como quase-duplicata', () => {
    const a = trigrams('Um produto de R$ 200 recebeu 20% de desconto. Qual o preço final?')
    const b = trigrams('Um produto de R$ 200 recebeu 20% de desconto, qual o preço final?')
    expect(jaccard(a, b)).toBeGreaterThan(0.85)
  })
})

/**
 * Regressão: o dedup usava só o texto do enunciado. Como TODA questão espacial
 * do mesmo subtipo tem o mesmo texto ("Qual das alternativas é a mesma figura
 * acima, apenas girada?"), o G4 reprovava o banco espacial inteiro a partir da
 * segunda questão — e espacial são 16 das 50 questões da prova.
 */
describe('G4 — dedup de questões gráficas', () => {
  it('aprova 20 questões espaciais distintas do mesmo gerador', () => {
    const drafts = Array.from({ length: 20 }, (_, i) => boa('rotacao.arcos', i + 1, 3))
    const r = runGates(drafts)
    expect(r.rejected, JSON.stringify(r.rejected.map((x) => x.violations))).toHaveLength(0)
    expect(r.approved).toHaveLength(20)
  })

  it('aprova questões de todos os geradores espaciais em lote', () => {
    const porGerador = 10
    const drafts = SPATIAL_GENERATOR_IDS.flatMap((g) =>
      Array.from({ length: porGerador }, (_, i) => boa(g, i + 1, 3)),
    )
    const r = runGates(drafts)
    expect(r.rejected, JSON.stringify(r.rejected.map((x) => x.violations))).toHaveLength(0)
    expect(r.approved).toHaveLength(SPATIAL_GENERATOR_IDS.length * porGerador)
  })

  it('ainda barra a MESMA figura repetida (mesma seed)', () => {
    const q = boa('rotacao.arcos', 7, 3)
    const r = runGates([q, { ...q, id: 'clone' }])
    expect(r.approved).toHaveLength(1)
    expect(r.violations.map((v) => v.gate)).toContain('G4_dedup')
  })

  it('a assinatura de duas figuras diferentes é diferente', () => {
    expect(dedupSignature(boa('matriz.raios', 1, 3))).not.toBe(dedupSignature(boa('matriz.raios', 2, 3)))
  })
})
