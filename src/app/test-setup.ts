import '@testing-library/jest-dom/vitest'

/**
 * jsdom não implementa o diálogo modal nativo.
 *
 * O `<dialog>` de verdade é justamente o motivo de a `<Confirmacao>` não ter
 * armadilha de foco escrita à mão — então não faz sentido degradar o
 * componente para caber no ambiente de teste. O que falta é do jsdom, e é aqui
 * que se remenda: um `showModal` que faz o mínimo observável (abre, marca
 * `open`) para que as asserções de visibilidade e de fluxo tenham o que ler.
 */
const proto = globalThis.HTMLDialogElement?.prototype

if (proto && !proto.showModal) {
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  proto.show = function show(this: HTMLDialogElement) {
    this.open = true
  }
  proto.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

/**
 * Atrito entre ambientes, não defeito do app.
 *
 * O router de dados monta um `Request` a cada navegação. O `AbortSignal` que o
 * jsdom fornece é de outra implementação, e o `Request` do Node o recusa em
 * tempo de execução — a navegação morre numa rejeição não tratada e o teste vê
 * a tela anterior. Um `Request` inerte basta: o app não lê nada dele.
 */
class RequestDeTeste {
  readonly url: string
  readonly method: string
  readonly signal: AbortSignal
  readonly headers: Headers

  constructor(url: string | URL, init: RequestInit = {}) {
    this.url = String(url)
    this.method = init.method ?? 'GET'
    this.signal = init.signal ?? new AbortController().signal
    this.headers = new Headers(init.headers)
  }
}

Object.defineProperty(globalThis, 'Request', {
  value: RequestDeTeste,
  writable: true,
  configurable: true,
})

/**
 * Mais lacunas do jsdom, não do app.
 *
 * `matchMedia` e `scrollIntoView` não existem ali. A tela de questão usa as
 * duas — a primeira para respeitar `prefers-reduced-motion`, a segunda para
 * trazer a explicação para a vista — e sem elas o componente estoura no
 * efeito, o que aparece como "elemento não encontrado" em testes que não têm
 * nada a ver com rolagem.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
