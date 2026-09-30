import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { dedupSignature, jaccard, runGates, trigrams, type GateId } from './gates'
import { SPATIAL_GENERATOR_IDS } from '../spatial/generators'

const AGORA = '2026-09-21T12:00:00.000Z'

/** Uma questão boa, vinda de um gerador determinístico real. */
function boa(generator = 'serie_simples', seed = 42, difficulty: 1 | 3 | 5 = 3): Question {
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
  it('gerada tem 5 alternativas em qualquer nível, como a prova real', () => {
    expect(boa('serie_simples', 42, 1).options).toHaveLength(5)
    expect(gatesDisparados(boa('serie_simples', 42, 1))).not.toContain('G3_dificuldade')
  })

  it('barra gerada com 4 alternativas', () => {
    const q = boa('serie_simples', 42, 1)
    const umaErrada = q.options.find((o) => o.id !== q.answerId)!
    const comQuatro = q.options.filter((o) => o !== umaErrada)
    expect(gatesDisparados({ ...q, options: comQuatro })).toContain('G3_dificuldade')
  })
})

describe('exceção de 3 alternativas (verdadeiro/falso/incerto)', () => {
  const vf = (seed = 3) => buildQuestion('verdadeiro_falso', seed, 3, AGORA)

  it('aprova verdadeiro/falso/incerto com as 3 alternativas da prova', () => {
    const q = vf()
    expect(q.options.map((o) => o.text)).toEqual(['True', 'False', 'Uncertain'])
    expect(runGates([q]).violations).toEqual([])
  })

  it('verdadeiro/falso/incerto com 4 alternativas é barrado', () => {
    const q = vf()
    const comQuatro = { ...q, options: [...q.options, { id: 'd', text: 'Probably' }] }
    expect(gatesDisparados(comQuatro)).toContain('G5_alternativas')
  })

  it('qualquer outro subtipo com 3 alternativas continua barrado já no schema', () => {
    for (const [gerador, nivel] of [['deducao', 3], ['analogia', 1], ['serie_simples', 1]] as const) {
      const q = boa(gerador, 5, nivel)
      const certa = q.options.find((o) => o.id === q.answerId)!
      const tres = [certa, ...q.options.filter((o) => o !== certa).slice(0, 2)]
      expect(gatesDisparados({ ...q, options: tres }), gerador).toEqual(['G1_schema'])
    }
  })

  it('outro subtipo gerado com 4 alternativas continua barrado no G3', () => {
    const q = boa('deducao', 5, 3)
    const umaErrada = q.options.find((o) => o.id !== q.answerId)!
    expect(gatesDisparados({ ...q, options: q.options.filter((o) => o !== umaErrada) })).toContain(
      'G3_dificuldade',
    )
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

describe('G2 — série de letras (regra + leitor de letras)', () => {
  const letras = (seed = 5, d: 1 | 3 = 3) => boa('serie_letras', seed, d)

  it('aprova a série de letras gerada, verificada por regra e sem expressão', () => {
    const q = letras()
    expect(q.verification.method).toBe('rule')
    expect(gatesDisparados(q)).toEqual([])
  })

  it('o método "rule" vale só para o subtipo de letras, nunca para série numérica', () => {
    const q = boa('serie_simples', 42)
    const soRegra = { ...q, verification: { ...q.verification, method: 'rule' as const, expression: undefined } }
    expect(gatesDisparados(soRegra)).toContain('G2_gabarito')
  })

  it('e série de letras não aceita "solver" — não há número para avaliar', () => {
    const q = letras()
    const errado = { ...q, verification: { ...q.verification, method: 'solver' as const, expression: '1+1' } }
    expect(gatesDisparados(errado)).toContain('G2_gabarito')
  })

  it('barra gabarito trocado', () => {
    const q = letras()
    const outra = q.options.find((o) => o.id !== q.answerId)!
    expect(gatesDisparados({ ...q, answerId: outra.id })).toContain('G2_gabarito')
  })

  it('o leitor reprova enunciado sem regra, independente do gerador', () => {
    const { violations } = runGates([{ ...letras(), stem: 'A, Q, C, B, ?' }])
    expect(violations.map((v) => v.message).join(' | ')).toMatch(/leitor de séries de letras/)
  })
})

describe('G2 — comparação e alternativas com o mesmo valor', () => {
  const FONTE = { name: 'Criteria Corp', url: 'https://www.criteriacorp.com/candidates/ccat-prep' }
  const amostra = (textos: string[], answerId: string, expression: string): Question => ({
    ...boa('porcentagem', 11, 1),
    id: 'importado.menor-decimal',
    subtipo: 'calculo_basico',
    stem: 'Which of the following is the smallest?',
    options: textos.map((text, i) => ({ id: 'abcde'[i]!, text })),
    answerId,
    origin: 'official-sample',
    source: FONTE,
    verification: { method: 'solver', expression },
  })
  const DECIMAIS = ['0.07', '0.009', '0.0081', '0.0077', '0.00779']
  const MIN = `min(${DECIMAIS.join(',')})`

  it('aprova o exemplo da prova real: 0.0077 é o menor', () => {
    expect(gatesDisparados(amostra(DECIMAIS, 'd', MIN))).toEqual([])
  })

  it('barra 0.00779 marcado como menor — a tolerância fixa de 0.005 deixava passar', () => {
    expect(gatesDisparados(amostra(DECIMAIS, 'e', MIN))).toContain('G2_gabarito')
  })

  it('barra expressão de comparação cujos candidatos não são as alternativas', () => {
    expect(gatesDisparados(amostra(DECIMAIS, 'd', 'min(0.0077,0.5)'))).toContain('G2_gabarito')
  })

  it('barra duas alternativas com o mesmo valor escritas de jeitos diferentes', () => {
    const q = amostra(['1/2', '0.5', '3', '4', '5'], 'b', '1/2')
    const { violations } = runGates([q])
    expect(violations.map((v) => v.message).join(' | ')).toMatch(/2 alternativas valem/)
  })

  it('aprova as questões de comparação geradas', () => {
    let vistas = 0
    for (let seed = 1; seed <= 40; seed++) {
      for (const d of [1, 3] as const) {
        const q = boa('calculo_basico', seed, d)
        if (!/^(min|max|nearest)\(/.test(q.verification.expression ?? '')) continue
        vistas++
        expect(gatesDisparados(q), `${seed}/${d}`).toEqual([])
      }
    }
    expect(vistas).toBeGreaterThan(10)
  })

  it('dedup: mesmo enunciado com outras alternativas é outra questão; a mesma lista embaralhada, não', () => {
    const a = amostra(DECIMAIS, 'd', MIN)
    const b = amostra(['0.06', '0.008', '0.0072', '0.0065', '0.00658'], 'd', 'min(0.06,0.008,0.0072,0.0065,0.00658)')
    expect(dedupSignature(a)).not.toBe(dedupSignature(b))

    const invertida = [...a.options].reverse().map((o, i) => ({ ...o, id: 'abcde'[i]! }))
    const embaralhada = { ...a, options: invertida, answerId: invertida.find((o) => o.text === '0.0077')!.id }
    expect(dedupSignature(embaralhada)).toBe(dedupSignature(a))
  })
})

describe('questões de fora (importadas e amostras oficiais)', () => {
  const FONTE = { name: 'Criteria Corp', url: 'https://www.criteriacorp.com/candidates/ccat-prep' }

  function importadaMat(expression: string): Question {
    return {
      ...boa('porcentagem', 11, 1),
      id: 'importado.teste-media',
      stem: 'A group of 3 numbers has an average of 17. The first two are 12 and 19. What is the third?',
      options: ['17', '19', '20', '23', '30'].map((text, i) => ({ id: 'abcde'[i]!, text })),
      answerId: 'c',
      origin: 'official-sample',
      source: FONTE,
      verification: { method: 'solver', expression },
    }
  }

  it('matemática importada é provada só pela expressão, sem gerador', () => {
    expect(gatesDisparados(importadaMat('17*3-12-19'))).toEqual([])
  })

  it('e continua reprovada quando a expressão não bate com o gabarito', () => {
    expect(gatesDisparados(importadaMat('17*3-12'))).toContain('G2_gabarito')
  })

  it('exige a fonte de toda questão de fora', () => {
    const { source: _, ...semFonte } = importadaMat('17*3-12-19')
    expect(gatesDisparados(semFonte)).toContain('G1_schema')
  })

  it('segundo modelo vale para espacial importada, nunca para a gerada', () => {
    const gerada = boa('rotacao.arcos', 3)
    const porModelo = {
      ...gerada,
      verification: { method: 'second-model', model: 'm', modelAnswerId: gerada.answerId },
    }
    expect(gatesDisparados(porModelo)).toContain('G2_gabarito')
    expect(gatesDisparados({ ...porModelo, id: 'importado.x', origin: 'imported', source: FONTE })).not.toContain(
      'G2_gabarito',
    )
  })
})
