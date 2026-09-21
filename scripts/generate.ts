/**
 * Geração em lote dos tipos determinísticos (spatial, math_series, math_word).
 *
 * Não chama LLM: varre seeds, monta a questão pela regra e escreve um pacote de
 * drafts. Os tipos verbais NÃO passam por aqui — eles dependem de geração por
 * modelo, que é um caminho separado (ver README do pipeline).
 *
 *   npx tsx scripts/generate.ts [--por-tipo 150] [--pack <nome>]
 */
import {
  DIFFICULTIES,
  EXAM_BLUEPRINT,
  TARGET_APPROVED_PER_TIPO,
  TIPOS,
  type Difficulty,
  type Tipo,
} from '../src/core/taxonomy'
import { buildQuestion, GENERATORS, GENERATED_TIPOS } from '../src/core/generators'
import type { Question } from '../src/core/schema'
import { dedupSignature } from '../src/core/content/gates'
import { writeDraftPack } from './lib/bank'

const args = process.argv.slice(2)
const pisoPorTipo = Number(valorDe('--por-tipo') ?? TARGET_APPROVED_PER_TIPO)
const provasAlvo = Number(valorDe('--provas') ?? 0)
const nomePack = valorDe('--pack') ?? `gen-${new Date().toISOString().slice(0, 10)}`

/**
 * Cota por tipo.
 *
 * "150 por tipo" parece equilibrado, mas a prova não é: espacial são 16 das 50
 * questões e lógica verbal são 4. Com 150 de cada, o espacial acaba depois de
 * 9 simulações e a lógica dura 37 — o banco inteiro fica limitado pelo pior
 * caso. Com `--provas N`, cada tipo recebe o que N simulações consomem,
 * respeitando o piso.
 */
function cotaDe(tipo: Tipo): number {
  return Math.max(pisoPorTipo, provasAlvo * EXAM_BLUEPRINT[tipo])
}

/** Geradores agrupados por tipo. */
const porTipoGeradores = new Map<Tipo, string[]>()
for (const [id, fn] of Object.entries(GENERATORS)) {
  const tipo = fn(1, 1).tipo
  porTipoGeradores.set(tipo, [...(porTipoGeradores.get(tipo) ?? []), id])
}

const agora = new Date().toISOString()
const pacote: Question[] = []

for (const tipo of TIPOS) {
  if (!GENERATED_TIPOS.includes(tipo)) continue

  const geradores = porTipoGeradores.get(tipo) ?? []
  // Distribui a cota do tipo entre seus subtipos e os 5 níveis, para o banco
  // sair com ramp de dificuldade em vez de um monte de questão fácil.
  const porTipo = cotaDe(tipo)
  const porCombinacao = Math.ceil(porTipo / (geradores.length * DIFFICULTIES.length))
  const vistos = new Set<string>()
  const doTipo: Question[] = []

  /** Tenta extrair até `cota` questões novas de um gerador num nível. */
  const colher = (gerador: string, nivel: Difficulty, cota: number): number => {
    let aceitas = 0
    for (let seed = 1; seed <= 6000 && aceitas < cota; seed++) {
      let q: Question
      try {
        q = buildQuestion(gerador, seed, nivel, agora)
      } catch {
        continue // combinação impossível para essa seed; segue
      }
      // Assinatura ciente de figura: questões espaciais compartilham o
      // mesmo texto de enunciado e só se distinguem pelo desenho.
      const assinatura = dedupSignature(q)
      if (vistos.has(assinatura)) continue
      vistos.add(assinatura)
      doTipo.push(q)
      aceitas++
    }
    return aceitas
  }

  // 1ª passada: cota igual para cada (gerador × nível).
  const deficit: { gerador: string; nivel: Difficulty; faltou: number }[] = []
  for (const gerador of geradores) {
    for (const nivel of DIFFICULTIES) {
      const aceitas = colher(gerador, nivel as Difficulty, porCombinacao)
      if (aceitas < porCombinacao) {
        deficit.push({ gerador, nivel: nivel as Difficulty, faltou: porCombinacao - aceitas })
      }
    }
  }

  // 2ª passada: um subtipo que bateu no teto não pode deixar o TIPO curto.
  // Redistribui o que faltou entre os outros geradores do mesmo tipo.
  let aRedistribuir = deficit.reduce((acc, d) => acc + d.faltou, 0)
  if (aRedistribuir > 0 && geradores.length > 1) {
    const esgotados = new Set(deficit.map((d) => `${d.gerador}|${d.nivel}`))
    for (const nivel of DIFFICULTIES) {
      for (const gerador of geradores) {
        if (aRedistribuir <= 0) break
        if (esgotados.has(`${gerador}|${nivel}`)) continue
        aRedistribuir -= colher(gerador, nivel as Difficulty, aRedistribuir)
      }
    }
  }

  if (aRedistribuir > 0) {
    console.warn(
      `  aviso: ${tipo} fechou em ${doTipo.length}/${porTipo} — ` +
        `léxico/regras não dão mais questões distintas (${deficit
          .map((d) => `${d.gerador} n${d.nivel}`)
          .join(', ')})`,
    )
  }

  pacote.push(...doTipo)
  console.log(
    `${tipo.padEnd(14)} ${String(doTipo.length).padStart(4)} questões (${geradores.length} geradores)`,
  )
}

const naoGerados = TIPOS.filter((t) => !GENERATED_TIPOS.includes(t))
const caminho = writeDraftPack(nomePack, pacote)

console.log(`\n${pacote.length} drafts escritos em ${caminho}`)
console.log(`Tipos sem gerador determinístico (dependem de LLM): ${naoGerados.join(', ')}`)
console.log('Próximo passo: npm run content:gate')

function valorDe(flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
