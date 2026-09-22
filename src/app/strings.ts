import type { Locale } from '../core/i18n'

/**
 * Catálogo de strings da interface.
 *
 * Um objeto por idioma com as MESMAS chaves — o tipo `Strings` é derivado do
 * inglês, então esquecer uma chave no português vira erro de compilação em vez
 * de texto faltando na tela.
 *
 * Valores com `{placeholder}` são interpolados por `formatString`.
 */

const en = {
  // navegação e chrome
  'nav.home': 'Home',
  'nav.drill': 'Practice',
  'nav.progress': 'Progress',
  'nav.theory': 'Theory',
  'brand': 'CCAT Trainer',
  'lang.label': 'Language',

  // home
  'home.title': 'The test races the clock. So does the practice.',
  'home.lead':
    'The CCAT gives you 15 minutes for 50 questions and almost nobody finishes. Everything here is timed, and at the end you see where you stand against the official norm.',
  'home.format.questions': 'questions',
  'home.format.total': 'in total',
  'home.format.each': 'per question',
  'home.resume.label': 'Test in progress',
  'home.resume.body':
    'You have {time} left. The clock kept running while the app was closed.',
  'home.resume.action': 'Resume',
  'home.resume.discard': 'Discard',
  'home.exam.title': 'Full mock test',
  'home.exam.loading': 'Building the test…',
  'home.exam.body':
    '{count} questions in 15 minutes, types interleaved, difficulty rising. No feedback and no going back, just like the real thing.',
  'home.drill.title': 'Practice by type',
  'home.drill.body':
    'One type at a time, at the 18-second pace, with an explanation right after each answer.',
  'home.theory.title': 'Theory and tactics',
  'home.theory.body': 'The method for each type and the trap the test uses to catch you.',
  'home.error.label': 'Error',
  'home.error.body': 'Could not load the question bank: {message}. Reload the page and try again.',
  'home.recent': 'Recent sessions',
  'home.recent.when': 'When',
  'home.recent.what': 'What',
  'home.recent.correct': 'Correct',
  'home.recent.percentile': 'Percentile',
  'home.recent.exam': 'Mock test',
  'home.recent.drill': 'Practice · {tipo}',
  'home.recent.all': 'See full progress',

  // drill setup
  'drill.crumb': 'Practice',
  'drill.title': 'One type at a time, at test pace',
  'drill.lead':
    '{seconds} seconds per question, the same pace as the CCAT. Run out and the question counts as unanswered and the drill moves on. Explanation right after each answer.',
  'drill.type': 'Type',
  'drill.subtype': 'Subtype',
  'drill.subtype.all': 'All',
  'drill.count': 'How many questions',
  'drill.available': '{count} questions available in this combination',
  'drill.availableShort': ' — the drill will have {count}',
  'drill.start': 'Start practice',
  'drill.loading': 'Loading the question bank…',
  'drill.error': 'Could not load the bank: {message}',
  'drill.empty.title': 'Nothing to practise here',
  'drill.empty.body': 'No question in the bank matches this type and subtype yet. Pick another combination.',
  'drill.notEnough': 'There are not enough questions for that combination.',

  // sessão
  'session.finish': 'End',
  'session.skip': 'Skip this question',
  'session.next': 'Next',
  'session.correct': 'Correct',
  'session.incorrect': 'Incorrect',
  'session.reviewTheory': 'Review the theory: {subtipo}',
  'session.ended': 'Session ended',
  'session.scoring': 'Working out your result…',
  'session.figure.stem': 'Figure in the question',
  'session.figure.option': 'Option {letter}',
  'session.announce.time': '{time} left',
  'session.options.label': 'Options',
  'session.timeLeft': 'Time left: {time}',

  // resultado
  'result.crumb.exam': 'Full mock test',
  'result.crumb.drill': 'Practice by type',
  'result.headline.exam': 'correct out of {reached} answered, in {duration}.',
  'result.headline.drill': 'correct out of {reached} questions, in {duration}.',
  'result.reached': 'Reached within the time',
  'result.reached.timedOut': '{count} ran out',
  'result.accuracy': 'Accuracy on what you reached',
  'result.avgTime': 'Average time per question',
  'result.pace.ok': 'on pace',
  'result.pace.target': 'target {time}',
  'chart.mean': 'MEAN',
  'chart.alt.point':
    'Your score of {raw} correct on the CCAT distribution, estimated percentile {percentile}. The mean is {mean}.',
  'chart.alt.range':
    'Projection between {low} and {high} correct on the CCAT distribution. The mean is {mean}.',
  'chart.alt.trend': 'Correct answers per mock test, oldest to most recent: {valores}. CCAT mean: {mean}.',
  'chart.you': 'YOU',
  'chart.first': '1st',
  'chart.nth': '{n}th',
  'result.placement': 'Where that puts you',
  'result.projection': 'Where this pace would put you',
  'result.projection.lead':
    'You stopped after {reached} of {total} questions, so this is not a CCAT score yet \u2014 the raw score counts how many you get right in the full 15 minutes. At this pace and accuracy, a full run would land here.',
  'result.projection.score': 'Projected score',
  'result.projection.range': 'between {low} and {high}',
  'result.projection.reached': 'Questions this pace reaches',
  'result.projection.reached.note': 'in 15 minutes, at {time} each',
  'result.projection.percentile': 'Projected percentile',
  'result.projection.caveat.label': 'Read the range, not the midpoint',
  'result.projection.caveat.body':
    'Two things widen it. {reached} questions is a small sample: the true accuracy behind {accuracy} sits anywhere between {low} and {high}. And the questions you did not reach are the harder ones \u2014 difficulty rises through the test \u2014 so the real figure tends toward the low end. Finish a full 15 minutes to replace this with a measurement.',
  'result.placement.legend':
    'The shaded area is the slice of candidates you are ahead of: percentile {percentile}.',
  'result.placement.toP80': ' {count} more correct answers would reach the 80th percentile.',
  'result.placement.atP80': ' You are already above the 80th percentile.',
  'result.estimate.label': 'The percentile is an estimate',
  'result.estimate.body':
    'It comes from the official CCAT norm (mean {mean}, standard deviation {sd}) converted by a normal approximation — Criteria does not publish the percentile table. In the tails, where the curve is flat, a few answers shift the number a lot. Treat it as a trajectory, not a cut-off.',
  'result.byType': 'By type',
  'result.table.type': 'Type',
  'result.table.correct': 'Correct',
  'result.table.accuracy': 'Accuracy',
  'result.table.time': 'Time',
  'result.table.bar': 'Accuracy bar',
  'result.weakest': 'Weakest area this session: {tipo}.',
  'result.weakest.theory': 'Review the theory',
  'result.weakest.drill': 'practise just that type',
  'result.even': 'Performance was even across types — no weak spot to single out this session.',
  'result.timeout.label': 'The clock cut you off',
  'result.timeout.body':
    'The test stopped at {reached} questions. That is common on the CCAT — but every question you did not reach is a correct answer you never had the chance to mark. The target is {time} per question.',
  'result.abandoned.label': 'You ended early',
  'result.abandoned.body':
    'That was {reached} of {total} questions. Accuracy and pace above are real; the projection is not a measurement. Run the full 15 minutes to get a score you can compare.',
  'result.empty.title': 'Nothing to show',
  'result.empty.lead':
    'This screen appears when you finish a session. Reloading the page clears the result from memory — but it is still saved in your progress.',
  'result.again': 'New mock test',
  'result.home': 'Home',
  'result.progress': 'See progress',

  // progresso
  'progress.title': 'Progress',
  'progress.loading': 'Loading history…',
  'progress.error': 'Could not read your history: {message}',
  'progress.empty': 'No sessions recorded yet.',
  'progress.empty.action': 'Take your first mock test',
  'progress.lead': '{exams} and {drills} recorded.',
  'progress.lead.exams.one': '1 mock test',
  'progress.lead.exams.other': '{count} mock tests',
  'progress.lead.drills.one': '1 practice session',
  'progress.lead.drills.other': '{count} practice sessions',
  'progress.headline': 'correct on your last mock test, estimated percentile {percentile}.',
  'progress.headline.delta.up': ' Up {count} since the first.',
  'progress.headline.delta.down': ' Down {count} since the first.',
  'progress.chart': 'Score per mock test',
  'progress.chart.legend':
    'Oldest to most recent, complete runs only. A test you ended early is not a score that compares to the norm, so it is left out of the trend.',
  'progress.partial': 'partial',
  'progress.partial.note':
    'Left out of the chart: {count} run(s) you ended early. A partial run has no score that compares to the norm.',
  'progress.table.when': 'When',
  'progress.table.correct': 'Correct',
  'progress.table.reached': 'Reached',
  'progress.table.percentile': 'Percentile',
  'progress.table.perQuestion': 'Per question',
  'progress.byType': 'Accuracy by type',
  'progress.byType.legend': 'Across every session — mock tests and practice.',
  'progress.table.questions': 'Questions',
  'progress.weak.notEnough':
    'Take a few more sessions for the per-type diagnosis to be reliable — with few questions, low accuracy is noise.',
  'progress.weak.even': 'Performance is even across types.',
  'progress.weak.body': 'Your weakest type is {tipo} ({accuracy} over {count} questions).',
  'progress.weak.drill': 'Practise just that type',
  'progress.weak.theory': 'review the theory',

  // teoria
  'theory.crumb': 'Theory',
  'theory.title': 'The method for each type, and each one’s trap',
  'theory.lead':
    'Written to be read in a minute, not an afternoon. Each type carries the step-by-step that solves it and the mistake the test wants to induce.',
  'theory.pace': 'Pace',
  'theory.method': 'Method',
  'theory.trap': 'The trap',
  'theory.practise': 'Practise {tipo}',
  'theory.others': 'Other types',
  'theory.notFound': 'Type not found',
  'theory.notFound.lead': 'The address points to a type that does not exist.',
  'theory.seeAll': 'See all types',

  // 404
  // comuns
  'common.retry': 'Try again',
  'common.cancel': 'Cancel',

  // confirmações destrutivas
  'confirm.abandon.title': 'End the test now?',
  'confirm.abandon.body':
    'You will be scored on what you answered so far. The clock keeps running while this message is open.',
  'confirm.abandon.yes': 'End the test',
  'confirm.abandon.no': 'Keep going',
  'confirm.discard.title': 'Discard the test in progress?',
  'confirm.discard.body':
    'The questions you already answered are lost and the clock is not recoverable.',
  'confirm.discard.yes': 'Discard',
  'confirm.discard.no': 'Keep it',

  // armazenamento indisponível
  'storage.blocked.label': 'Nothing is being saved',
  'storage.blocked.body':
    'Your browser is blocking local storage — private window or blocked site data. The test works, but the result will not be recorded and questions may repeat.',

  // falha de render
  'crash.title': 'Something broke',
  'crash.lead': 'The app hit an error it could not recover from on its own.',
  'crash.action': 'Reload the app',

  'notFound.title': 'Page not found',
  'notFound.lead': 'The address you opened does not exist in this app.',
  'notFound.action': 'Back to home',
}

export type StringKey = keyof typeof en

const pt: Record<StringKey, string> = {
  'nav.home': 'Início',
  'nav.drill': 'Treinar',
  'nav.progress': 'Evolução',
  'nav.theory': 'Teoria',
  'brand': 'CCAT Trainer',
  'lang.label': 'Idioma',

  'home.title': 'A prova é contra o relógio. O treino também.',
  'home.lead':
    'A CCAT dá 15 minutos para 50 questões e quase ninguém termina. Aqui tudo é cronometrado, e no fim você vê onde está contra a norma oficial.',
  'home.format.questions': 'questões',
  'home.format.total': 'no total',
  'home.format.each': 'por questão',
  'home.resume.label': 'Simulação em andamento',
  'home.resume.body': 'Restam {time}. O relógio não parou enquanto o app esteve fechado.',
  'home.resume.action': 'Retomar',
  'home.resume.discard': 'Descartar',
  'home.exam.title': 'Simulação completa',
  'home.exam.loading': 'Montando a prova…',
  'home.exam.body':
    '{count} questões em 15 minutos, tipos intercalados, dificuldade crescente. Sem feedback e sem voltar, como na prova.',
  'home.drill.title': 'Prática por tipo',
  'home.drill.body':
    'Um tipo só, no ritmo de 18 segundos, com explicação logo após cada resposta.',
  'home.theory.title': 'Teoria e macetes',
  'home.theory.body': 'O método de cada tipo e a armadilha que a prova usa para derrubar você.',
  'home.error.label': 'Erro',
  'home.error.body':
    'Não consegui carregar o banco de questões: {message}. Recarregue a página e tente de novo.',
  'home.recent': 'Últimas sessões',
  'home.recent.when': 'Quando',
  'home.recent.what': 'O quê',
  'home.recent.correct': 'Acertos',
  'home.recent.percentile': 'Percentil',
  'home.recent.exam': 'Simulação',
  'home.recent.drill': 'Treino · {tipo}',
  'home.recent.all': 'Ver a evolução completa',

  'drill.crumb': 'Treinar',
  'drill.title': 'Um tipo de cada vez, no ritmo da prova',
  'drill.lead':
    '{seconds} segundos por questão, o mesmo ritmo da CCAT. Estourou, a questão conta como não respondida e o treino segue. Explicação logo após cada resposta.',
  'drill.type': 'Tipo',
  'drill.subtype': 'Subtipo',
  'drill.subtype.all': 'Todos',
  'drill.count': 'Quantas questões',
  'drill.available': '{count} questões disponíveis nessa combinação',
  'drill.availableShort': ' — o treino terá {count}',
  'drill.start': 'Começar treino',
  'drill.loading': 'Carregando o banco de questões…',
  'drill.error': 'Não consegui carregar o banco: {message}',
  'drill.empty.title': 'Nada para treinar aqui',
  'drill.empty.body': 'Nenhuma questão do banco combina com este tipo e subtipo ainda. Escolha outra combinação.',
  'drill.notEnough': 'Não há questões suficientes para essa combinação.',

  'session.finish': 'Encerrar',
  'session.skip': 'Pular esta questão',
  'session.next': 'Próxima',
  'session.correct': 'Correto',
  'session.incorrect': 'Incorreto',
  'session.reviewTheory': 'Revisar a teoria: {subtipo}',
  'session.ended': 'Sessão encerrada',
  'session.scoring': 'Apurando o resultado…',
  'session.figure.stem': 'Figura do enunciado',
  'session.figure.option': 'Alternativa {letter}',
  'session.announce.time': 'faltam {time}',
  'session.options.label': 'Alternativas',
  'session.timeLeft': 'Tempo restante: {time}',

  'result.crumb.exam': 'Simulação completa',
  'result.crumb.drill': 'Treino por tipo',
  'result.headline.exam': 'acertos de {reached} respondidas, em {duration}.',
  'result.headline.drill': 'acertos em {reached} questões, em {duration}.',
  'result.reached': 'Alcançadas dentro do tempo',
  'result.reached.timedOut': '{count} por estouro',
  'result.accuracy': 'Acurácia sobre as alcançadas',
  'result.avgTime': 'Tempo médio por questão',
  'result.pace.ok': 'dentro do ritmo',
  'result.pace.target': 'alvo {time}',
  'chart.mean': 'MÉDIA',
  'chart.alt.point':
    'Sua pontuação de {raw} acertos na distribuição da CCAT, percentil estimado {percentile}. A média é {mean}.',
  'chart.alt.range':
    'Projeção entre {low} e {high} acertos na distribuição da CCAT. A média é {mean}.',
  'chart.alt.trend': 'Acertos por simulação, da mais antiga à mais recente: {valores}. Média da CCAT: {mean}.',
  'chart.you': 'VOCÊ',
  'chart.first': '1ª',
  'chart.nth': '{n}ª',
  'result.placement': 'Onde isso te coloca',
  'result.projection': 'Onde este ritmo te colocaria',
  'result.projection.lead':
    'Voc\u00ea parou em {reached} de {total} quest\u00f5es, ent\u00e3o isto ainda n\u00e3o \u00e9 um score de CCAT \u2014 o score bruto conta quantas voc\u00ea acerta nos 15 minutos inteiros. Mantido este ritmo e esta acur\u00e1cia, a prova completa cairia aqui.',
  'result.projection.score': 'Score projetado',
  'result.projection.range': 'entre {low} e {high}',
  'result.projection.reached': 'Quest\u00f5es que este ritmo alcan\u00e7a',
  'result.projection.reached.note': 'em 15 minutos, a {time} cada',
  'result.projection.percentile': 'Percentil projetado',
  'result.projection.caveat.label': 'Leia a faixa, n\u00e3o o meio',
  'result.projection.caveat.body':
    'Duas coisas alargam a faixa. {reached} quest\u00f5es s\u00e3o uma amostra pequena: a acur\u00e1cia real por tr\u00e1s dos {accuracy} pode estar em qualquer lugar entre {low} e {high}. E as quest\u00f5es que voc\u00ea n\u00e3o alcan\u00e7ou s\u00e3o as mais dif\u00edceis \u2014 a dificuldade sobe ao longo da prova \u2014 ent\u00e3o o n\u00famero real tende ao p\u00e9 da faixa. Fa\u00e7a os 15 minutos inteiros para trocar isto por uma medi\u00e7\u00e3o.',
  'result.placement.legend':
    'A área escura é a fatia de candidatos que você ultrapassou: percentil {percentile}.',
  'result.placement.toP80': ' Faltam {count} acertos para chegar ao percentil 80.',
  'result.placement.atP80': ' Você já está acima do percentil 80.',
  'result.estimate.label': 'O percentil é estimativa',
  'result.estimate.body':
    'Ele vem da norma oficial da CCAT (média {mean}, desvio-padrão {sd}) convertida por aproximação normal — a Criteria não publica a tabela de percentis. Nas caudas, onde a curva é rasa, poucos acertos deslocam muito o número. Use como trajetória, não como nota de corte.',
  'result.byType': 'Por tipo',
  'result.table.type': 'Tipo',
  'result.table.correct': 'Acertos',
  'result.table.accuracy': 'Acurácia',
  'result.table.time': 'Tempo',
  'result.table.bar': 'Barra de acurácia',
  'result.weakest': 'Ponto mais fraco desta sessão: {tipo}.',
  'result.weakest.theory': 'Rever a teoria',
  'result.weakest.drill': 'treinar só esse tipo',
  'result.even':
    'Desempenho parelho entre os tipos — não dá para eleger um ponto fraco nesta sessão.',
  'result.timeout.label': 'O relógio te cortou',
  'result.timeout.body':
    'A prova parou em {reached} questões. Na CCAT isso é comum — mas cada questão não alcançada é um acerto que você não teve chance de marcar. O alvo é {time} por questão.',
  'result.abandoned.label': 'Você encerrou antes',
  'result.abandoned.body':
    'Foram {reached} de {total} questões. A acurácia e o ritmo acima são reais; a projeção não é medição. Faça os 15 minutos inteiros para ter um score comparável.',
  'result.empty.title': 'Nenhum resultado para mostrar',
  'result.empty.lead':
    'Esta tela aparece ao terminar uma sessão. Recarregar a página apaga o resultado da memória — mas ele continua salvo na sua evolução.',
  'result.again': 'Novo simulado',
  'result.home': 'Início',
  'result.progress': 'Ver evolução',

  'progress.title': 'Evolução',
  'progress.loading': 'Carregando histórico…',
  'progress.error': 'Não foi possível ler seu histórico: {message}',
  'progress.empty': 'Nenhuma sessão registrada ainda.',
  'progress.empty.action': 'Fazer a primeira simulação',
  'progress.lead': '{exams} e {drills} registrados.',
  'progress.lead.exams.one': '1 simulação',
  'progress.lead.exams.other': '{count} simulações',
  'progress.lead.drills.one': '1 treino',
  'progress.lead.drills.other': '{count} treinos',
  'progress.headline': 'acertos na última simulação, percentil estimado {percentile}.',
  'progress.headline.delta.up': ' Subiu {count} desde a primeira.',
  'progress.headline.delta.down': ' Caiu {count} desde a primeira.',
  'progress.chart': 'Score por simulação',
  'progress.chart.legend':
    'Da mais antiga à mais recente, só simulações completas. Prova encerrada no meio não tem score comparável à norma, então fica fora da tendência.',
  'progress.partial': 'parcial',
  'progress.partial.note':
    '{count} simulação interrompida ficou fora do gráfico: prova encerrada no meio não tem score comparável.',
  'progress.table.when': 'Quando',
  'progress.table.correct': 'Acertos',
  'progress.table.reached': 'Alcançadas',
  'progress.table.percentile': 'Percentil',
  'progress.table.perQuestion': 'Por questão',
  'progress.byType': 'Acurácia por tipo',
  'progress.byType.legend': 'Acumulado de todas as sessões — simulações e treinos.',
  'progress.table.questions': 'Questões',
  'progress.weak.notEnough':
    'Faça mais algumas sessões para o diagnóstico por tipo ficar confiável — com poucas questões, uma acurácia baixa é ruído.',
  'progress.weak.even': 'Desempenho parelho entre os tipos.',
  'progress.weak.body': 'Seu tipo mais fraco é {tipo} ({accuracy} em {count} questões).',
  'progress.weak.drill': 'Treinar só esse tipo',
  'progress.weak.theory': 'rever a teoria',

  'theory.crumb': 'Teoria',
  'theory.title': 'O método de cada tipo, e a armadilha de cada um',
  'theory.lead':
    'Escrito para ser lido em um minuto, não numa tarde. Cada tipo traz o passo a passo que resolve e o erro que a prova quer induzir.',
  'theory.pace': 'Ritmo',
  'theory.method': 'Método',
  'theory.trap': 'A armadilha',
  'theory.practise': 'Treinar {tipo}',
  'theory.others': 'Outros tipos',
  'theory.notFound': 'Tipo não encontrado',
  'theory.notFound.lead': 'O endereço aponta para um tipo que não existe.',
  'theory.seeAll': 'Ver todos os tipos',

  // comuns
  'common.retry': 'Tentar de novo',
  'common.cancel': 'Cancelar',

  // confirmações destrutivas
  'confirm.abandon.title': 'Encerrar a prova agora?',
  'confirm.abandon.body':
    'Você será pontuado pelo que respondeu até aqui. O relógio continua correndo enquanto esta mensagem estiver aberta.',
  'confirm.abandon.yes': 'Encerrar a prova',
  'confirm.abandon.no': 'Continuar',
  'confirm.discard.title': 'Descartar a prova em andamento?',
  'confirm.discard.body':
    'As questões já respondidas se perdem e o relógio não é recuperável.',
  'confirm.discard.yes': 'Descartar',
  'confirm.discard.no': 'Manter',

  // armazenamento indisponível
  'storage.blocked.label': 'Nada está sendo salvo',
  'storage.blocked.body':
    'Seu navegador está bloqueando o armazenamento local — aba anônima ou dados do site bloqueados. A prova funciona, mas o resultado não será gravado e questões podem repetir.',

  // falha de render
  'crash.title': 'Algo quebrou',
  'crash.lead': 'O app encontrou um erro do qual não conseguiu se recuperar sozinho.',
  'crash.action': 'Recarregar o app',

  'notFound.title': 'Página não encontrada',
  'notFound.lead': 'O endereço que você abriu não existe neste app.',
  'notFound.action': 'Voltar ao início',
}

export const STRINGS: Record<Locale, Record<StringKey, string>> = { en, pt }

/** Substitui `{chave}` pelos valores dados. */
export function formatString(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (inteiro, chave: string) =>
    chave in vars ? String(vars[chave]) : inteiro,
  )
}
