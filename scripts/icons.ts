import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

/**
 * Gera ícone, splash e favicon a partir de UMA fonte: este arquivo.
 *
 * Nenhum binário de design entra no repositório. O desenho é o mostrador que o
 * app inteiro é sobre — um disco de tinta com a fatia já gasta removida. Duas
 * formas, nenhum texto: é o que sobrevive a 48px na gaveta de apps, e é o que
 * o ícone adaptativo do Android pode recortar em círculo sem perder nada.
 *
 * Executar com `npm run icons`.
 */

const TINTA = '#0d0d0c'
const PAPEL = '#ffffff'
const PAPEL_FUNDO = '#f4f2ed'

/**
 * O mostrador, centrado em (0,0) num viewBox de lado `lado`.
 *
 * `fracaoGasta` é quanto do disco já foi consumido — a fatia clara. 0.375
 * (135°) é o ponto em que a leitura "isto é um cronômetro" é imediata: menos
 * vira um disco, mais vira um Pac-Man.
 */
function mostrador(lado: number, raio: number, corFatia: string): string {
  const c = lado / 2
  const fracaoGasta = 0.375
  const anguloFim = -Math.PI / 2 + fracaoGasta * 2 * Math.PI
  const x = c + raio * Math.cos(anguloFim)
  const y = c + raio * Math.sin(anguloFim)
  const arcoGrande = fracaoGasta > 0.5 ? 1 : 0

  return [
    `<circle cx="${c}" cy="${c}" r="${raio}" fill="${TINTA}"/>`,
    `<path d="M${c} ${c} L${c} ${c - raio} A${raio} ${raio} 0 ${arcoGrande} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z" fill="${corFatia}"/>`,
  ].join('')
}

function svg(lado: number, fundo: string | null, raio: number, corFatia: string): string {
  const campo = fundo ? `<rect width="${lado}" height="${lado}" fill="${fundo}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">${campo}${mostrador(lado, raio, corFatia)}</svg>`
}

const png = (markup: string, destino: string, lado: number) =>
  sharp(Buffer.from(markup)).resize(lado, lado).png().toFile(destino)

async function main(): Promise<void> {
  mkdirSync('assets', { recursive: true })
  mkdirSync('public', { recursive: true })

  // --- fontes para o @capacitor/assets ---------------------------------------
  // O primeiro plano fica menor porque o Android recorta o ícone adaptativo:
  // só os 66% centrais são garantidos em qualquer formato de máscara.
  await png(svg(1024, PAPEL_FUNDO, 300, PAPEL_FUNDO), 'assets/icon.png', 1024)
  await png(svg(1024, null, 240, PAPEL_FUNDO), 'assets/icon-foreground.png', 1024)
  await png(svg(1024, PAPEL_FUNDO, 0, PAPEL_FUNDO), 'assets/icon-background.png', 1024)
  await png(svg(2732, PAPEL, 260, PAPEL), 'assets/splash.png', 2732)

  // --- ícones da PWA ---------------------------------------------------------
  await png(svg(1024, PAPEL_FUNDO, 300, PAPEL_FUNDO), 'public/pwa-192.png', 192)
  await png(svg(1024, PAPEL_FUNDO, 300, PAPEL_FUNDO), 'public/pwa-512.png', 512)
  // Maskable: a máscara do sistema come até 20% de cada borda, então o
  // mostrador encolhe para caber no círculo inscrito.
  await png(svg(1024, PAPEL_FUNDO, 230, PAPEL_FUNDO), 'public/pwa-maskable-512.png', 512)
  await png(svg(1024, PAPEL_FUNDO, 300, PAPEL_FUNDO), 'public/apple-touch-icon.png', 180)

  writeFileSync('public/favicon.svg', svg(64, PAPEL_FUNDO, 26, PAPEL_FUNDO))

  console.log('ícones gerados em assets/ e public/')
}

void main()
