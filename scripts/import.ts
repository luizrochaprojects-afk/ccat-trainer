/**
 * Importação de questões de fora (amostras oficiais da Criteria e material de
 * preparação da web) para um pacote de drafts.
 *
 *   npx tsx scripts/import.ts
 *
 * Lê `content/import/<pacote>.json`, no formato enxuto de autoria abaixo, e
 * escreve `content/drafts/importado-<pacote>.json`. Daí em diante é o caminho de
 * sempre: `content:gate` e `content:promote`. Nada entra no banco sem passar
 * pelos mesmos gates do conteúdo gerado.
 *
 * Verificação do gabarito:
 *  - matemática: `expression`, avaliada pelo solver do gate;
 *  - verbal e espacial: resposta de um segundo modelo que resolveu às cegas,
 *    registrada em `content/import/<pacote>.revisao.json` ({ slug: letra }).
 *    Sem a revisão a questão sai sem `modelAnswerId` e o gate a reprova.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { optionIdAt, type OptionId } from '../src/core/optionIds'
import type { Question, SpatialSpec } from '../src/core/schema'
import type { Difficulty, Tipo } from '../src/core/taxonomy'
import { CONTENT_DIR, writeDraftPack } from './lib/bank'

interface ItemImportado {
  slug: string
  tipo: Tipo
  subtipo: string
  difficulty: Difficulty
  stem: string
  stemSpatial?: SpatialSpec
  /** texto (verbal/matemática) ou figura (espacial), na ordem exibida */
  options: (string | SpatialSpec)[]
  /** índice da alternativa correta */
  answer: number
  explanation: { pt: string; en: string }
  origin: 'official-sample' | 'imported'
  source: { name: string; url: string }
  /** só matemática: forma fechada que o gate avalia */
  expression?: string
}

interface Revisao {
  model: string
  respostas: Record<string, OptionId>
}

const PASTA = join(CONTENT_DIR, 'import')
const agora = new Date().toISOString()

const pacotes = existsSync(PASTA)
  ? readdirSync(PASTA).filter((f) => f.endsWith('.json') && !f.endsWith('.revisao.json'))
  : []

if (pacotes.length === 0) {
  console.log('nada em content/import — nada a importar')
  process.exit(0)
}

for (const arquivo of pacotes) {
  const nome = basename(arquivo, '.json')
  const itens = JSON.parse(readFileSync(join(PASTA, arquivo), 'utf8')) as ItemImportado[]
  const caminhoRevisao = join(PASTA, `${nome}.revisao.json`)
  const revisao: Revisao | null = existsSync(caminhoRevisao)
    ? (JSON.parse(readFileSync(caminhoRevisao, 'utf8')) as Revisao)
    : null

  const questoes = itens.map((item): Question => {
    const matematica = item.tipo === 'math_series' || item.tipo === 'math_word'
    const modelAnswerId = revisao?.respostas[item.slug]

    return {
      id: `importado.${item.slug}`,
      tipo: item.tipo,
      subtipo: item.subtipo,
      difficulty: item.difficulty,
      stem: item.stem,
      ...(item.stemSpatial ? { stemSpatial: item.stemSpatial } : {}),
      options: item.options.map((o, i) => ({
        id: optionIdAt(i),
        ...(typeof o === 'string' ? { text: o } : { spatial: o }),
      })),
      answerId: optionIdAt(item.answer),
      explanation: item.explanation,
      theoryRef: `${item.tipo}.md#${item.subtipo}`,
      origin: item.origin,
      source: item.source,
      status: 'draft',
      verification: matematica
        ? { method: 'solver', expression: item.expression, checkedAt: agora }
        : {
            method: 'second-model',
            ...(revisao ? { model: revisao.model } : {}),
            ...(modelAnswerId ? { modelAnswerId } : {}),
            checkedAt: agora,
          },
      createdAt: agora,
    } as Question
  })

  const caminho = writeDraftPack(`importado-${nome}`, questoes)
  const semRevisao = questoes.filter(
    (q) => q.verification.method === 'second-model' && !q.verification.modelAnswerId,
  ).length
  console.log(`${arquivo}: ${questoes.length} questões → ${caminho}`)
  if (semRevisao > 0) console.log(`  ⚠ ${semRevisao} sem revisão do segundo modelo — o gate vai reprovar`)
}
