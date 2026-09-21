/**
 * Auditoria visual dos geradores espaciais.
 *
 * Gera um HTML com amostras de cada gerador em cada nível, com o gabarito
 * marcado. Os testes provam a REGRA; isto é para conferir a LEGIBILIDADE —
 * uma figura pode ter gabarito matematicamente correto e ainda ser impossível
 * de ler em 18 segundos.
 *
 *   npx tsx scripts/preview-spatial.ts [amostras-por-nivel] [filtro]
 *
 * O filtro casa com o id do gerador ("matriz", "raios", "matriz.arcos"). Sem
 * ele a pagina sai com as 28 combinacoes, que e pesada demais para abrir de uma
 * vez — use o filtro para conferir uma familia ou uma forma por vez.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SPATIAL_GENERATORS,
  SPATIAL_GENERATOR_IDS,
} from '../src/core/spatial/generators'
import { FORMAS } from '../src/core/spatial/formas'
import { IDS_FAMILIAS } from '../src/core/spatial/figuras/index'
import { specToSvgString } from '../src/core/spatial/svg'
import { DIFFICULTIES } from '../src/core/taxonomy'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const porNivel = Number(process.argv[2] ?? 2)
const filtro = process.argv[3] ?? ''

const blocos: string[] = []

/**
 * Grade forma × família no topo.
 *
 * É a conferência que importa depois da reescrita: cada célula preenchida é uma
 * combinação que existe, e os vazios têm de ser exatamente rotação e reflexão
 * sobre a família aquiral.
 */
const cabecalho = IDS_FAMILIAS.map((f) => `<th>${f}</th>`).join('')
const linhas = Object.keys(FORMAS)
  .map((forma) => {
    const celulas = IDS_FAMILIAS.map((familia) =>
      SPATIAL_GENERATOR_IDS.includes(`${forma}.${familia}`)
        ? `<td class="sim"><a href="#${forma}.${familia}">sim</a></td>`
        : '<td class="nao">—</td>',
    ).join('')
    return `<tr><th class="lin">${forma}</th>${celulas}</tr>`
  })
  .join('')
blocos.push(
  `<table class="grade"><thead><tr><th></th>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table>`,
)

for (const id of SPATIAL_GENERATOR_IDS.filter((g) => g.includes(filtro))) {
  blocos.push(`<h2 id="${id}">${id}</h2>`)
  for (const nivel of DIFFICULTIES) {
    for (let i = 0; i < porNivel; i++) {
      const seed = nivel * 1000 + i
      const gerar = SPATIAL_GENERATORS[id] as (s: number, n: typeof nivel) => ReturnType<
        (typeof SPATIAL_GENERATORS)[string]
      >
      const q = gerar(seed, nivel)
      const alternativas = q.options
        .map(
          (o) => `
        <figure class="opt ${o.id === q.answerId ? 'correta' : ''}">
          ${specToSvgString(o.spatial, { label: `alternativa ${o.id}` })}
          <figcaption>${o.id.toUpperCase()}${o.id === q.answerId ? ' ✓' : ''}</figcaption>
        </figure>`,
        )
        .join('')

      blocos.push(`
        <section class="q">
          <p class="meta">nível ${nivel} · seed ${seed} · gabarito <b>${q.answerId.toUpperCase()}</b></p>
          <p class="stem">${q.stem}</p>
          ${q.stemSpatial ? `<div class="enunciado">${specToSvgString(q.stemSpatial, { label: 'enunciado' })}</div>` : ''}
          <div class="opts">${alternativas}</div>
          <details><summary>explicação</summary><p>${q.explanation.pt}</p><p lang="en">${q.explanation.en}</p></details>
        </section>`)
    }
  }
}

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Auditoria visual — espaciais</title>
<style>
  :root { color-scheme: light; }
  body { background:#fff; color:#111; font:16px/1.5 system-ui, sans-serif; margin:0 auto; padding:32px; max-width:1100px; }
  h1 { margin:0 0 4px; } h2 { margin:40px 0 8px; border-bottom:2px solid #111; padding-bottom:4px; }
  .lead { color:#555; margin:0 0 24px; }
  .q { border:1px solid #ddd; border-radius:8px; padding:16px; margin:16px 0; }
  .meta { font:13px ui-monospace, monospace; color:#666; margin:0 0 8px; }
  .stem { font-weight:600; margin:0 0 12px; }
  .enunciado svg { max-width:100%; height:auto; max-height:200px; display:block; margin-bottom:16px; }
  .opts { display:flex; gap:12px; flex-wrap:wrap; }
  .opt { margin:0; border:2px solid #ddd; border-radius:8px; padding:8px; width:120px; text-align:center; }
  .opt.correta { border-color:#111; background:#f4f4f4; }
  .opt svg { width:100px; height:100px; display:block; }
  figcaption { font:13px ui-monospace, monospace; margin-top:4px; }
  details { margin-top:12px; font-size:14px; color:#444; }
  .grade { border-collapse:collapse; margin:16px 0 32px; font:14px system-ui, sans-serif; }
  .grade th, .grade td { border:1px solid #ddd; padding:6px 12px; text-align:center; }
  .grade th.lin { text-align:left; font:13px ui-monospace, monospace; }
  .grade td.nao { color:#bbb; }
</style></head>
<body>
<h1>Auditoria visual — geradores espaciais</h1>
<p class="lead">Confira contra as provas reais: uma matriz de arcos tem de parecer com a imagem de referência da grade 3×3, uma série de ponteiros com a do mostrador. O gabarito está destacado. Confira se a alternativa marcada é de fato a única que satisfaz o enunciado, e se dá para ler a figura em ~18s.</p>
${blocos.join('\n')}
</body></html>`

const saida = resolve(raiz, `.preview/spatial${filtro ? '-' + filtro : ''}.html`)
mkdirSync(dirname(saida), { recursive: true })
writeFileSync(saida, html, 'utf8')
console.log(`preview gerado: ${saida}`)
