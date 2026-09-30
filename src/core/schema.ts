import { z } from 'zod'
import { ALL_SUBTIPOS, DIFFICULTIES, TIPOS } from './taxonomy'
import { LOCALES } from './i18n'

/**
 * Texto que existe nos dois idiomas.
 *
 * O ENUNCIADO é string simples e sempre em inglês (a prova é em inglês); o que
 * EXPLICA é traduzido, porque entender o erro é mais rápido na própria língua
 * e isso não interfere na medição.
 */
export const localizedTextSchema = z.object(
  Object.fromEntries(LOCALES.map((l) => [l, z.string().min(1)])) as {
    en: z.ZodString
    pt: z.ZodString
  },
)

/**
 * Schema do banco de questões (PRD §4.8).
 *
 * Usado no gate G1, na promoção e na leitura pelo app — uma questão que não
 * valida aqui não existe para o sistema.
 */

export const tipoSchema = z.enum(TIPOS)
export const subtipoSchema = z.enum(ALL_SUBTIPOS as [string, ...string[]])
export const difficultySchema = z.union(
  DIFFICULTIES.map((d) => z.literal(d)) as [
    z.ZodLiteral<1>,
    z.ZodLiteral<2>,
    z.ZodLiteral<3>,
    z.ZodLiteral<4>,
    z.ZodLiteral<5>,
  ],
)

/**
 * Descrição declarativa de uma figura espacial. O renderer transforma isso em
 * SVG; o gerador é quem a produz, a partir de uma seed.
 */
export const spatialSpecSchema = z.object({
  /** viewBox; todas as coordenadas são relativas a ele */
  width: z.number().positive(),
  height: z.number().positive(),
  shapes: z
    .array(
      z.object({
        kind: z.enum(['polygon', 'circle', 'rect', 'line', 'path']),
        points: z.array(z.number()).optional(),
        cx: z.number().optional(),
        cy: z.number().optional(),
        r: z.number().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        w: z.number().optional(),
        h: z.number().optional(),
        d: z.string().optional(),
        fill: z.string().optional(),
        stroke: z.string().optional(),
        strokeWidth: z.number().optional(),
        /** rotação em graus, aplicada em torno do centro do viewBox */
        /**
         * Deslocamento do shape. Existe para o layout empilhar figuras de
         * 100×100 numa sequência ou matriz sem reescrever coordenadas — em
         * particular sem reparsear o `d` de um path.
         */
        dx: z.number().optional(),
        dy: z.number().optional(),
      }),
    )
    .min(1),
})

export type SpatialSpec = z.infer<typeof spatialSpecSchema>

/**
 * Tabela do enunciado, em texto — nunca imagem: o leitor de tela precisa ler
 * célula por célula, e o gate precisa comparar o conteúdo.
 *
 *  - 'dados':      a tabela numérica da leitura de tabela. A primeira coluna é
 *                  o rótulo da linha; as demais são números já formatados, com
 *                  a unidade no cabeçalho ("Sales ($)") para a célula caber
 *                  estreita no celular.
 *  - 'comparacao': as duas colunas lado a lado da atenção a detalhes. A
 *                  primeira coluna é o número da linha, que é como as
 *                  alternativas se referem a ela ("1 and 3").
 *
 * Nos dois layouts a primeira célula de cada linha é cabeçalho de linha
 * (`<th scope="row">`), e toda linha tem uma célula por coluna.
 */
export const stemTableSchema = z
  .object({
    layout: z.enum(['dados', 'comparacao']),
    /** título curto do que a tabela mostra; vira o <caption> */
    caption: z.string().min(1).optional(),
    columns: z.array(z.string().min(1)).min(2).max(5),
    rows: z.array(z.array(z.string().min(1))).min(2).max(8),
  })
  .refine((t) => t.rows.every((r) => r.length === t.columns.length), {
    message: 'toda linha da tabela precisa ter uma célula por coluna',
    path: ['rows'],
  })

export type StemTable = z.infer<typeof stemTableSchema>

export const optionSchema = z
  .object({
    id: z.string().min(1),
    /** alternativa textual (verbal / matemática) */
    text: z.string().min(1).optional(),
    /** alternativa gráfica (espacial) */
    spatial: spatialSpecSchema.optional(),
  })
  .refine((o) => Boolean(o.text) !== Boolean(o.spatial), {
    message: 'alternativa deve ter exatamente um de: text, spatial',
  })

export type QuestionOption = z.infer<typeof optionSchema>

export const verificationSchema = z.object({
  method: z.enum(['rule', 'solver', 'second-model']),
  /** 'rule': seed + gerador que reproduzem a questão */
  seed: z.number().int().optional(),
  generator: z.string().min(1).optional(),
  /** 'solver': expressão canônica avaliada pelo gate */
  expression: z.string().min(1).optional(),
  /** 'second-model': identificação do modelo revisor e o que ele respondeu */
  model: z.string().min(1).optional(),
  modelAnswerId: z.string().min(1).optional(),
  checkedAt: z.string().datetime().optional(),
})

export type Verification = z.infer<typeof verificationSchema>

export const questionSchema = z
  .object({
    id: z.string().min(1),
    tipo: tipoSchema,
    subtipo: subtipoSchema,
    difficulty: difficultySchema,
    stem: z.string().min(1),
    /** enunciado gráfico opcional (série de formas, matriz) */
    stemSpatial: spatialSpecSchema.optional(),
    /** tabela opcional acima do enunciado (leitura de tabela, comparação de colunas) */
    stemTable: stemTableSchema.optional(),
    options: z.array(optionSchema).min(4).max(5),
    answerId: z.string().min(1),
    explanation: localizedTextSchema,
    /** aponta para content/theory/<tipo>.md#<ancora> */
    theoryRef: z.string().min(1),
    /**
     * 'official-sample': publicada pela própria Criteria. 'imported': tirada de
     * material de preparação na web. As duas carregam `source`.
     */
    origin: z.enum(['claude-code', 'official-sample', 'imported']),
    source: z.object({ name: z.string().min(1), url: z.string().url() }).optional(),
    status: z.enum(['draft', 'approved', 'rejected']),
    verification: verificationSchema,
    createdAt: z.string().datetime(),
  })
  // Integridade estrutural: essas nunca podem passar, nem em draft.
  .refine((q) => q.origin === 'claude-code' || Boolean(q.source), {
    message: 'questão de fora precisa registrar a fonte',
    path: ['source'],
  })
  .refine((q) => q.options.some((o) => o.id === q.answerId), {
    message: 'answerId não corresponde a nenhuma alternativa',
    path: ['answerId'],
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
    message: 'ids de alternativas duplicados',
    path: ['options'],
  })
  .refine(
    (q) => {
      const textos = q.options.map((o) => o.text).filter((t): t is string => Boolean(t))
      return new Set(textos.map(normalizeText)).size === textos.length
    },
    { message: 'alternativas textuais duplicadas', path: ['options'] },
  )

export type Question = z.infer<typeof questionSchema>

/** Questão liberada para o usuário. O app só carrega isto. */
export const approvedQuestionSchema = questionSchema.refine(
  (q) => q.status === 'approved',
  { message: 'questão não aprovada em content/approved', path: ['status'] },
)

export const questionBankSchema = z.array(questionSchema)
export const approvedBankSchema = z.array(approvedQuestionSchema)

/**
 * Normalização usada em comparação de alternativas e no dedup (gate G4):
 * minúsculas, sem acento, sem pontuação, espaços colapsados.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
