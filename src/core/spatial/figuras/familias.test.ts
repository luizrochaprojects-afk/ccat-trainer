import { describe, expect, it } from 'vitest'
import type { SpatialSpec } from '../../schema'
import { mulberry32 } from '../../rng'
import type { Difficulty } from '../../taxonomy'
import {
  configuracoesUtilizaveis,
  ehQuiral,
  ehUtilizavel,
  FAMILIAS,
  semSimetriaRotacional,
  sortearUtilizavel,
  type FamiliaQualquer,
} from './index'

/**
 * Estes testes substituem a antiga auditoria de legibilidade em pixels
 * (distância de Hausdorff, área de fecho convexo). Aquela era amostral e
 * aproximada porque o primitivo era contínuo; estas famílias são discretas e
 * pequenas, então dá para provar as mesmas garantias por enumeração.
 */

const NIVEIS: Difficulty[] = [1, 2, 3, 4, 5]

function specDe(fam: FamiliaQualquer, f: unknown): string {
  return JSON.stringify(normalizar(fam.toSpec(f)))
}

/**
 * Normaliza o spec para que specs iguais signifiquem DESENHOS iguais.
 *
 * Comparar o JSON cru não bastava, e o furo foi real: um arco de A para B e o
 * mesmo arco de B para A com o sweep invertido são a MESMA curva na tela, com
 * JSON diferente. O teste aprovava, e a questão saía com duas alternativas
 * visualmente idênticas. Aqui cada segmento é reescrito na ordem canônica.
 */
function normalizar(spec: SpatialSpec): SpatialSpec {
  return {
    ...spec,
    shapes: spec.shapes.map((s) => (s.kind === 'path' && s.d ? { ...s, d: caminhoCanonico(s.d) } : s)),
  }
}

function caminhoCanonico(d: string): string {
  const arco = d.match(
    /^M (-?[\d.]+) (-?[\d.]+) A ([\d.]+) ([\d.]+) ([\d.]+) ([01]) ([01]) (-?[\d.]+) (-?[\d.]+)$/,
  )
  if (arco) {
    const [, x1, y1, rx, ry, rot, laf, sf, x2, y2] = arco as unknown as string[]
    const inverter = `${x1},${y1}` > `${x2},${y2}`
    // Percorrer o arco ao contrário desenha a mesma curva se o sweep inverter.
    return inverter
      ? `M ${x2} ${y2} A ${rx} ${ry} ${rot} ${laf} ${sf === '1' ? 0 : 1} ${x1} ${y1}`
      : d
  }

  const reta = d.match(/^M (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)$/)
  if (reta) {
    const [, x1, y1, x2, y2] = reta as unknown as string[]
    return `${x1},${y1}` > `${x2},${y2}` ? `M ${x2} ${y2} L ${x1} ${y1}` : d
  }

  return d
}

/**
 * Coordenadas de um spec, ignorando cor e espessura.
 *
 * Varrer o JSON inteiro com um regex de número não serve: `#111111` vira o
 * número cento e onze mil, e o teste de enquadramento reprova toda figura.
 */
function coordenadas(spec: SpatialSpec): number[] {
  const nums: number[] = []
  for (const shape of spec.shapes) {
    for (const [campo, valor] of Object.entries(shape)) {
      if (campo === 'strokeWidth' || campo === 'rotate') continue
      if (typeof valor === 'number') nums.push(valor)
      else if (Array.isArray(valor)) nums.push(...valor.filter((v): v is number => typeof v === 'number'))
      else if (campo === 'd' && typeof valor === 'string') {
        for (const m of valor.match(/-?\d+(\.\d+)?/g) ?? []) nums.push(Number(m))
      }
    }
  }
  return nums
}

describe.each(Object.entries(FAMILIAS))('família "%s"', (_id, fam) => {
  const todas = fam.todasAsConfiguracoes()
  const utilizaveis = configuracoesUtilizaveis(fam)

  it('tem configurações utilizáveis', () => {
    expect(todas.length).toBeGreaterThan(0)
    expect(utilizaveis.length).toBeGreaterThan(0)
  })

  it('girar o ciclo inteiro volta à figura original', () => {
    for (const f of todas) {
      expect(fam.assinatura(fam.rotate(f, fam.passosNoCiclo))).toBe(fam.assinatura(f))
    }
  })

  it('girar é aditivo: um passo depois do outro é o mesmo que os dois de uma vez', () => {
    for (const f of todas) {
      for (let k = 0; k < fam.passosNoCiclo; k++) {
        expect(fam.assinatura(fam.rotate(fam.rotate(f, 1), k))).toBe(
          fam.assinatura(fam.rotate(f, k + 1)),
        )
      }
    }
  })

  it('girar aceita passos negativos', () => {
    for (const f of todas.slice(0, 40)) {
      expect(fam.assinatura(fam.rotate(f, -1))).toBe(
        fam.assinatura(fam.rotate(f, fam.passosNoCiclo - 1)),
      )
    }
  })

  it('espelhar duas vezes é a identidade', () => {
    for (const f of todas) {
      expect(fam.assinatura(fam.reflect(fam.reflect(f)))).toBe(fam.assinatura(f))
    }
  })

  it('assinaturas iguais produzem desenhos iguais', () => {
    const porAssinatura = new Map<string, string>()
    for (const f of todas) {
      const chave = fam.assinatura(f)
      const spec = specDe(fam, f)
      const visto = porAssinatura.get(chave)
      if (visto === undefined) porAssinatura.set(chave, spec)
      else expect(spec).toBe(visto)
    }
  })

  /**
   * A garantia central, e a que o primitivo antigo não dava: se duas
   * configurações utilizáveis têm assinaturas diferentes, o candidato vê dois
   * desenhos diferentes. É daqui que sai a legibilidade das alternativas.
   *
   * Vale sobre as UTILIZÁVEIS, não sobre o espaço inteiro: um quadrado girado
   * 90° é o mesmo desenho com outra assinatura, e é exatamente por isso que
   * `semSimetriaRotacional` o rejeita antes de virar questão.
   */
  it('assinaturas diferentes produzem desenhos diferentes (entre as utilizáveis)', () => {
    const porSpec = new Map<string, string>()
    for (const f of utilizaveis) {
      const spec = specDe(fam, f)
      const chave = fam.assinatura(f)
      const colisao = porSpec.get(spec)
      expect(colisao === undefined || colisao === chave).toBe(true)
      porSpec.set(spec, chave)
    }
  })

  it('toda configuração utilizável é assimétrica sob rotação', () => {
    for (const f of utilizaveis) {
      expect(semSimetriaRotacional(fam, f)).toBe(true)
    }
  })

  it('quiralidade bate com o que a família declara', () => {
    const quantasQuirais = todas.filter((f) => ehQuiral(fam, f)).length
    if (fam.suportaReflexao) {
      expect(quantasQuirais).toBeGreaterThan(0)
      for (const f of utilizaveis) expect(ehQuiral(fam, f)).toBe(true)
    } else {
      // Aquiral por construção: espelhar sempre cai em alguma rotação, e por
      // isso a família nunca alimenta questões de reflexão.
      expect(quantasQuirais).toBe(0)
    }
  })

  it('sorteia figuras utilizáveis em todo nível', () => {
    for (const nivel of NIVEIS) {
      for (let s = 0; s < 30; s++) {
        const f = sortearUtilizavel(fam, mulberry32(s * 31 + nivel), nivel)
        expect(ehUtilizavel(fam, f)).toBe(true)
      }
    }
  })

  it('sortear é determinístico pela seed', () => {
    for (const nivel of NIVEIS) {
      const a = sortearUtilizavel(fam, mulberry32(7), nivel)
      const b = sortearUtilizavel(fam, mulberry32(7), nivel)
      expect(fam.assinatura(a)).toBe(fam.assinatura(b))
    }
  })

  it('variar produz uma figura diferente, sempre', () => {
    for (let s = 0; s < 120; s++) {
      const rng = mulberry32(s + 1)
      const f = sortearUtilizavel(fam, rng, ((s % 5) + 1) as Difficulty)
      const v = fam.variar(f, rng)
      expect(fam.assinatura(v)).not.toBe(fam.assinatura(f))
      expect(specDe(fam, v)).not.toBe(specDe(fam, f))
    }
  })

  it('desenha dentro do quadro, sem coordenada negativa', () => {
    for (const f of utilizaveis.slice(0, 200)) {
      const spec = fam.toSpec(f)
      const limite = Math.max(spec.width, spec.height) + 1
      for (const coord of coordenadas(spec)) {
        expect(coord).toBeGreaterThanOrEqual(-1)
        expect(coord).toBeLessThanOrEqual(limite)
      }
    }
  })
  it('o eixo secundário fecha o próprio ciclo', () => {
    for (const f of todas) {
      expect(fam.assinatura(fam.avancarSecundario(f, fam.passosSecundarios))).toBe(
        fam.assinatura(f),
      )
      expect(fam.assinatura(fam.avancarSecundario(f, 0))).toBe(fam.assinatura(f))
    }
  })

  /**
   * A propriedade que sustenta a matriz 3×3 de duas regras: se avançar o
   * atributo e girar não comutassem, a célula que falta teria uma resposta
   * lendo por linha e outra lendo por coluna — e as duas leituras são
   * legítimas para quem está fazendo a prova.
   */
  it('o eixo secundário comuta com a rotação', () => {
    for (const f of todas) {
      for (let k = 0; k < fam.passosNoCiclo; k++) {
        for (let a = 0; a < fam.passosSecundarios; a++) {
          expect(fam.assinatura(fam.avancarSecundario(fam.rotate(f, k), a))).toBe(
            fam.assinatura(fam.rotate(fam.avancarSecundario(f, a), k)),
          )
        }
      }
    }
  })

  it('o eixo secundário preserva a utilizabilidade', () => {
    for (const f of utilizaveis) {
      for (let a = 0; a < fam.passosSecundarios; a++) {
        expect(ehUtilizavel(fam, fam.avancarSecundario(f, a))).toBe(true)
      }
    }
  })

  it('o eixo secundário muda mesmo o desenho', () => {
    const mudou = utilizaveis.filter(
      (f) => specDe(fam, fam.avancarSecundario(f, 1)) !== specDe(fam, f),
    )
    // Nem toda figura precisa mudar (um 'composta' só com regiões vazias não
    // tem atributo para avançar), mas a grande maioria sim — senão o eixo não
    // serve como segunda regra de uma matriz.
    expect(mudou.length).toBeGreaterThan(utilizaveis.length * 0.8)
  })
})

describe('normalização de caminho', () => {
  /**
   * Regressão do defeito que passou batido: a meia-lua que existia em
   * `aninhadas` desenhava a MESMA curva com dois JSONs diferentes, e a questão
   * "qual não pertence" saía com duas alternativas idênticas. Se a
   * normalização parar de reconhecer este caso, o teste de desenhos distintos
   * volta a ser decorativo.
   */
  it('reconhece o mesmo arco percorrido ao contrário', () => {
    const ida = 'M 50 30 A 23 23 0 0 0 50 70'
    const volta = 'M 50 70 A 23 23 0 0 1 50 30'
    expect(caminhoCanonico(volta)).toBe(caminhoCanonico(ida))
  })

  it('não confunde arcos que abrem para lados diferentes', () => {
    expect(caminhoCanonico('M 50 30 A 23 23 0 0 0 50 70')).not.toBe(
      caminhoCanonico('M 50 30 A 23 23 0 0 1 50 70'),
    )
  })

  it('reconhece a mesma reta nos dois sentidos', () => {
    expect(caminhoCanonico('M 70 50 L 30 50')).toBe(caminhoCanonico('M 30 50 L 70 50'))
  })
})
