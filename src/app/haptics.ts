import { Capacitor } from '@capacitor/core'

/**
 * Feedback tátil, com degradação silenciosa.
 *
 * Três ambientes, um contrato: nativo usa o plugin do Capacitor, Android web
 * usa `navigator.vibrate`, e o resto (desktop, Safari iOS) não faz nada. O
 * import do plugin é dinâmico para não entrar no bundle da web.
 *
 * Só o treino vibra. Vibrar no simulado entregaria o gabarito — informação que
 * a prova real não dá.
 */
export type Toque = 'toque' | 'acerto' | 'erro'

const PADRAO_WEB: Record<Toque, number | number[]> = {
  toque: 10,
  acerto: [0, 40],
  erro: [0, 60, 40, 60],
}

export async function tocar(tipo: Toque): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
      if (tipo === 'toque') await Haptics.impact({ style: ImpactStyle.Light })
      else if (tipo === 'acerto') await Haptics.notification({ type: NotificationType.Success })
      else await Haptics.notification({ type: NotificationType.Error })
      return
    }
    navigator.vibrate?.(PADRAO_WEB[tipo])
  } catch {
    // Háptico é enfeite funcional: falhar aqui não pode interromper a prova.
  }
}
