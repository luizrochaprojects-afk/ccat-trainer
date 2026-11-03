import type { LocalizedText } from '../i18n'
import { optionIdAt, type OptionId } from '../optionIds'
import type { Rng } from '../rng'
import { arredondarSig, formatarLocalizado, ordemDeGrandeza, type Unidade } from './formato'
import type { QmOpcao } from './questao'
import { FOLGA_ESTIMATIVA, FOLGA_EXATA } from './taxonomia'

/**
 * As cinco alternativas de uma questão de Quick Math.
 *
 * O treino só treina se não der para acertar sem fazer a conta. Daí as regras
 * que esta função garante e os testes de propriedade cobram:
 *
 *  - folga: nenhum distrator a menos de 10% da resposta (15% em estimativa),
 *    nem dos outros. Entrevista de case cobra ordem de grandeza e os primeiros
 *    dígitos, não o terceiro algarismo;
 *  - ordem de grandeza: pelo menos dois distratores com o mesmo `floor(log10)`
 *    da resposta — e, portanto, a mesma palavra de escala. Sem isso "R$ 980 mi"
 *    ao lado de "R$ 1,4 bi" se elimina contando zeros;
 *  - unicidade: os cinco textos são distintos nos dois idiomas;
 *  - plausibilidade: nada fora da faixa que o gerador declara possível (uma
 *    margem média fora das margens, um valor final abaixo do inicial) e, se a
 *    resposta é inteira, nenhum distrator decimal;
 *  - o erro real mais plausível entra sempre, em qualquer ordem de grandeza:
 *    "esqueceu o × 12" é o que muitas questões existem para pegar;
 *  - o erro de zero (×10, ÷10, mil ↔ milhão, sinal) nunca vem sozinho: quando a
 *    resposta ganha um gêmeo com os mesmos dígitos, um distrator da mesma ordem
 *    ganha o seu. Senão a certa seria a que repete dígitos com outra.
 *
 * E a regra que os testes medem com atalhos de quem chuta (o meio, as pontas,
 * o meio entre as de mesma ordem, as inteiras, os dígitos repetidos): o padrão
 * das alternativas não aponta a certa. Montar passo a passo não basta, porque
 * os erros reais e os gêmeos caem sempre do mesmo lado. Por isso a posição da
 * certa é SORTEADA — entre as cinco e entre as de sua ordem de grandeza — e a
 * função procura um conjunto de distratores que a coloque ali.
 *
 * Os candidatos vêm do gerador em ordem de plausibilidade. Um candidato com
 * `fator` é um gêmeo da resposta (`valor = correta × fator`).
 */

export interface Candidato {
  valor: number
  erro: LocalizedText
  /** gêmeo da resposta: `valor = correta × fator` */
  fator?: number
}

export interface Restricoes {
  /** faixa do que é possível; alternativas fora dela se eliminam por bom senso */
  faixa?: readonly [number, number]
  /** resposta inteira: distratores também inteiros */
  inteiro?: boolean
}

const FATORES_PERTURBACAO = [0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.7, 2, 2.5] as const

const ERRO_CONTA: LocalizedText = {
  pt: 'Errou a conta no meio do caminho.',
  en: 'Slipped on the arithmetic along the way.',
}

const DISTRATORES = 4
const CHANCE_REAL_EXTRA = 0.5
const CHANCE_GEMEOS = 0.6
/** tentativas por fase: as duas posições, só a geral, nenhuma */
const TENTATIVAS = [80, 80, 40] as const

interface Item {
  valor: number
  erro: LocalizedText
  texto: LocalizedText
}

export function montarAlternativas(
  rng: Rng,
  correta: number,
  candidatos: Candidato[],
  unidade: Unidade,
  estimativa: boolean,
  restricoes: Restricoes = {},
): { opcoes: QmOpcao[]; answerId: OptionId } | null {
  const { faixa, inteiro } = restricoes
  const folga = estimativa ? FOLGA_ESTIMATIVA : FOLGA_EXATA
  const exibir = (v: number) => {
    const x = estimativa ? arredondarSig(v, 2) : v
    return inteiro ? Math.round(x) : x
  }
  const certa = estimativa ? arredondarSig(correta, 2) : correta
  if (!Number.isFinite(certa) || certa === 0) return null

  const textoCerto = formatarLocalizado(certa, unidade)
  const ordem = ordemDeGrandeza(certa)
  const mesmaOrdem = (v: number) => ordemDeGrandeza(v) === ordem

  /** O item vale sozinho: plausível, longe da certa e com texto próprio. */
  const item = (valor: number, erro: LocalizedText): Item | null => {
    if (!Number.isFinite(valor)) return null
    if (unidade !== 'percent' && valor <= 0) return null
    if (faixa && (valor < faixa[0] || valor > faixa[1])) return null
    if (distancia(valor, certa) < folga) return null
    const texto = formatarLocalizado(valor, unidade)
    if (texto.pt === textoCerto.pt || texto.en === textoCerto.en) return null
    return { valor, erro, texto }
  }
  const compativeis = (a: Item, b: Item) =>
    distancia(a.valor, b.valor) >= folga && a.texto.pt !== b.texto.pt && a.texto.en !== b.texto.en

  const reais = candidatos
    .filter((c) => c.fator === undefined)
    .map((c) => item(exibir(c.valor), c.erro))
    .filter((i): i is Item => i !== null)
  const gemeos = candidatos.filter((c) => c.fator !== undefined)
  const perturbacoes = FATORES_PERTURBACAO.map((f) => item(exibir(arredondarSig(certa * f, 2)), ERRO_CONTA)).filter(
    (i): i is Item => i !== null,
  )
  const principal = reais[0]

  // Posição sorteada da certa: quantos distratores abaixo dela, entre todos e
  // entre os de sua ordem (como fração do grupo, que só se conhece no fim).
  const alvoAbaixo = rng.int(0, DISTRATORES)
  const alvoNaOrdem = rng.next()

  const tentar = (exigirOrdem: boolean, exigirPosicao: boolean): Item[] | null => {
    const escolhidos: Item[] = []
    const por = (i: Item | null | undefined) => {
      if (!i || escolhidos.length >= DISTRATORES || !escolhidos.every((e) => compativeis(e, i))) return false
      escolhidos.push(i)
      return true
    }
    if (principal) por(principal)
    for (const r of rng.shuffle(reais.slice(1))) if (rng.next() < CHANCE_REAL_EXTRA) por(r)

    if (gemeos.length > 0 && rng.next() < CHANCE_GEMEOS) {
      const g = rng.pick(gemeos)
      const gemeo = item(exibir(certa * g.fator!), g.erro)
      // o par: um distrator da mesma ordem e o gêmeo dele
      const bases = rng.shuffle([...escolhidos, ...perturbacoes].filter((b) => mesmaOrdem(b.valor)))
      for (const base of bases) {
        const par = item(exibir(base.valor * g.fator!), g.erro)
        if (!gemeo || !par || !compativeis(gemeo, par)) continue
        const jaTem = escolhidos.includes(base)
        if (escolhidos.length + (jaTem ? 2 : 3) > DISTRATORES) continue
        const antes = escolhidos.length
        if ((jaTem || por(base)) && por(gemeo) && por(par)) break
        escolhidos.length = antes
      }
    }

    // As perturbações completam o lado que falta para a posição sorteada.
    const faltamAbaixo = alvoAbaixo - escolhidos.filter((e) => e.valor < certa).length
    if (exigirPosicao && (faltamAbaixo < 0 || faltamAbaixo > DISTRATORES - escolhidos.length)) return null
    const embaralhadas = rng.shuffle(perturbacoes)
    if (exigirPosicao) {
      const vagasAbaixo = escolhidos.length + faltamAbaixo
      for (const p of embaralhadas) if (p.valor < certa && escolhidos.length < vagasAbaixo) por(p)
      for (const p of embaralhadas) if (p.valor > certa) por(p)
    } else {
      for (const p of embaralhadas) por(p)
    }
    if (escolhidos.length < DISTRATORES) return null

    const naOrdem = escolhidos.filter((e) => mesmaOrdem(e.valor))
    if (naOrdem.length < 2) return null
    if (exigirPosicao && escolhidos.filter((e) => e.valor < certa).length !== alvoAbaixo) return null
    if (exigirOrdem) {
      const posicao = Math.floor(alvoNaOrdem * (naOrdem.length + 1))
      if (naOrdem.filter((e) => e.valor < certa).length !== posicao) return null
    }
    return escolhidos
  }

  // Relaxa aos poucos: primeiro as duas posições, depois só a geral, depois nenhuma.
  const fases = [
    [true, true, TENTATIVAS[0]],
    [false, true, TENTATIVAS[1]],
    [false, false, TENTATIVAS[2]],
  ] as const
  let escolhidos: Item[] | null = null
  for (const [ordem, posicao, vezes] of fases) {
    for (let i = 0; i < vezes && !escolhidos; i++) escolhidos = tentar(ordem, posicao)
  }
  if (!escolhidos) return null

  const todas = rng.shuffle([
    { valor: certa, texto: textoCerto, erro: undefined as LocalizedText | undefined, certa: true },
    ...escolhidos.map((a) => ({ ...a, certa: false })),
  ])
  const opcoes: QmOpcao[] = todas.map((o, j) => ({
    id: optionIdAt(j),
    valor: o.valor,
    texto: o.texto,
    ...(o.erro ? { erro: o.erro } : {}),
  }))
  const answerId = optionIdAt(todas.findIndex((o) => o.certa))
  return { opcoes, answerId }
}

function distancia(a: number, referencia: number): number {
  return Math.abs(a - referencia) / Math.abs(referencia)
}
