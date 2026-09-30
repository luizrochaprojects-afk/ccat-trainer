import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import type { StemTable } from '../schema'

/**
 * Atenção a detalhes: comparação de colunas (tipo `verbal_detail`).
 *
 * Na CCAT são ~3 por prova, de dificuldade baixa a média, e o que medem é
 * velocidade de conferência: duas colunas de 5 linhas (nomes, endereços,
 * códigos, números de 7 dígitos, e-mails) e a pergunta "quantas linhas são
 * exatamente iguais?" ou "quais linhas têm diferença?".
 *
 * A diferença é sempre UMA alteração pequena por linha, do tipo que o olho
 * corrige sozinho: dígitos vizinhos invertidos, uma letra trocada, St. no
 * lugar de Dr., um hífen, uma letra dobrada. O nível escolhe o material e a
 * sutileza:
 *
 *  - 1:   nomes e números curtos, 1–2 linhas diferentes, troca de um caractere.
 *  - 2:   entram endereços; inversão de vizinhos, letra dobrada, sufixo de rua.
 *  - 3:   números de 7 dígitos, e-mails e códigos; hífen e pontuação; a
 *         alteração nunca cai no primeiro caractere, que é onde se olha.
 *  - 4-5: códigos alfanuméricos com caracteres confundíveis (O/0, I/1, S/5,
 *         B/8), maiúscula/minúscula no 5, até todas as linhas diferentes, e a
 *         alteração no miolo da string.
 *
 * O gabarito é conferência mecânica: a regra (o gerador re-executado pela
 * seed) basta, e nenhum modelo precisa opinar.
 */

export interface DetailGenerated {
  subtipo: string
  stem: string
  stemTable: StemTable
  options: { id: string; text: string }[]
  answerId: string
  explanation: LocalizedText
}

export type DetailGenerator = (seed: number, difficulty: Difficulty) => DetailGenerated

export type Mutacao =
  | 'digito'
  | 'letra'
  | 'transposicao'
  | 'dobrada'
  | 'sufixo'
  | 'hifen'
  | 'pontuacao'
  | 'confusivel'
  | 'caixa'

export type Categoria = 'nomes' | 'enderecos' | 'codigos' | 'numeros' | 'emails' | 'misto'

export type Formato = 'quantas' | 'quais'

/**
 * Largura máxima de uma entrada. Com duas colunas lado a lado em monoespaçada,
 * é o que cabe num celular de 375px sem rolagem horizontal.
 */
export const MAX_CARACTERES = 18

export const LINHAS = 5

interface Nivel {
  categorias: readonly Categoria[]
  /** quantas linhas diferentes, sorteado entre estes */
  diferencas: readonly number[]
  mutacoes: readonly Mutacao[]
  /** a alteração não cai nos primeiros `margem` caracteres */
  margem: number
}

const NIVEIS: Record<Difficulty, Nivel> = {
  1: { categorias: ['nomes', 'numeros'], diferencas: [1, 2], mutacoes: ['digito', 'letra'], margem: 0 },
  2: {
    categorias: ['nomes', 'numeros', 'enderecos'],
    diferencas: [1, 2, 3],
    mutacoes: ['digito', 'letra', 'transposicao', 'dobrada', 'sufixo'],
    margem: 0,
  },
  3: {
    categorias: ['enderecos', 'numeros', 'emails', 'codigos'],
    diferencas: [2, 3],
    mutacoes: ['transposicao', 'dobrada', 'sufixo', 'hifen', 'pontuacao', 'digito', 'letra'],
    margem: 1,
  },
  4: {
    categorias: ['codigos', 'emails', 'enderecos'],
    diferencas: [2, 3, 4],
    mutacoes: ['transposicao', 'confusivel', 'hifen', 'pontuacao', 'dobrada', 'sufixo'],
    margem: 2,
  },
  5: {
    categorias: ['codigos', 'emails', 'misto'],
    diferencas: [2, 3, 4, 5],
    mutacoes: ['confusivel', 'transposicao', 'caixa', 'hifen', 'dobrada', 'pontuacao'],
    margem: 2,
  },
}

const LEGENDA: Record<Categoria, string> = {
  nomes: 'Customer names',
  enderecos: 'Shipping addresses',
  codigos: 'Ticket codes',
  numeros: 'Account numbers',
  emails: 'Email addresses',
  misto: 'Customer records',
}

// --- Material ----------------------------------------------------------------

const SOBRENOMES = [
  'Phillips', 'Matthews', 'Callahan', 'Robertson', 'Gallagher', 'Whitaker', 'Donnelly',
  'Kowalski', 'Lindqvist', 'Harrison', 'Sullivan', 'Bennett', 'Russell', 'Morrison',
  'Castillo', 'Ferreira', 'Holloway', 'Pearson', 'Albright', 'Mitchell',
] as const

const NOMES = [
  'Jonathan', 'Rebecca', 'Stephen', 'Allison', 'Gregory', 'Danielle', 'Phillip', 'Marianne',
  'Jeffrey', 'Theresa', 'Russell', 'Colleen', 'Anna', 'Leo', 'Nora', 'Ian', 'Carl', 'Ruth',
] as const

const RUAS = [
  'Elm', 'Oak', 'Maple', 'Harbor', 'Willow', 'Cedar', 'Birch', 'Summit', 'Chestnut',
  'Juniper', 'Laurel', 'Spruce', 'Hollis', 'Mill', 'Kennett', 'Pollard',
] as const

const SUFIXOS = ['St.', 'Dr.', 'Ave.', 'Rd.', 'Ln.', 'Ct.'] as const

/** Trocas de sufixo que o olho aceita sem perceber (mesmo tamanho, mesma forma). */
const TROCA_SUFIXO: Record<string, string> = {
  'St.': 'Dr.',
  'Dr.': 'St.',
  'Rd.': 'Dr.',
  'Ln.': 'Rd.',
  'Ct.': 'St.',
  'Ave.': 'Av.',
}

const PESSOAS_EMAIL = [
  'martin', 'keller', 'novak', 'reyes', 'walsh', 'hughes', 'ortiz', 'fischer', 'dunne',
  'moreau', 'collins', 'russo', 'haddad', 'allen', 'tanner', 'bishop',
] as const

const DOMINIOS = ['acme', 'corp', 'mail', 'northco', 'vela', 'orbit'] as const
const TLDS = ['com', 'net', 'org', 'co'] as const

/**
 * Alfabeto dos códigos dos níveis altos: pesado nos caracteres que se
 * confundem, porque é neles que a prova aposta.
 */
const ALFANUM_DIFICIL = [...'O0I1S5B8Z2G6QXKMNRTW3479']
const LETRAS_CODIGO = [...'ABCDEFGHJKLMNPRSTUVWXYZ']

function entrada(rng: Rng, categoria: Exclude<Categoria, 'misto'>, d: Difficulty): string {
  switch (categoria) {
    case 'nomes': {
      const sobrenome = rng.pick(SOBRENOMES)
      const nome = rng.pick(NOMES)
      return d >= 3 && rng.next() < 0.5
        ? `${sobrenome}, ${nome[0]}. ${rng.pick(LETRAS_CODIGO)}.`
        : `${sobrenome}, ${nome}`
    }
    case 'numeros': {
      const digitos = d === 1 ? 5 : d === 2 ? 6 : 7
      const n = String(rng.int(1, 9)) + Array.from({ length: digitos - 1 }, () => rng.int(0, 9)).join('')
      return d >= 3 && rng.next() < 0.5 ? `${n.slice(0, 3)}-${n.slice(3)}` : n
    }
    case 'enderecos': {
      const numero = d <= 2 ? rng.int(12, 980) : rng.int(100, 9899)
      return `${numero} ${rng.pick(RUAS)} ${rng.pick(SUFIXOS)}`
    }
    case 'emails': {
      const pessoa = rng.pick(PESSOAS_EMAIL)
      const inicial = String.fromCharCode(97 + rng.int(0, 25))
      const local = rng.pick([`${inicial}.${pessoa}`, `${inicial}${pessoa}`, `${pessoa}.${inicial}`])
      // No nível 5 o nome leva dois dígitos: é onde entram l/1 e O/0.
      const sufixo = d === 5 ? String(rng.int(10, 99)) : ''
      return `${local}${sufixo}@${rng.pick(DOMINIOS)}.${rng.pick(TLDS)}`
    }
    case 'codigos': {
      if (d <= 3) {
        const prefixo = Array.from({ length: 3 }, () => rng.pick(LETRAS_CODIGO)).join('')
        return `${prefixo}-${rng.int(10000, 99999)}`
      }
      const bloco = (n: number) => Array.from({ length: n }, () => rng.pick(ALFANUM_DIFICIL)).join('')
      return d === 4 ? `${bloco(3)}-${bloco(4)}` : `${bloco(3)}-${bloco(4)}-${bloco(2)}`
    }
  }
}

// --- Alterações --------------------------------------------------------------

interface Alterado {
  texto: string
  mutacao: Mutacao
  /** trecho original e alterado, para a explicação */
  de: string
  para: string
}

/** Dígito por um de forma parecida — o que se lê errado de relance. */
const DIGITO_PARECIDO: Record<string, string> = {
  '0': '8', '1': '7', '2': '7', '3': '8', '4': '9', '5': '6', '6': '5', '7': '1', '8': '3', '9': '4',
}

/** Letra por uma de forma parecida. */
const LETRA_PARECIDA: Record<string, string> = {
  a: 'e', e: 'a', i: 'l', l: 'i', o: 'a', u: 'n', n: 'm', m: 'n', r: 'n', c: 'e',
  h: 'b', b: 'h', t: 'f', f: 't', s: 'z', v: 'w', w: 'v', k: 'h', g: 'q', d: 'b', p: 'q', y: 'v',
}

/** Pares que o olho não distingue em fonte comum. */
const CONFUSIVEL: Record<string, string> = {
  O: '0', '0': 'O', I: '1', '1': 'I', S: '5', '5': 'S', B: '8', '8': 'B', Z: '2', '2': 'Z',
  G: '6', '6': 'G', l: '1',
}

const ehAlfanum = (c: string | undefined) => c !== undefined && /[A-Za-z0-9]/.test(c)

function posicoes(s: string, margem: number, ok: (c: string, i: number) => boolean): number[] {
  const out: number[] = []
  for (let i = margem; i < s.length; i++) if (ok(s[i] as string, i)) out.push(i)
  return out
}

function trocar(s: string, i: number, por: string, tamanho = 1): string {
  return s.slice(0, i) + por + s.slice(i + tamanho)
}

/** Aplica uma alteração; undefined quando ela não cabe nesta string. */
function alterar(rng: Rng, s: string, m: Mutacao, margem: number): Alterado | undefined {
  const escolher = (ps: number[]) => (ps.length === 0 ? undefined : rng.pick(ps))

  switch (m) {
    case 'digito': {
      const i = escolher(posicoes(s, margem, (c) => /\d/.test(c)))
      if (i === undefined) return undefined
      const de = s[i] as string
      const para = DIGITO_PARECIDO[de] as string
      return { texto: trocar(s, i, para), mutacao: m, de, para }
    }
    case 'letra': {
      const i = escolher(posicoes(s, Math.max(1, margem), (c) => c in LETRA_PARECIDA))
      if (i === undefined) return undefined
      const de = s[i] as string
      const para = LETRA_PARECIDA[de] as string
      return { texto: trocar(s, i, para), mutacao: m, de, para }
    }
    case 'transposicao': {
      const i = escolher(
        posicoes(s, margem, (c, j) => ehAlfanum(c) && ehAlfanum(s[j + 1]) && c !== s[j + 1]),
      )
      if (i === undefined) return undefined
      const de = s.slice(i, i + 2)
      const para = `${de[1]}${de[0]}`
      return { texto: trocar(s, i, para, 2), mutacao: m, de, para }
    }
    case 'dobrada': {
      // Desfaz uma letra dobrada, se houver; senão dobra uma consoante.
      const dobradas = posicoes(s, margem, (c, j) => /[a-z]/.test(c) && s[j + 1] === c)
      if (dobradas.length > 0) {
        const i = rng.pick(dobradas)
        const de = s.slice(i, i + 2)
        return { texto: trocar(s, i, de[0] as string, 2), mutacao: m, de, para: de[0] as string }
      }
      const i = escolher(
        posicoes(s, Math.max(1, margem), (c, j) => /[lnrstpmfc]/.test(c) && s[j - 1] !== c && s[j + 1] !== c),
      )
      if (i === undefined) return undefined
      const de = s[i] as string
      return { texto: trocar(s, i, de + de), mutacao: m, de, para: de + de }
    }
    case 'sufixo': {
      const achado = /(St\.|Dr\.|Ave\.|Rd\.|Ln\.|Ct\.)$/.exec(s)
      if (!achado) return undefined
      const de = achado[1] as string
      const para = TROCA_SUFIXO[de] as string
      return { texto: s.slice(0, achado.index) + para, mutacao: m, de, para }
    }
    case 'hifen': {
      const hifens = posicoes(s, 0, (c) => c === '-')
      if (hifens.length > 0) {
        const i = rng.pick(hifens)
        // Tira o hífen ou o anda uma casa: os dois passam batido.
        if (rng.next() < 0.5 || !ehAlfanum(s[i + 1]) || !ehAlfanum(s[i + 2])) {
          return { texto: trocar(s, i, ''), mutacao: m, de: s.slice(i - 1, i + 2), para: `${s[i - 1]}${s[i + 1]}` }
        }
        const para = `${s[i + 1]}-`
        return { texto: trocar(s, i, para, 2), mutacao: m, de: s.slice(i, i + 2), para }
      }
      // Sem hífen: só em número ou código, onde um hífen é plausível.
      if (!/^[A-Z0-9]+$/.test(s)) return undefined
      const i = escolher(posicoes(s, Math.max(2, margem), (_, j) => j < s.length - 1))
      if (i === undefined) return undefined
      return { texto: `${s.slice(0, i)}-${s.slice(i)}`, mutacao: m, de: s.slice(i - 1, i + 1), para: `${s[i - 1]}-${s[i]}` }
    }
    case 'pontuacao': {
      const arroba = s.indexOf('@')
      const i = escolher(
        posicoes(s, Math.max(1, margem), (c, j) =>
          arroba >= 0 ? j < arroba && (c === '.' || c === '_') : c === '.' || c === ',',
        ),
      )
      if (i === undefined) {
        // E-mail sem ponto no nome: o erro é o domínio trocado de .com para .co.
        if (s.endsWith('.com')) return { texto: s.slice(0, -1), mutacao: m, de: '.com', para: '.co' }
        return undefined
      }
      const de = s[i] as string
      if (arroba >= 0) {
        const para = de === '.' ? '_' : '.'
        return { texto: trocar(s, i, para), mutacao: m, de, para }
      }
      return { texto: trocar(s, i, ''), mutacao: m, de, para: '' }
    }
    case 'confusivel': {
      const i = escolher(posicoes(s, margem, (c) => c in CONFUSIVEL))
      if (i === undefined) return undefined
      const de = s[i] as string
      const para = CONFUSIVEL[de] as string
      return { texto: trocar(s, i, para), mutacao: m, de, para }
    }
    case 'caixa': {
      // Só letras cuja minúscula tem o mesmo desenho da maiúscula: um "k" no
      // meio de um código todo em caixa alta denunciaria a diferença de longe.
      const i = escolher(posicoes(s, margem, (c) => /[cosvwxzupCOSVWXZUP]/.test(c)))
      if (i === undefined) return undefined
      const de = s[i] as string
      const para = de === de.toUpperCase() ? de.toLowerCase() : de.toUpperCase()
      return { texto: trocar(s, i, para), mutacao: m, de, para }
    }
  }
}

const DESCRICAO: Record<Mutacao, LocalizedText> = {
  digito: { pt: 'um dígito trocado', en: 'one digit changed' },
  letra: { pt: 'uma letra trocada', en: 'one letter changed' },
  transposicao: { pt: 'dois caracteres vizinhos invertidos', en: 'two neighbouring characters swapped' },
  dobrada: { pt: 'letra dobrada a mais ou a menos', en: 'a doubled letter added or dropped' },
  sufixo: { pt: 'sufixo da rua trocado', en: 'street suffix swapped' },
  hifen: { pt: 'hífen tirado ou deslocado', en: 'hyphen dropped or moved' },
  pontuacao: { pt: 'pontuação trocada', en: 'punctuation changed' },
  confusivel: { pt: 'caractere trocado por um de forma parecida', en: 'a look-alike character swapped in' },
  caixa: { pt: 'maiúscula e minúscula trocadas', en: 'upper and lower case swapped' },
}

// --- Geração -----------------------------------------------------------------

interface Linha {
  esquerda: string
  direita: string
  alteracao?: Alterado
}

/**
 * Gera a questão e informa o formato e o material sorteados (os testes usam
 * para provar que o nível muda o que é cobrado).
 */
export function gerarComparacao(
  seed: number,
  difficulty: Difficulty,
): { questao: DetailGenerated; formato: Formato; categoria: Categoria; mutacoes: Mutacao[] } {
  const rng = mulberry32(seed)
  const nivel = NIVEIS[difficulty]
  const categoria = rng.pick(nivel.categorias)
  const formato: Formato = rng.next() < 0.5 ? 'quantas' : 'quais'
  const quantasDiferentes = rng.pick(nivel.diferencas)
  const diferentes = new Set(rng.shuffle([0, 1, 2, 3, 4]).slice(0, quantasDiferentes))

  const linhas: Linha[] = []
  const vistas = new Set<string>()
  for (let i = 0; i < LINHAS; i++) {
    linhas.push(sortearLinha(rng, categoria, difficulty, nivel, diferentes.has(i), vistas))
  }

  const conjunto = [...diferentes].sort((a, b) => a - b).map((i) => i + 1)
  const questao =
    formato === 'quantas'
      ? montarQuantas(rng, categoria, linhas, conjunto)
      : montarQuais(rng, categoria, linhas, conjunto)

  return {
    questao,
    formato,
    categoria,
    mutacoes: linhas.flatMap((l) => (l.alteracao ? [l.alteracao.mutacao] : [])),
  }
}

export const DETAIL_GENERATORS = {
  comparacao: (seed: number, difficulty: Difficulty) => gerarComparacao(seed, difficulty).questao,
} as const satisfies Record<string, DetailGenerator>

function sortearLinha(
  rng: Rng,
  categoria: Categoria,
  d: Difficulty,
  nivel: Nivel,
  diferente: boolean,
  vistas: Set<string>,
): Linha {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const material =
      categoria === 'misto'
        ? rng.pick(['nomes', 'enderecos', 'codigos', 'numeros', 'emails'] as const)
        : categoria
    const original = entrada(rng, material, d)
    if (original.length > MAX_CARACTERES || vistas.has(original)) continue

    if (!diferente) {
      vistas.add(original)
      return { esquerda: original, direita: original }
    }

    // Tenta as alterações do nível em ordem sorteada; a primeira que couber vale.
    for (const m of rng.shuffle(nivel.mutacoes)) {
      const alteracao = alterar(rng, original, m, nivel.margem)
      if (!alteracao || alteracao.texto === original) continue
      if (alteracao.texto.length > MAX_CARACTERES) continue
      vistas.add(original)
      // A cópia alterada fica ora à direita, ora à esquerda: na prova não há
      // coluna "certa".
      return rng.next() < 0.5
        ? { esquerda: original, direita: alteracao.texto, alteracao }
        : { esquerda: alteracao.texto, direita: original, alteracao }
    }
  }
  throw new Error(`não consegui sortear uma linha de ${categoria} no nível ${d}`)
}

function tabela(categoria: Categoria, linhas: Linha[]): StemTable {
  return {
    layout: 'comparacao',
    caption: LEGENDA[categoria],
    columns: ['Row', 'Original', 'Copy'],
    rows: linhas.map((l, i) => [String(i + 1), l.esquerda, l.direita]),
  }
}

function montarQuantas(
  rng: Rng,
  categoria: Categoria,
  linhas: Linha[],
  conjunto: number[],
): DetailGenerated {
  const iguais = LINHAS - conjunto.length
  // Janela de 5 números contendo a resposta, como na prova: 0–4 ou 1–5. Os
  // vizinhos da resposta são os erros reais — uma diferença que passou, ou
  // uma que o olho inventou.
  const inicio = iguais === 0 ? 0 : iguais === LINHAS ? 1 : rng.pick([0, 1])
  const valores = Array.from({ length: OPCOES_POR_QUESTAO }, (_, i) => inicio + i)
  return {
    subtipo: 'comparacao',
    stem: 'How many rows are exactly identical in both columns?',
    stemTable: tabela(categoria, linhas),
    options: valores.map((v, i) => ({ id: optionIdAt(i) as string, text: String(v) })),
    answerId: optionIdAt(valores.indexOf(iguais)) as string,
    explanation: explicar(linhas, conjunto),
  }
}

function montarQuais(
  rng: Rng,
  categoria: Categoria,
  linhas: Linha[],
  conjunto: number[],
): DetailGenerated {
  const chave = (s: number[]) => s.join(',')
  const certa = chave(conjunto)
  const fora = [1, 2, 3, 4, 5].filter((n) => !conjunto.includes(n))

  // Erros reais, por ordem de plausibilidade: deixar passar uma diferença,
  // ver uma que não existe, e desalinhar a leitura em uma linha.
  const passou = rng.shuffle(conjunto.map((x) => conjunto.filter((y) => y !== x)))
  const inventou = rng.shuffle(fora.map((y) => [...conjunto, y].sort((a, b) => a - b)))
  const desalinhou = rng.shuffle(
    conjunto.flatMap((x) =>
      [x - 1, x + 1]
        .filter((y) => fora.includes(y))
        .map((y) => conjunto.map((z) => (z === x ? y : z)).sort((a, b) => a - b)),
    ),
  )

  const escolhidos: number[][] = []
  const vistos = new Set([certa])
  const grupos = [passou, inventou, desalinhou]
  // Um de cada grupo por rodada: as alternativas misturam os três erros.
  for (let rodada = 0; escolhidos.length < OPCOES_POR_QUESTAO - 1 && rodada < 8; rodada++) {
    for (const grupo of grupos) {
      const s = grupo[rodada]
      if (!s || s.length === 0 || vistos.has(chave(s))) continue
      if (escolhidos.length >= OPCOES_POR_QUESTAO - 1) break
      vistos.add(chave(s))
      escolhidos.push(s)
    }
  }
  if (escolhidos.length < OPCOES_POR_QUESTAO - 1) {
    throw new Error('não consegui montar alternativas para a comparação')
  }

  const embaralhados = rng.shuffle([conjunto, ...escolhidos].map((s, i) => ({ s, certa: i === 0 })))
  return {
    subtipo: 'comparacao',
    stem: 'Which rows contain a difference between the two columns?',
    stemTable: tabela(categoria, linhas),
    options: embaralhados.map((o, i) => ({ id: optionIdAt(i) as string, text: rotuloLinhas(o.s) })),
    answerId: optionIdAt(embaralhados.findIndex((o) => o.certa)) as string,
    explanation: explicar(linhas, conjunto),
  }
}

/** "3 only", "1 and 3", "2, 3 and 5" — o formato das alternativas da prova. */
export function rotuloLinhas(s: number[]): string {
  if (s.length === 1) return `${s[0]} only`
  return `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

function explicar(linhas: Linha[], conjunto: number[]): LocalizedText {
  const iguais = LINHAS - conjunto.length
  const detalhe = (lang: 'pt' | 'en') =>
    conjunto
      .map((n) => {
        const a = linhas[n - 1]?.alteracao as Alterado
        const trecho = a.para === '' ? `"${a.de}"` : `"${a.de}" × "${a.para}"`
        return `${lang === 'pt' ? 'linha' : 'row'} ${n}: ${DESCRICAO[a.mutacao][lang]} (${trecho})`
      })
      .join('; ')

  return {
    pt:
      `Diferenças — ${detalhe('pt')}. ${iguais === 1 ? 'Sobra 1 linha idêntica' : `Sobram ${iguais} linhas idênticas`}. ` +
      `Compare em blocos de 3 ou 4 caracteres, no mesmo ponto das duas colunas: ler a linha ` +
      `inteira deixa o cérebro corrigir o erro sozinho.`,
    en:
      `Differences — ${detalhe('en')}. ${iguais === 1 ? '1 row is identical' : `${iguais} rows are identical`}. ` +
      `Compare in chunks of 3 or 4 characters at the same spot in both columns: reading the ` +
      `whole entry lets your brain auto-correct the error.`,
  }
}
