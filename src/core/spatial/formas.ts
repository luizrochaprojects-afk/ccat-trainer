import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import type { Rng } from '../rng'
import type { SpatialSpec } from '../schema'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import {
  type Familia,
  type FamiliaQualquer,
  sortearUtilizavel,
} from './figuras/index'
import { matrizParaSpec, sequenciaParaSpec } from './layout'
import { classeDeRotacao, classeDoEspelho, pistaSemEnunciado } from './pistas'

/**
 * As formas de pergunta do raciocínio espacial.
 *
 * A separação que organiza o módulo: a FAMÍLIA (em `figuras/`) decide como a
 * figura é desenhada; a FORMA, aqui, decide o que se pergunta sobre ela. Toda
 * forma é genérica sobre `Familia<F>` e não sabe se está olhando arcos num
 * quadrado ou ponteiros num mostrador.
 *
 * É o que produz variedade de verdade: seis formas × cinco vocabulários, em vez
 * das cinco perguntas sobre o mesmo desenho que existiam antes.
 */

export interface QuestaoEspacial {
  subtipo: string
  familia: string
  /** sempre em inglês: a CCAT é aplicada em inglês */
  stem: string
  stemSpatial?: SpatialSpec
  options: { id: string; spatial: SpatialSpec }[]
  answerId: string
  explanation: LocalizedText
  /** assinatura da figura de cada alternativa, na ordem exibida */
  assinaturasDasOpcoes: string[]
  /**
   * Toda assinatura que satisfaz a regra da questão.
   *
   * O gate exige que EXATAMENTE UMA alternativa esteja neste conjunto. Repare
   * que é um conjunto, não um valor: em "qual é a figura girada?" qualquer
   * rotação serviria como resposta — a questão só é válida porque apenas uma
   * delas foi colocada entre as alternativas.
   */
  assinaturasCorretas: string[]
  /** classe de rotação de cada alternativa, na ordem exibida (ver `pistas.ts`) */
  classesDasOpcoes: string[]
  /** classe de rotação do ESPELHO de cada alternativa, na ordem exibida */
  classesDoEspelhoDasOpcoes: string[]
}

export type FormaDePergunta = <F>(
  fam: Familia<F>,
  rng: Rng,
  nivel: Difficulty,
) => QuestaoEspacial

// --- Utilidades --------------------------------------------------------------

/** Todas as rotações distintas de uma figura. */
function rotacoes<F>(fam: Familia<F>, f: F): F[] {
  return Array.from({ length: fam.passosNoCiclo }, (_, k) => fam.rotate(f, k))
}

function assinaturasDe<F>(fam: Familia<F>, fs: F[]): string[] {
  return fs.map((f) => fam.assinatura(f))
}

/**
 * Todo o espaço alcançável a partir de uma figura: cada rotação combinada com
 * cada passo do eixo de atributo, mais o reflexo.
 *
 * Serve de reserva para quando os distratores "erro típico" colapsam entre si.
 * Isso acontece de verdade: em `atributos`, que é aquiral, o reflexo e mais de
 * uma rotação são a MESMA figura, e a lista escrita à mão rendia três
 * alternativas onde a questão precisava de cinco.
 */
function poolDeDistratores<F>(fam: Familia<F>, base: F): F[] {
  const pool: F[] = []
  for (let k = 0; k < fam.passosNoCiclo; k++) {
    for (let a = 0; a < fam.passosSecundarios; a++) {
      pool.push(fam.avancarSecundario(fam.rotate(base, k), a))
      pool.push(fam.avancarSecundario(fam.rotate(fam.reflect(base), k), a))
    }
  }
  return pool
}

function ehRotacaoDe<F>(fam: Familia<F>, a: F, b: F): boolean {
  const alvo = fam.assinatura(a)
  return rotacoes(fam, b).some((r) => fam.assinatura(r) === alvo)
}

/**
 * Monta as alternativas: embaralha a correta entre os distratores, descartando
 * qualquer candidato que repita uma assinatura já escolhida.
 *
 * Deduplicar por assinatura em vez de por identidade é o que impede duas
 * alternativas com o mesmo desenho — o defeito que tornava algumas questões
 * antigas irrespondíveis.
 */
function montar<F>(
  fam: Familia<F>,
  rng: Rng,
  correta: F,
  candidatos: F[],
  assinaturasCorretas: string[],
  quantas: number,
): Pick<
  QuestaoEspacial,
  | 'options'
  | 'answerId'
  | 'assinaturasDasOpcoes'
  | 'assinaturasCorretas'
  | 'classesDasOpcoes'
  | 'classesDoEspelhoDasOpcoes'
> {
  const corretas = new Set(assinaturasCorretas)
  if (!corretas.has(fam.assinatura(correta))) {
    throw new Error('forma inconsistente: a resposta não satisfaz a própria regra')
  }

  const escolhidos: F[] = [correta]
  const vistas = new Set([fam.assinatura(correta)])

  for (const c of candidatos) {
    if (escolhidos.length >= quantas) break
    const k = fam.assinatura(c)
    // Um distrator que satisfaz a regra daria uma segunda resposta certa.
    if (vistas.has(k) || corretas.has(k)) continue
    vistas.add(k)
    escolhidos.push(c)
  }

  if (escolhidos.length < quantas) {
    throw new Error(
      `família "${fam.id}": só consegui ${escolhidos.length} alternativas de ${quantas}`,
    )
  }

  const embaralhadas = rng.shuffle(escolhidos.map((f, i) => ({ f, correta: i === 0 })))

  return {
    options: embaralhadas.map((o, i) => ({
      id: optionIdAt(i) as string,
      spatial: fam.toSpec(o.f),
    })),
    answerId: optionIdAt(embaralhadas.findIndex((o) => o.correta)) as string,
    assinaturasDasOpcoes: embaralhadas.map((o) => fam.assinatura(o.f)),
    assinaturasCorretas,
    classesDasOpcoes: embaralhadas.map((o) => classeDeRotacao(fam, o.f)),
    classesDoEspelhoDasOpcoes: embaralhadas.map((o) => classeDoEspelho(fam, o.f)),
  }
}

// --- As formas ---------------------------------------------------------------

/**
 * Quantas vezes uma forma re-sorteia antes de desistir. As guardas abaixo
 * rejeitam poucas tentativas; o limite existe só para um erro de família
 * virar exceção em vez de laço infinito.
 */
const TENTATIVAS = 300

/** A alternativa correta é identificável sem olhar o enunciado? */
function vazaSemEnunciado(
  q: Pick<QuestaoEspacial, 'options' | 'answerId' | 'classesDasOpcoes' | 'classesDoEspelhoDasOpcoes'>,
): boolean {
  const idx = q.options.findIndex((o) => o.id === q.answerId)
  return pistaSemEnunciado(q.classesDasOpcoes, q.classesDoEspelhoDasOpcoes, idx) !== null
}

/**
 * Distratores de rotação e reflexão, montados em PARES ESPELHADOS.
 *
 * `certa` é a figura cujas rotações respondem à pergunta — a própria figura em
 * "qual está girada?", o espelho em "qual é o reflexo?" —, e `par` é o espelho
 * dela, o erro clássico. A versão anterior usava só o par, em várias rotações:
 * quatro alternativas eram um desenho só e a quinta, a resposta, era a única
 * diferente. Dava para acertar sem olhar o enunciado, e 60 de 60 questões
 * aprovadas se resolviam assim.
 *
 * Agora: a resposta e o espelho dela; uma variante sutil da figura certa e o
 * espelho DESSA variante. Sem o enunciado os dois pares são indistinguíveis —
 * toda alternativa tem exatamente um espelho entre as demais —, e só comparar
 * com a figura de cima decide. Com cinco alternativas entra uma segunda
 * variante, sorteada ora da figura certa, ora do par, para que nem "a mais
 * parecida com as outras" aponte sempre a resposta.
 *
 * Devolve `null` quando duas alternativas caem na mesma classe de rotação —
 * uma variante aquiral, por exemplo, é o próprio espelho —, e quem chama
 * sorteia de novo.
 */
function distratoresEmPares<F>(
  fam: Familia<F>,
  rng: Rng,
  nivel: Difficulty,
  certa: F,
  par: F,
  quantas: number,
): F[] | null {
  const girar = (f: F): F => fam.rotate(f, rng.int(0, fam.passosNoCiclo - 1))
  // Nos níveis fáceis a variante acumula duas alterações: continua errada pelo
  // mesmo motivo, mas se denuncia mais depressa na comparação com o modelo.
  const variante = (f: F): F => (nivel <= 2 ? fam.variar(fam.variar(f, rng), rng) : fam.variar(f, rng))

  const v = variante(certa)
  // O par nunca aparece na orientação exata do enunciado: em "qual é o
  // reflexo?" isso poria uma cópia da figura de cima entre as alternativas.
  const distratores = [fam.rotate(par, rng.int(1, fam.passosNoCiclo - 1)), girar(v), girar(fam.reflect(v))]
  if (quantas > 4) distratores.push(girar(variante(rng.pick([certa, par]))))

  const classes = new Set([classeDeRotacao(fam, certa)])
  for (const d of distratores) {
    const c = classeDeRotacao(fam, d)
    if (classes.has(c)) return null
    classes.add(c)
  }
  return distratores
}

/**
 * "Qual opção mostra a figura acima GIRADA?"
 *
 * Os distratores vêm em pares espelhados (ver `distratoresEmPares`): o reflexo
 * da figura, uma variante com um detalhe trocado e o reflexo dela. É o par
 * rotação-versus-reflexo, o teste espacial clássico, e só funciona em família
 * quiral — daí a tabela de compatibilidade no fim do arquivo.
 */
export function rotacao<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const quantas = OPCOES_POR_QUESTAO

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const f = sortearUtilizavel(fam, rng, nivel)
    const correta = fam.rotate(f, rng.int(1, fam.passosNoCiclo - 1))
    const distratores = distratoresEmPares(fam, rng, nivel, f, fam.reflect(f), quantas)
    if (!distratores) continue

    const montada = montar(fam, rng, correta, distratores, assinaturasDe(fam, rotacoes(fam, f)), quantas)
    // Guarda final: nenhuma heurística que ignora o enunciado pode achar a
    // resposta. Com os pares acima ela nunca dispara; fica como rede.
    if (vazaSemEnunciado(montada)) continue

    return {
      subtipo: 'rotacao',
      familia: fam.id,
      stem: 'Which option shows the figure above rotated — not mirrored?',
      stemSpatial: fam.toSpec(f),
      explanation: {
        en: 'Only one option is the figure itself, just turned. The others are traps: its mirror image (flipping swaps left and right in a way no rotation can undo) and versions with one detail changed, some of them mirrored too. Turn the model in your head and check it detail by detail.',
        pt: 'Só uma alternativa é a própria figura, apenas girada. As outras são armadilhas: o reflexo dela (espelhar troca esquerda e direita de um jeito que nenhuma rotação desfaz) e versões com um detalhe alterado, algumas também espelhadas. Gire o modelo mentalmente e confira detalhe por detalhe.',
      },
      ...montada,
    }
  }
  throw new Error(`família "${fam.id}": não consegui montar uma questão de rotação`)
}

/** "Qual opção é o REFLEXO da figura acima?" — o espelho do caso anterior. */
export function reflexao<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const quantas = OPCOES_POR_QUESTAO

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const f = sortearUtilizavel(fam, rng, nivel)
    const espelho = fam.reflect(f)
    // Nos níveis baixos o reflexo aparece pouco girado: a questão é reconhecer
    // o espelho, não acumular uma rotação grande por cima dele. Nos altos,
    // qualquer rotação — e a resposta deixa de ser "a que está de pé".
    const giro = nivel <= 3 ? rng.pick([0, 1]) : rng.int(0, fam.passosNoCiclo - 1)
    const correta = fam.rotate(espelho, giro)
    const distratores = distratoresEmPares(fam, rng, nivel, espelho, f, quantas)
    if (!distratores) continue

    const montada = montar(fam, rng, correta, distratores, assinaturasDe(fam, rotacoes(fam, espelho)), quantas)
    if (vazaSemEnunciado(montada)) continue

    return {
      subtipo: 'reflexao',
      familia: fam.id,
      stem: 'Which option is the mirror image of the figure above?',
      stemSpatial: fam.toSpec(f),
      explanation: {
        en: 'Mirroring swaps left and right, and turning the mirror image afterwards does not undo that. Among the options are the original simply turned and versions with one detail changed, mirrored or not. Only one matches the model flipped, detail by detail.',
        pt: 'Espelhar troca esquerda e direita, e girar o reflexo depois não desfaz isso. Entre as alternativas estão a figura original apenas girada e versões com um detalhe alterado, espelhadas ou não. Só uma coincide com o modelo espelhado, detalhe por detalhe.',
      },
      ...montada,
    }
  }
  throw new Error(`família "${fam.id}": não consegui montar uma questão de reflexão`)
}

type TipoDeIntrusa = 'espelho' | 'variante'

/**
 * "Qual não pertence?" — todas são a mesma figura girada, menos uma.
 *
 * A intrusa é o reflexo nos níveis 1 e 2 e, a partir do 3, ora o reflexo, ora
 * uma variante com um detalhe trocado: quem aprendeu a caçar "a espelhada"
 * precisa voltar a comparar elemento por elemento. No mostrador, que tem oito
 * posições, as rotações passam a usar os passos de 45° a partir do nível 3.
 */
export function oddOneOut<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const quantas = OPCOES_POR_QUESTAO
  const tipo: TipoDeIntrusa = !fam.suportaReflexao
    ? 'variante'
    : nivel <= 2
      ? 'espelho'
      : rng.pick(['espelho', 'variante'] as TipoDeIntrusa[])
  const intrusa = fam.rotate(
    tipo === 'espelho' ? fam.reflect(f) : varianteQueNaoGira(fam, rng, f),
    rng.int(0, fam.passosNoCiclo - 1),
  )
  const iguais = escolherRotacoes(fam, rng, nivel, quantas - 1).map((k) => fam.rotate(f, k))

  return {
    subtipo: 'odd_one_out',
    familia: fam.id,
    stem: 'All but one of these are the same figure rotated. Which one is different?',
    stemSpatial: undefined,
    explanation:
      tipo === 'espelho'
        ? {
            en: 'Every other option is the same figure, turned by different amounts. The odd one is its mirror image: all the same elements are there, but left and right are swapped, so no rotation lines it up with the rest.',
            pt: 'Todas as outras alternativas são a mesma figura, giradas em ângulos diferentes. A intrusa é o reflexo dela: os mesmos elementos estão lá, mas esquerda e direita trocaram de lado, e nenhuma rotação a alinha com as demais.',
          }
        : {
            en: 'Every other option is the same figure, turned by different amounts. The odd one looks almost the same, but one detail was changed, so no rotation lines it up with the rest. Turn the options mentally to a common position and compare them element by element.',
            pt: 'Todas as outras alternativas são a mesma figura, giradas em ângulos diferentes. A intrusa parece quase igual, mas um detalhe foi alterado, e nenhuma rotação a alinha com as demais. Gire as alternativas mentalmente até uma posição comum e compare elemento por elemento.',
          },
    ...montar(fam, rng, intrusa, iguais, [fam.assinatura(intrusa)], quantas),
  }
}

/**
 * Uma variante que não seja rotação da figura base — senão a questão passa a
 * ter zero respostas certas em vez de uma — nem, nas famílias quirais, rotação
 * do espelho: a explicação diz "um detalhe foi alterado", e tem de ser verdade.
 */
function varianteQueNaoGira<F>(fam: Familia<F>, rng: Rng, f: F): F {
  const proibidas = new Set([classeDeRotacao(fam, f), classeDoEspelho(fam, f)])
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const c = fam.variar(f, rng)
    if (!proibidas.has(classeDeRotacao(fam, c))) return c
  }
  throw new Error(`família "${fam.id}": não achei uma intrusa que não fosse rotação da base`)
}

/**
 * Passos de rotação distintos para as alternativas "iguais". No mostrador, a
 * partir do nível 3, metade deles é ímpar — 45°, 135°… —, o giro que não cai
 * nos eixos e que a versão anterior usava só por acaso.
 */
function escolherRotacoes<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty, quantas: number): number[] {
  const todos = Array.from({ length: fam.passosNoCiclo }, (_, k) => k)
  if (fam.passosNoCiclo < 8 || nivel < 3) return rng.shuffle(todos).slice(0, quantas)
  const impares = rng.shuffle(todos.filter((k) => k % 2 === 1))
  const pares = rng.shuffle(todos.filter((k) => k % 2 === 0))
  const nImpares = Math.ceil(quantas / 2)
  return rng.shuffle([...impares.slice(0, nImpares), ...pares.slice(0, quantas - nImpares)])
}

/**
 * Uma série é "rotação pura" quando existe um giro fixo que leva cada figura à
 * seguinte — incluindo o giro zero, a série parada. É o formato que a
 * auditoria reprovou nos níveis 1 a 3: seta para cima, direita, baixo, "?".
 *
 * Compara DESENHOS (assinaturas), não a regra que os gerou: trocar o tamanho
 * dos arcos de certas figuras equivale a girá-las, e a série sairia, aos olhos
 * do candidato, uma rotação pura com outro passo.
 */
export function ehRotacaoPura<F>(fam: Familia<F>, figuras: readonly F[]): boolean {
  for (let k = 0; k < fam.passosNoCiclo; k++) {
    let serve = true
    for (let i = 0; i + 1 < figuras.length && serve; i++) {
      serve = fam.assinatura(fam.rotate(figuras[i] as F, k)) === fam.assinatura(figuras[i + 1] as F)
    }
    if (serve) return true
  }
  return false
}

export type RegraDeGiro = 'constante' | 'alternada' | 'crescente'

export interface PlanoDaSerie<F> {
  base: F
  /** as casas visíveis seguidas da resposta */
  figuras: F[]
  visiveis: number
  regra: RegraDeGiro
  /** o atributo muda a cada DUAS casas em vez de a cada casa */
  atributoLento: boolean
  /** giro acumulado (em passos) e avanço de atributo acumulado na casa i */
  giro(i: number): number
  atributo(i: number): number
}

/**
 * Planeja a série de "qual vem a seguir?". Nenhum nível é rotação pura:
 *
 *   1  giro constante + atributo alternando, 3 casas visíveis
 *   2  idem com 4 casas; no mostrador, passos de 45° ou 135°
 *   3  giro alternando entre dois passos + atributo alternando
 *   4  giro crescente (1, 2, 3… passos) + atributo alternando
 *   5  giro alternando + atributo num ritmo mais lento, a cada duas casas
 *
 * Exportado para o teste conferir as figuras que a questão desenhou, e não a
 * intenção declarada.
 */
export function planejarSerie<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): PlanoDaSerie<F> {
  const ciclo = fam.passosNoCiclo
  const oito = ciclo > 4

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const base = sortearUtilizavel(fam, rng, nivel)
    const visiveis = nivel <= 1 ? 3 : 4
    let regra: RegraDeGiro
    let giro: (i: number) => number

    if (nivel <= 2) {
      const p = rng.pick(nivel === 1 ? (oito ? [1, 2, -1, -2] : [1, -1]) : oito ? [1, 3, -1, -3] : [1, -1])
      regra = 'constante'
      giro = (i) => i * p
    } else if (nivel === 4) {
      const p = rng.pick([1, -1])
      regra = 'crescente'
      giro = (i) => (p * i * (i + 1)) / 2
    } else {
      const [a, b] = rng.pick(
        oito
          ? [[1, 2], [2, 1], [1, 3], [3, 1], [-1, -2], [-2, -1]]
          : [[1, 2], [2, 1], [-1, -2], [-2, -1]],
      ) as [number, number]
      regra = 'alternada'
      giro = (i) => Math.floor((i + 1) / 2) * a + Math.floor(i / 2) * b
    }

    const atributoLento = nivel === 5
    const atributo = (i: number): number => (atributoLento ? Math.floor((i + 1) / 2) : i)
    const figuras = Array.from({ length: visiveis + 1 }, (_, i) =>
      fam.avancarSecundario(fam.rotate(base, giro(i)), atributo(i)),
    )

    // Guardas: nada de rotação pura aos olhos do candidato, e nenhuma casa
    // igual à anterior — a série pareceria parada naquele ponto. Repetir uma
    // casa mais distante é legítimo: é o ciclo da rotação fechando.
    if (ehRotacaoPura(fam, figuras)) continue
    // O atributo tem de APARECER: em algumas figuras trocar cheio por vazado
    // equivale a girar, e a série viraria só giros com passos irregulares.
    if (!figuras.some((f, i) => i > 0 && !ehRotacaoDe(fam, f, figuras[i - 1] as F))) continue
    if (figuras.some((f, i) => i > 0 && fam.assinatura(f) === fam.assinatura(figuras[i - 1] as F))) continue

    return { base, figuras, visiveis, regra, atributoLento, giro, atributo }
  }
  throw new Error(`família "${fam.id}": não consegui planejar uma série`)
}

const EXPLICACAO_DA_SERIE: Record<RegraDeGiro | 'lenta', LocalizedText> = {
  constante: {
    en: 'Two things change at every step: the figure turns by the same amount, and one feature switches (arc sizes, pointer lengths, fill or number of rings). The answer turns once more and switches the feature once more.',
    pt: 'Duas coisas mudam a cada casa: a figura gira sempre o mesmo tanto e uma característica se alterna (tamanho dos arcos, comprimento dos ponteiros, preenchimento ou número de anéis). A resposta gira mais uma vez e alterna a característica mais uma vez.',
  },
  alternada: {
    en: 'The turn is not constant: it alternates between two step sizes — compare the first turn with the second, then the pattern repeats. At the same time one feature switches at every step. Apply the next turn of the alternation and switch the feature once more.',
    pt: 'O giro não é constante: ele alterna entre dois tamanhos de passo — compare o primeiro giro com o segundo, e o padrão se repete. Ao mesmo tempo uma característica se alterna a cada casa. Aplique o próximo giro da alternância e alterne a característica mais uma vez.',
  },
  crescente: {
    en: 'Each turn is one step bigger than the one before (one step, then two, then three…), so the next turn is bigger still — and a turn that completes a full circle brings the figure back to where it was. At the same time one feature (arc sizes, pointer lengths, fill or number of rings) switches at every step.',
    pt: 'Cada giro é um passo maior que o anterior (um passo, depois dois, depois três…), então o próximo é maior ainda — e um giro que completa a volta inteira devolve a figura à mesma posição. Ao mesmo tempo uma característica (tamanho dos arcos, comprimento dos ponteiros, preenchimento ou número de anéis) se alterna a cada casa.',
  },
  lenta: {
    en: 'Two rhythms run at once. The turn alternates between two step sizes, while one feature (arc sizes, pointer lengths, fill or number of rings) switches only every second step. Track each rhythm on its own before choosing.',
    pt: 'Dois ritmos correm ao mesmo tempo. O giro alterna entre dois tamanhos de passo, enquanto uma característica (tamanho dos arcos, comprimento dos ponteiros, preenchimento ou número de anéis) só se alterna a cada duas casas. Acompanhe cada ritmo separadamente antes de escolher.',
  },
}

/** "Qual figura vem a seguir?" — giro e atributo mudando juntos, em ritmos que crescem com o nível. */
export function serieFormas<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const plano = planejarSerie(fam, rng, nivel)
  const { base, figuras, visiveis: v, giro, atributo } = plano
  const correta = figuras[v] as F
  const naCasa = (g: number, a: number): F => fam.avancarSecundario(fam.rotate(base, g), a)

  // Erros típicos primeiro: acertar o giro e errar o atributo, repetir o
  // último passo em vez de seguir a regra do giro, esquecer de girar, repetir
  // a última casa, pular uma casa, girar um passo a mais ou a menos. O pool
  // sistemático vem atrás, como reserva, porque em algumas famílias os erros
  // típicos coincidem entre si.
  const ultimoPasso = giro(v - 1) - giro(v - 2)
  const candidatos = [
    naCasa(giro(v), atributo(v) + 1),
    naCasa(giro(v - 1) + ultimoPasso, atributo(v)),
    naCasa(giro(v - 1), atributo(v)),
    figuras[v - 1] as F,
    naCasa(giro(v + 1), atributo(v + 1)),
    naCasa(giro(v) + 1, atributo(v)),
    naCasa(giro(v) - 1, atributo(v)),
    ...poolDeDistratores(fam, correta),
  ]

  return {
    subtipo: 'serie_formas',
    familia: fam.id,
    stem: 'Which figure continues the sequence?',
    stemSpatial: sequenciaParaSpec([...figuras.slice(0, v).map((f) => fam.toSpec(f)), null]),
    explanation: EXPLICACAO_DA_SERIE[plano.atributoLento ? 'lenta' : plano.regra],
    ...montar(fam, rng, correta, candidatos, [fam.assinatura(correta)], OPCOES_POR_QUESTAO),
  }
}

/** Matriz 3×3 com a última célula faltando. */
export function matriz<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const temAtributo = fam.passosSecundarios > 1

  // Regra por coluna e regra por linha. Com eixo de atributo disponível, as
  // duas regras são de naturezas diferentes — gira ao longo da linha, muda o
  // atributo ao longo da coluna —, que é o formato das matrizes reais.
  const porColuna = rng.pick([1, fam.passosNoCiclo > 4 ? 2 : 1])
  const porLinha = temAtributo ? 0 : rng.pick([1, fam.passosNoCiclo - 1])
  const atributoPorLinha = temAtributo ? 1 : 0

  const celula = (linha: number, coluna: number): F =>
    fam.avancarSecundario(
      fam.rotate(f, coluna * porColuna + linha * porLinha),
      linha * atributoPorLinha,
    )

  const grade: (SpatialSpec | null)[] = []
  for (let l = 0; l < 3; l++) {
    for (let c = 0; c < 3; c++) {
      grade.push(l === 2 && c === 2 ? null : fam.toSpec(celula(l, c)))
    }
  }

  const correta = celula(2, 2)
  // Erros típicos: pegar a célula de cima, a da esquerda, aplicar só uma das
  // duas regras. O pool sistemático entra como reserva.
  const candidatos = [
    celula(1, 2),
    celula(2, 1),
    celula(0, 2),
    fam.avancarSecundario(correta, 1),
    ...poolDeDistratores(fam, correta),
  ]

  return {
    subtipo: 'matriz',
    familia: fam.id,
    stem: 'Which figure completes the grid?',
    stemSpatial: matrizParaSpec(grade),
    explanation: temAtributo
      ? {
          en: 'Read the grid twice. Across each row the figure turns by a fixed step; down each column its attribute changes. The missing cell is the one that obeys both readings.',
          pt: 'Leia a grade duas vezes. Ao longo de cada linha a figura gira um passo fixo; ao longo de cada coluna o atributo muda. A célula que falta é a que obedece às duas leituras.',
        }
      : {
          en: 'The figure turns by a fixed step across each row and by another fixed step down each column. Apply both to the cell before the gap.',
          pt: 'A figura gira um passo fixo ao longo da linha e outro passo fixo ao longo da coluna. Aplique os dois à célula anterior ao vão.',
        },
    ...montar(fam, rng, correta, candidatos, [fam.assinatura(correta)], OPCOES_POR_QUESTAO),
  }
}

/**
 * "Qual opção é IDÊNTICA à figura acima?" — o tipo comparação visual.
 *
 * Os distratores vêm de `variar`, que faz uma alteração mínima porém discreta:
 * um canto troca de arco, um ponteiro muda de casa. Mínima o bastante para
 * exigir conferência item a item, discreta o bastante para ser visível.
 */
export function parIdentico<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)

  const candidatos: F[] = []
  for (let i = 0; i < 60; i++) {
    const v = fam.variar(f, rng)
    // Uma rotação da base não serve como distrator aqui: a pergunta é sobre
    // ser idêntica, e "a mesma figura girada" é uma discussão diferente.
    if (!ehRotacaoDe(fam, v, f)) candidatos.push(v)
    const w = fam.variar(v, rng)
    if (!ehRotacaoDe(fam, w, f)) candidatos.push(w)
  }

  return {
    subtipo: 'identical_pair',
    familia: fam.id,
    stem: 'Which option is exactly identical to the figure above?',
    stemSpatial: fam.toSpec(f),
    explanation: {
      en: 'Every option differs from the model in at most one detail. Do not judge the overall shape — pick one position at a time and compare it across the options.',
      pt: 'Cada alternativa difere do modelo em no máximo um detalhe. Não julgue pela forma geral — escolha uma posição por vez e compare-a entre as alternativas.',
    },
    ...montar(fam, rng, f, candidatos, [fam.assinatura(f)], OPCOES_POR_QUESTAO),
  }
}

// --- Tabela de compatibilidade ----------------------------------------------

/**
 * Quais vocabulários cada forma aceita.
 *
 * `atributos` é aquiral de propósito, então fica fora de rotação e reflexão:
 * ali o espelho sempre coincide com alguma rotação e a questão teria duas
 * respostas certas. É o mesmo defeito reportado nas capturas de tela da versão
 * anterior, agora impossível de reintroduzir sem mexer nesta tabela.
 */
export const FORMAS: Record<
  string,
  { fn: FormaDePergunta; exigeQuiralidade: boolean }
> = {
  rotacao: { fn: rotacao as FormaDePergunta, exigeQuiralidade: true },
  reflexao: { fn: reflexao as FormaDePergunta, exigeQuiralidade: true },
  odd_one_out: { fn: oddOneOut as FormaDePergunta, exigeQuiralidade: false },
  serie_formas: { fn: serieFormas as FormaDePergunta, exigeQuiralidade: false },
  matriz: { fn: matriz as FormaDePergunta, exigeQuiralidade: false },
  identical_pair: { fn: parIdentico as FormaDePergunta, exigeQuiralidade: false },
}

export function familiaCombina(forma: string, fam: FamiliaQualquer): boolean {
  const def = FORMAS[forma]
  if (!def) return false
  return def.exigeQuiralidade ? fam.suportaReflexao : true
}
