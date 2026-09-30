import type { Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'

/**
 * Léxico curado — a fonte de verdade do conteúdo verbal.
 *
 * O conteúdo verbal é em INGLÊS (a CCAT é aplicada em inglês); as explicações
 * do app seguem em português. Auditar ~150 linhas de léxico é viável; auditar
 * 450 questões escritas uma a uma, não — por isso o gerador combina daqui.
 *
 * `cluster` é o mecanismo de segurança: distratores NUNCA saem do mesmo cluster
 * semântico do alvo. Sem isso, um distrator vizinho ("austere" para "lenient")
 * vira uma segunda resposta defensável e a questão fica errada — o tipo de
 * defeito que nenhum schema pega.
 */

export type VocabSubtipo = 'sinonimo' | 'antonimo'

export interface VocabEntry {
  word: string
  level: Difficulty
  /**
   * Em qual subtipo o verbete é cobrado — nunca nos dois. Quando a mesma
   * palavra servia a sinônimo e antônimo, ver "CALM → tranquil" numa questão
   * entregava "CALM → frantic" na outra: as alternativas eram as mesmas, só
   * trocava o gabarito.
   */
  subtipo: VocabSubtipo
  /** classe gramatical: o preenchimento vem da mesma, senão sobra por eliminação */
  pos: 'adj' | 'verb'
  /** agrupamento semântico: distratores vêm sempre de OUTRO cluster */
  cluster: string
  synonyms: string[]
  antonyms: string[]
}

/**
 * Os clusters são largos DE PROPÓSITO.
 *
 * Com clusters finos ("honesty", "truthfulness"), "deceitful" entrava como
 * distrator numa questão de antônimo de CANDID — e é antônimo defensável. Cada
 * fusão abaixo fecha uma ponte real entre dicionários:
 *
 * - `character` junta temperamento, ânimo, esforço, juízo, fala, habilidade e
 *   dano: lethargic↔apathetic, reckless↔imprudent, malicious↔innocuous,
 *   vindictive↔toxic, reticent↔guarded são vizinhos em qualquer tesauro.
 * - `magnitude` junta quantidade, dinheiro, importância e esforço exigido:
 *   frugal↔meager (Collins), trivial↔paltry, herculean↔prodigious.
 * - Verbos: `influence` junta aumentar/reduzir, ajudar/atrapalhar, aprovar/
 *   refutar, elogiar/censurar e acalmar/provocar (bolster↔corroborate,
 *   soothe↔alleviate, endorse↔applaud).
 *
 * Palavras de fronteira que ligariam dois clusters (prudent, generous,
 * charitable, persistent, sensible, prominent, worthless…) ficam fora das
 * listas que alimentam distratores, ou só aparecem como antônimo — antônimos
 * nunca viram preenchimento.
 *
 * Nível 1 já exige pensar (candid, frugal, lucid); nível 5 é vocabulário de
 * GRE (obstreperous, pusillanimous, sagacious).
 */
export const VOCAB: VocabEntry[] = [
  // --- nível 1 ---------------------------------------------------------------
  { word: 'candid', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['frank', 'forthright'], antonyms: ['guarded', 'evasive'] },
  { word: 'frugal', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['thrifty', 'economical'], antonyms: ['extravagant', 'wasteful'] },
  { word: 'lucid', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['clear', 'intelligible'], antonyms: ['muddled', 'incoherent'] },
  { word: 'lenient', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['permissive', 'tolerant'], antonyms: ['strict', 'stern'] },
  { word: 'arduous', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['grueling', 'strenuous'], antonyms: ['effortless', 'undemanding'] },
  { word: 'obstinate', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['stubborn', 'headstrong'], antonyms: ['amenable', 'compliant'] },
  { word: 'vivid', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['graphic', 'lifelike'], antonyms: ['faint', 'hazy'] },
  { word: 'adept', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['skilled', 'proficient'], antonyms: ['unskilled', 'clumsy'] },
  { word: 'naive', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['gullible', 'unworldly'], antonyms: ['worldly', 'sophisticated'] },
  { word: 'lethargic', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['sluggish', 'listless'], antonyms: ['energetic', 'lively'] },
  { word: 'ample', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['plentiful', 'abundant'], antonyms: ['insufficient', 'scant'] },
  { word: 'reluctant', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unwilling', 'hesitant'], antonyms: ['eager', 'willing'] },
  { word: 'feasible', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'credibility', synonyms: ['practicable', 'viable'], antonyms: ['impractical', 'unworkable'] },
  { word: 'impartial', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unbiased', 'neutral'], antonyms: ['biased', 'partisan'] },
  { word: 'cynical', level: 1, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['skeptical', 'distrustful'], antonyms: ['trusting', 'idealistic'] },
  { word: 'hinder', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['impede', 'obstruct'], antonyms: ['assist', 'aid'] },
  { word: 'conceal', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'disclosure', synonyms: ['hide', 'mask'], antonyms: ['reveal', 'disclose'] },
  { word: 'endorse', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['approve', 'champion'], antonyms: ['oppose', 'reject'] },
  { word: 'relinquish', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'possession', synonyms: ['surrender', 'cede'], antonyms: ['retain', 'keep'] },
  { word: 'reprimand', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['scold', 'rebuke'], antonyms: ['praise', 'applaud'] },
  { word: 'soothe', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['comfort', 'pacify'], antonyms: ['agitate', 'irritate'] },
  { word: 'acquire', level: 1, subtipo: 'sinonimo', pos: 'verb', cluster: 'possession', synonyms: ['obtain', 'procure'], antonyms: ['lose', 'surrender'] },

  { word: 'diligent', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['industrious', 'hardworking'], antonyms: ['lazy', 'negligent'] },
  { word: 'trivial', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['insignificant', 'petty'], antonyms: ['crucial', 'weighty'] },
  { word: 'meager', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['scanty', 'sparse'], antonyms: ['plentiful', 'bountiful'] },
  { word: 'tedious', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['monotonous', 'humdrum'], antonyms: ['engrossing', 'riveting'] },
  { word: 'cordial', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['genial', 'gracious'], antonyms: ['hostile', 'unfriendly'] },
  { word: 'concise', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['succinct', 'pithy'], antonyms: ['wordy', 'rambling'] },
  { word: 'timid', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['fearful', 'faint-hearted'], antonyms: ['bold', 'daring'] },
  { word: 'transient', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'duration', synonyms: ['fleeting', 'temporary'], antonyms: ['permanent', 'lasting'] },
  { word: 'arrogant', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['haughty', 'conceited'], antonyms: ['humble', 'modest'] },
  { word: 'obsolete', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['outdated', 'outmoded'], antonyms: ['current', 'up-to-date'] },
  { word: 'hazardous', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['dangerous', 'perilous'], antonyms: ['safe', 'harmless'] },
  { word: 'vague', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'clarity', synonyms: ['unclear', 'imprecise'], antonyms: ['precise', 'definite'] },
  { word: 'tranquil', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['peaceful', 'serene'], antonyms: ['turbulent', 'agitated'] },
  { word: 'reckless', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['rash', 'heedless'], antonyms: ['prudent', 'cautious'] },
  { word: 'plausible', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'credibility', synonyms: ['credible', 'believable'], antonyms: ['implausible', 'far-fetched'] },
  { word: 'eccentric', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['unconventional', 'quirky'], antonyms: ['conventional', 'ordinary'] },
  { word: 'mundane', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['commonplace', 'humdrum'], antonyms: ['extraordinary', 'remarkable'] },
  { word: 'immense', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['vast', 'enormous'], antonyms: ['tiny', 'minute'] },
{ word: 'innovative', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['inventive', 'groundbreaking'], antonyms: ['unoriginal', 'conventional'] },
{ word: 'sturdy', level: 1, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['robust', 'rugged'], antonyms: ['fragile', 'rickety'] },
  { word: 'commend', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['praise', 'applaud'], antonyms: ['criticize', 'condemn'] },
  { word: 'diminish', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['lessen', 'reduce'], antonyms: ['increase', 'enlarge'] },
  { word: 'deter', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['discourage', 'dissuade'], antonyms: ['encourage', 'spur'] },
  { word: 'prolong', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['extend', 'lengthen'], antonyms: ['shorten', 'abbreviate'] },
  { word: 'discard', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'possession', synonyms: ['jettison', 'scrap'], antonyms: ['keep', 'retain'] },
  { word: 'prohibit', level: 1, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['ban', 'forbid'], antonyms: ['permit', 'allow'] },

  // --- nível 2 ---------------------------------------------------------------
  { word: 'ambiguous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['equivocal', 'unclear'], antonyms: ['definite', 'explicit'] },
  { word: 'copious', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['profuse', 'plentiful'], antonyms: ['sparse', 'scanty'] },
  { word: 'zealous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['fervent', 'ardent'], antonyms: ['indifferent', 'halfhearted'] },
  { word: 'meticulous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['thorough', 'painstaking'], antonyms: ['careless', 'sloppy'] },
  { word: 'fickle', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['changeable', 'inconstant'], antonyms: ['steadfast', 'loyal'] },
  { word: 'innocuous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['harmless', 'inoffensive'], antonyms: ['harmful', 'damaging'] },
  { word: 'brisk', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['quick', 'energetic'], antonyms: ['sluggish', 'leisurely'] },
  { word: 'hackneyed', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'novelty', synonyms: ['trite', 'overused'], antonyms: ['original', 'fresh'] },
  { word: 'miserly', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['stingy', 'tightfisted'], antonyms: ['generous', 'openhanded'] },
  { word: 'conspicuous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['noticeable', 'obvious'], antonyms: ['inconspicuous', 'unobtrusive'] },
  { word: 'reticent', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['reserved', 'uncommunicative'], antonyms: ['forthcoming', 'talkative'] },
  { word: 'deft', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['nimble', 'dexterous'], antonyms: ['clumsy', 'awkward'] },
  { word: 'pivotal', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['crucial', 'decisive'], antonyms: ['peripheral', 'minor'] },
  { word: 'placid', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unruffled', 'serene'], antonyms: ['excitable', 'agitated'] },
  { word: 'jovial', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['jolly', 'cheerful'], antonyms: ['glum', 'gloomy'] },
  { word: 'gregarious', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['sociable', 'outgoing'], antonyms: ['reclusive', 'unsociable'] },
  { word: 'prosaic', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'novelty', synonyms: ['unimaginative', 'pedestrian'], antonyms: ['imaginative', 'poetic'] },
  { word: 'perpetual', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'duration', synonyms: ['everlasting', 'unending'], antonyms: ['temporary', 'fleeting'] },
{ word: 'erroneous', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'credibility', synonyms: ['mistaken', 'incorrect'], antonyms: ['accurate', 'correct'] },
{ word: 'colossal', level: 2, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['gigantic', 'mammoth'], antonyms: ['minuscule', 'tiny'] },
  { word: 'facilitate', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['ease', 'smooth'], antonyms: ['hamper', 'obstruct'] },
  { word: 'mitigate', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['alleviate', 'temper'], antonyms: ['worsen', 'intensify'] },
  { word: 'placate', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['appease', 'conciliate'], antonyms: ['antagonize', 'enrage'] },
  { word: 'divulge', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'disclosure', synonyms: ['disclose', 'reveal'], antonyms: ['withhold', 'hide'] },
  { word: 'curtail', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['trim', 'truncate'], antonyms: ['extend', 'lengthen'] },
  { word: 'bolster', level: 2, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['reinforce', 'strengthen'], antonyms: ['weaken', 'sap'] },

  { word: 'amiable', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['affable', 'good-natured'], antonyms: ['surly', 'disagreeable'] },
  { word: 'terse', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['curt', 'clipped'], antonyms: ['wordy', 'long-winded'] },
  { word: 'apathetic', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['indifferent', 'uninterested'], antonyms: ['enthusiastic', 'passionate'] },
  { word: 'judicious', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['wise', 'discerning'], antonyms: ['foolish', 'ill-advised'] },
  { word: 'momentous', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['consequential', 'fateful'], antonyms: ['inconsequential', 'unimportant'] },
  { word: 'docile', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['compliant', 'submissive'], antonyms: ['unruly', 'rebellious'] },
  { word: 'affluent', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['wealthy', 'prosperous'], antonyms: ['impoverished', 'needy'] },
    { word: 'inept', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['incompetent', 'bungling'], antonyms: ['competent', 'capable'] },
  { word: 'detrimental', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['damaging', 'injurious'], antonyms: ['beneficial', 'advantageous'] },
  { word: 'lucrative', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['profitable', 'remunerative'], antonyms: ['unprofitable', 'uneconomic'] },
  { word: 'somber', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['gloomy', 'solemn'], antonyms: ['cheerful', 'lighthearted'] },
    { word: 'incessant', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'duration', synonyms: ['ceaseless', 'unremitting'], antonyms: ['occasional', 'intermittent'] },
{ word: 'chronic', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'duration', synonyms: ['long-standing', 'lingering'], antonyms: ['temporary', 'short-lived'] },
{ word: 'redundant', level: 2, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['superfluous', 'surplus'], antonyms: ['essential', 'indispensable'] },
  { word: 'augment', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['expand', 'boost'], antonyms: ['reduce', 'decrease'] },
  { word: 'refute', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['disprove', 'rebut'], antonyms: ['confirm', 'verify'] },
  { word: 'disparage', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['belittle', 'denigrate'], antonyms: ['acclaim', 'laud'] },
  { word: 'squander', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'possession', synonyms: ['waste', 'fritter'], antonyms: ['conserve', 'preserve'] },
  { word: 'deride', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['ridicule', 'mock'], antonyms: ['praise', 'acclaim'] },
  { word: 'forfeit', level: 2, subtipo: 'antonimo', pos: 'verb', cluster: 'possession', synonyms: ['lose', 'sacrifice'], antonyms: ['gain', 'earn'] },

  // --- nível 3 ---------------------------------------------------------------
  { word: 'cryptic', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['enigmatic', 'mysterious'], antonyms: ['straightforward', 'transparent'] },
  { word: 'noxious', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['poisonous', 'toxic'], antonyms: ['wholesome', 'beneficial'] },
  { word: 'cursory', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['hasty', 'superficial'], antonyms: ['thorough', 'painstaking'] },
  { word: 'volatile', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unstable', 'explosive'], antonyms: ['stable', 'even-tempered'] },
  { word: 'astute', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['shrewd', 'perceptive'], antonyms: ['slow-witted', 'gullible'] },
  { word: 'lavish', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['sumptuous', 'luxurious'], antonyms: ['sparing', 'economical'] },
  { word: 'paramount', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['supreme', 'foremost'], antonyms: ['secondary', 'minor'] },
    { word: 'verbose', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['wordy', 'long-winded'], antonyms: ['succinct', 'pithy'] },
  { word: 'impetuous', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['impulsive', 'hotheaded'], antonyms: ['cautious', 'deliberate'] },
  { word: 'perennial', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'duration', synonyms: ['enduring', 'abiding'], antonyms: ['short-lived', 'transitory'] },
  { word: 'discernible', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['perceptible', 'detectable'], antonyms: ['imperceptible', 'invisible'] },
  { word: 'archaic', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'novelty', synonyms: ['antiquated', 'old-fashioned'], antonyms: ['modern', 'contemporary'] },
  { word: 'tenable', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'credibility', synonyms: ['defensible', 'justifiable'], antonyms: ['indefensible', 'unjustifiable'] },
    { word: 'indolent', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['lazy', 'slothful'], antonyms: ['industrious', 'energetic'] },
  { word: 'diffident', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['shy', 'unassertive'], antonyms: ['confident', 'assertive'] },
  { word: 'vindictive', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['vengeful', 'spiteful'], antonyms: ['forgiving', 'merciful'] },
  { word: 'belligerent', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['aggressive', 'combative'], antonyms: ['peaceable', 'conciliatory'] },
{ word: 'herculean', level: 3, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['strenuous', 'grueling'], antonyms: ['effortless', 'undemanding'] },
  { word: 'exacerbate', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['worsen', 'intensify'], antonyms: ['alleviate', 'relieve'] },
  { word: 'corroborate', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['confirm', 'substantiate'], antonyms: ['contradict', 'disprove'] },
  { word: 'elucidate', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'disclosure', synonyms: ['clarify', 'explain'], antonyms: ['obscure', 'muddle'] },
  { word: 'abate', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['subside', 'wane'], antonyms: ['intensify', 'escalate'] },
  { word: 'censure', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['condemn', 'denounce'], antonyms: ['praise', 'applaud'] },
  { word: 'expedite', level: 3, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['hasten', 'accelerate'], antonyms: ['delay', 'slow'] },

  { word: 'garrulous', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['talkative', 'chatty'], antonyms: ['reserved', 'quiet'] },
  { word: 'malicious', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['spiteful', 'malevolent'], antonyms: ['kindly', 'benevolent'] },
  { word: 'tenacious', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['dogged', 'determined'], antonyms: ['irresolute', 'wavering'] },
  { word: 'destitute', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['penniless', 'impoverished'], antonyms: ['wealthy', 'prosperous'] },
  { word: 'intrepid', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['fearless', 'dauntless'], antonyms: ['cowardly', 'timorous'] },
  { word: 'credulous', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['gullible', 'trusting'], antonyms: ['skeptical', 'suspicious'] },
    { word: 'banal', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['trite', 'commonplace'], antonyms: ['original', 'novel'] },
  { word: 'orthodox', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['conventional', 'traditional'], antonyms: ['unconventional', 'heterodox'] },
  { word: 'spurious', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'credibility', synonyms: ['fake', 'bogus'], antonyms: ['genuine', 'authentic'] },
  { word: 'onerous', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['burdensome', 'taxing'], antonyms: ['undemanding', 'easy'] },
  { word: 'callous', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['heartless', 'unfeeling'], antonyms: ['compassionate', 'sympathetic'] },
  { word: 'capricious', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['whimsical', 'unpredictable'], antonyms: ['steady', 'dependable'] },
  { word: 'exorbitant', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['excessive', 'extortionate'], antonyms: ['reasonable', 'moderate'] },
  { word: 'nebulous', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'clarity', synonyms: ['hazy', 'indistinct'], antonyms: ['definite', 'clear-cut'] },
{ word: 'opaque', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'clarity', synonyms: ['murky', 'impenetrable'], antonyms: ['transparent', 'limpid'] },
{ word: 'gargantuan', level: 3, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['enormous', 'gigantic'], antonyms: ['minuscule', 'diminutive'] },
  { word: 'extol', level: 3, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['praise', 'laud'], antonyms: ['denigrate', 'belittle'] },
  { word: 'thwart', level: 3, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['foil', 'frustrate'], antonyms: ['abet', 'assist'] },
  { word: 'amass', level: 3, subtipo: 'antonimo', pos: 'verb', cluster: 'possession', synonyms: ['accumulate', 'gather'], antonyms: ['disperse', 'scatter'] },
  { word: 'undermine', level: 3, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['sabotage', 'subvert'], antonyms: ['strengthen', 'reinforce'] },
  { word: 'provoke', level: 3, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['incite', 'antagonize'], antonyms: ['pacify', 'appease'] },

  // --- nível 4 ---------------------------------------------------------------
  { word: 'ephemeral', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'duration', synonyms: ['transitory', 'evanescent'], antonyms: ['everlasting', 'imperishable'] },
  { word: 'loquacious', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['voluble', 'talkative'], antonyms: ['uncommunicative', 'quiet'] },
  { word: 'imperturbable', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unflappable', 'composed'], antonyms: ['excitable', 'jittery'] },
  { word: 'adroit', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['skillful', 'nimble'], antonyms: ['clumsy', 'awkward'] },
  { word: 'deleterious', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['injurious', 'damaging'], antonyms: ['beneficial', 'salutary'] },
  { word: 'intransigent', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['uncompromising', 'unyielding'], antonyms: ['accommodating', 'flexible'] },
  { word: 'parsimonious', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['stingy', 'penny-pinching'], antonyms: ['generous', 'openhanded'] },
  { word: 'esoteric', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['arcane', 'recondite'], antonyms: ['accessible', 'familiar'] },
  { word: 'cogent', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'credibility', synonyms: ['compelling', 'convincing'], antonyms: ['unconvincing', 'flimsy'] },
    { word: 'obsequious', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['servile', 'fawning'], antonyms: ['domineering', 'haughty'] },
  { word: 'irascible', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['irritable', 'hot-tempered'], antonyms: ['even-tempered', 'easygoing'] },
  { word: 'morose', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['glum', 'gloomy'], antonyms: ['cheerful', 'buoyant'] },
  { word: 'sanguine', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['optimistic', 'hopeful'], antonyms: ['pessimistic', 'gloomy'] },
  { word: 'ubiquitous', level: 4, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['omnipresent', 'universal'], antonyms: ['rare', 'scarce'] },
  { word: 'mollify', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['appease', 'conciliate'], antonyms: ['enrage', 'infuriate'] },
  { word: 'vilify', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['defame', 'malign'], antonyms: ['praise', 'glorify'] },
  { word: 'ameliorate', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['improve', 'enhance'], antonyms: ['worsen', 'impair'] },
  { word: 'usurp', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'possession', synonyms: ['seize', 'commandeer'], antonyms: ['surrender', 'abdicate'] },
  { word: 'quell', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['subdue', 'suppress'], antonyms: ['incite', 'foment'] },
  { word: 'buttress', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['reinforce', 'strengthen'], antonyms: ['weaken', 'erode'] },
{ word: 'castigate', level: 4, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['chastise', 'berate'], antonyms: ['praise', 'laud'] },

  { word: 'taciturn', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['reserved', 'uncommunicative'], antonyms: ['talkative', 'communicative'] },
  { word: 'lackadaisical', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['listless', 'halfhearted'], antonyms: ['enthusiastic', 'energetic'] },
  { word: 'duplicitous', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['deceitful', 'two-faced'], antonyms: ['honest', 'sincere'] },
  { word: 'pervasive', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['widespread', 'prevalent'], antonyms: ['localized', 'confined'] },
  { word: 'pernicious', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['destructive', 'insidious'], antonyms: ['benign', 'beneficial'] },
  { word: 'obtuse', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['dense', 'slow-witted'], antonyms: ['perceptive', 'quick-witted'] },
  { word: 'recalcitrant', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['unruly', 'refractory'], antonyms: ['obedient', 'amenable'] },
  { word: 'prodigious', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['enormous', 'stupendous'], antonyms: ['minuscule', 'trifling'] },
    { word: 'insipid', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['bland', 'vapid'], antonyms: ['interesting', 'piquant'] },
  { word: 'derivative', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['imitative', 'unoriginal'], antonyms: ['original', 'inventive'] },
  { word: 'insolent', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['impudent', 'disrespectful'], antonyms: ['respectful', 'courteous'] },
  { word: 'avaricious', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['greedy', 'grasping'], antonyms: ['generous', 'unselfish'] },
  { word: 'circumspect', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['wary', 'prudent'], antonyms: ['heedless', 'incautious'] },
  { word: 'venal', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['corrupt', 'bribable'], antonyms: ['incorruptible', 'honest'] },
  { word: 'fastidious', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['fussy', 'exacting'], antonyms: ['slovenly', 'careless'] },
    { word: 'bombastic', level: 4, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['pompous', 'grandiloquent'], antonyms: ['restrained', 'understated'] },
  { word: 'exasperate', level: 4, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['infuriate', 'irritate'], antonyms: ['appease', 'pacify'] },
  { word: 'obfuscate', level: 4, subtipo: 'antonimo', pos: 'verb', cluster: 'disclosure', synonyms: ['obscure', 'muddle'], antonyms: ['clarify', 'illuminate'] },
  { word: 'stymie', level: 4, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['obstruct', 'hamper'], antonyms: ['assist', 'aid'] },
  { word: 'rescind', level: 4, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['revoke', 'repeal'], antonyms: ['enact', 'institute'] },

  // --- nível 5 ---------------------------------------------------------------
  { word: 'obstreperous', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['boisterous', 'unruly'], antonyms: ['restrained', 'subdued'] },
  { word: 'sagacious', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['perspicacious', 'shrewd'], antonyms: ['foolish', 'fatuous'] },
  { word: 'laconic', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['succinct', 'pithy'], antonyms: ['long-winded', 'wordy'] },
  { word: 'ebullient', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['exuberant', 'effervescent'], antonyms: ['subdued', 'glum'] },
  { word: 'mendacious', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['untruthful', 'deceitful'], antonyms: ['truthful', 'veracious'] },
  { word: 'soporific', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'novelty', synonyms: ['sedative', 'hypnotic'], antonyms: ['stimulating', 'invigorating'] },
  { word: 'inimical', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['harmful', 'adverse'], antonyms: ['favorable', 'conducive'] },
  { word: 'pellucid', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'clarity', synonyms: ['limpid', 'crystalline'], antonyms: ['murky', 'turbid'] },
  { word: 'exiguous', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['scanty', 'sparse'], antonyms: ['abundant', 'plentiful'] },
  { word: 'impecunious', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['penniless', 'impoverished'], antonyms: ['wealthy', 'moneyed'] },
  { word: 'antediluvian', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'novelty', synonyms: ['antiquated', 'outmoded'], antonyms: ['modern', 'newfangled'] },
  { word: 'feckless', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['irresponsible', 'shiftless'], antonyms: ['responsible', 'competent'] },
  { word: 'phlegmatic', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['unemotional', 'stolid'], antonyms: ['excitable', 'passionate'] },
  { word: 'querulous', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['peevish', 'complaining'], antonyms: ['uncomplaining', 'contented'] },
  { word: 'churlish', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['boorish', 'rude'], antonyms: ['courteous', 'gracious'] },
  { word: 'pertinacious', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['dogged', 'persistent'], antonyms: ['irresolute', 'wavering'] },
  { word: 'lugubrious', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'character', synonyms: ['mournful', 'doleful'], antonyms: ['cheerful', 'jaunty'] },
  { word: 'nugatory', level: 5, subtipo: 'sinonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['trifling', 'inconsequential'], antonyms: ['significant', 'consequential'] },
  { word: 'obviate', level: 5, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['preclude', 'forestall'], antonyms: ['necessitate', 'require'] },
    { word: 'promulgate', level: 5, subtipo: 'sinonimo', pos: 'verb', cluster: 'disclosure', synonyms: ['proclaim', 'disseminate'], antonyms: ['hide', 'withhold'] },
  { word: 'arrogate', level: 5, subtipo: 'sinonimo', pos: 'verb', cluster: 'possession', synonyms: ['appropriate', 'commandeer'], antonyms: ['surrender', 'cede'] },
  { word: 'assuage', level: 5, subtipo: 'sinonimo', pos: 'verb', cluster: 'influence', synonyms: ['allay', 'relieve'], antonyms: ['intensify', 'worsen'] },
  { word: 'expropriate', level: 5, subtipo: 'sinonimo', pos: 'verb', cluster: 'possession', synonyms: ['confiscate', 'seize'], antonyms: ['restore', 'return'] },

  { word: 'pusillanimous', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['cowardly', 'timorous'], antonyms: ['courageous', 'valiant'] },
  { word: 'perfunctory', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['superficial', 'desultory'], antonyms: ['painstaking', 'thorough'] },
  { word: 'obdurate', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['unyielding', 'adamant'], antonyms: ['tractable', 'compliant'] },
  { word: 'munificent', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'magnitude', synonyms: ['openhanded', 'freehanded'], antonyms: ['stingy', 'tightfisted'] },
  { word: 'truculent', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['combative', 'pugnacious'], antonyms: ['peaceable', 'conciliatory'] },
  { word: 'salubrious', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['healthful', 'wholesome'], antonyms: ['unhealthy', 'unwholesome'] },
  { word: 'abstruse', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'clarity', synonyms: ['recondite', 'arcane'], antonyms: ['accessible', 'straightforward'] },
  { word: 'inscrutable', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'clarity', synonyms: ['enigmatic', 'impenetrable'], antonyms: ['transparent', 'comprehensible'] },
  { word: 'fractious', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['quarrelsome', 'unruly'], antonyms: ['amenable', 'cooperative'] },
  { word: 'insouciant', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['nonchalant', 'carefree'], antonyms: ['anxious', 'worried'] },
  { word: 'perfidious', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['treacherous', 'faithless'], antonyms: ['loyal', 'faithful'] },
  { word: 'mercurial', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['changeable', 'temperamental'], antonyms: ['steady', 'stable'] },
    { word: 'fusty', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'novelty', synonyms: ['old-fashioned', 'antiquated'], antonyms: ['modern', 'up-to-date'] },
  { word: 'venial', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['forgivable', 'excusable'], antonyms: ['unforgivable', 'inexcusable'] },
  { word: 'ingenuous', level: 5, subtipo: 'antonimo', pos: 'adj', cluster: 'character', synonyms: ['artless', 'guileless'], antonyms: ['disingenuous', 'crafty'] },
  { word: 'exculpate', level: 5, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['exonerate', 'absolve'], antonyms: ['incriminate', 'inculpate'] },
  { word: 'excoriate', level: 5, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['lambaste', 'denounce'], antonyms: ['praise', 'laud'] },
  { word: 'vitiate', level: 5, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['impair', 'spoil'], antonyms: ['improve', 'enhance'] },
  { word: 'impugn', level: 5, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['challenge', 'dispute'], antonyms: ['affirm', 'vindicate'] },
  { word: 'burgeon', level: 5, subtipo: 'antonimo', pos: 'verb', cluster: 'influence', synonyms: ['flourish', 'mushroom'], antonyms: ['dwindle', 'wither'] },
]

/**
 * Vizinhos que o cluster não pega: verbetes de clusters DIFERENTES que ainda
 * assim não podem se encontrar numa questão, porque um sentido de dicionário
 * de um encosta no gabarito do outro. Saíram de uma revisão verbete a verbete
 * contra Merriam-Webster, Oxford e Collins; cada par tem o sentido que o
 * justifica. Simétrico: vale nos dois sentidos.
 */
export const VOCAB_NEIGHBORS: [string, string, string][] = [
  ['ephemeral', 'volatile', 'M-W volatile 5: "evanescent, transitory"'],
  ['ubiquitous', 'banal', 'commonplace = "commonly found"'],
  ['ubiquitous', 'mundane', 'commonplace = "commonly found"'],
  ['ubiquitous', 'chronic', 'M-W chronic 2b: "always present"'],
  ['feckless', 'nugatory', 'M-W: ambos "ineffective, worthless"'],
  ['nugatory', 'perfunctory', 'M-W superficial 3: "without significance"'],
  ['nugatory', 'cursory', 'superficial, idem'],
  ['redundant', 'concise', 'M-W redundant 2: "using more words than necessary"'],
  ['redundant', 'terse', 'idem'],
  ['redundant', 'reticent', 'idem'],
  ['redundant', 'verbose', 'idem'],
  ['redundant', 'garrulous', 'idem'],
  ['redundant', 'loquacious', 'idem'],
  ['redundant', 'taciturn', 'idem'],
  ['redundant', 'laconic', 'idem'],
  ['redundant', 'bombastic', 'idem'],
  ['copious', 'verbose', 'M-W copious 2: "profuse in words"'],
  ['copious', 'terse', 'idem'],
  ['copious', 'concise', 'idem'],
  ['copious', 'laconic', 'idem'],
  ['cryptic', 'terse', 'M-W cryptic 2b: "perplexing brevity"'],
  ['cryptic', 'laconic', 'idem'],
  ['cryptic', 'ingenuous', 'enigmatic × ingenuous (franco, transparente)'],
  ['esoteric', 'obtuse', 'M-W obtuse 2b: "difficult to comprehend"'],
  ['esoteric', 'pervasive', 'M-W esoteric 2a: "limited to a small circle"'],
  ['abstruse', 'obtuse', 'idem esoteric'],
  ['prodigious', 'banal', 'M-W prodigious 2a: "exciting amazement"'],
  ['prodigious', 'mundane', 'idem'],
  ['insipid', 'cogent', 'M-W compelling: "evokes interest"'],
  ['soporific', 'lackadaisical', 'M-W soporific 2: "sleepiness or lethargy"'],
  ['soporific', 'lethargic', 'idem'],
  ['soporific', 'phlegmatic', 'idem'],
  ['somber', 'vivid', 'cor sombria × cor viva'],
  ['detrimental', 'lucrative', 'advantageous ≈ profitable'],
  ['incessant', 'fickle', 'incessant ≈ constant × inconstant'],
  ['incessant', 'mercurial', 'idem'],
  ['incessant', 'capricious', 'idem'],
  ['perpetual', 'capricious', 'idem'],
  ['perennial', 'capricious', 'idem'],
  ['perennial', 'tenacious', 'persistente'],
  ['exorbitant', 'tenable', 'M-W exorbitant: "beyond what is just"'],
  ['exorbitant', 'judicious', 'reasonable'],
  ['mundane', 'naive', 'M-W mundane 1 "of the world" × unworldly'],
  ['tedious', 'concise', 'tedious = "tiresome because of length"'],
  ['tedious', 'vivid', 'vivid 1 "lively" × dull'],
  ['tedious', 'arduous', 'thesaurus.com: tedious ≈ laborious'],
  ['vague', 'candid', 'resposta vaga × franca'],
  ['vague', 'concise', 'idem'],
  ['reckless', 'frugal', 'M-W prudent 2: "provident, frugal"'],
  ['reckless', 'miserly', 'idem'],
  ['reckless', 'parsimonious', 'idem'],
  ['parsimonious', 'circumspect', 'idem'],
  ['munificent', 'circumspect', 'idem'],
  ['munificent', 'churlish', 'Collins churlish (arc.): "niggardly"'],
  ['inscrutable', 'ingenuous', 'rosto impenetrável × rosto franco'],
  ['opaque', 'ingenuous', 'idem'],
  ['phlegmatic', 'inscrutable', 'impassive, expressionless'],
  ['arduous', 'diligent', 'industrious ≈ laborious (arc.)'],
  ['herculean', 'meticulous', 'painstaking ≈ laborious'],
  ['conceal', 'hinder', 'M-W obstruct 3: "cut off from sight"'],
  ['innocuous', 'trivial', 'M-W innocuous 2: "inoffensive, insipid"'],
  ['innocuous', 'mundane', 'idem'],
  ['innocuous', 'prosaic', 'idem'],
  ['hackneyed', 'trivial', 'M-W trivial 1: "commonplace"'],
  ['prosaic', 'trivial', 'idem'],
  ['eccentric', 'trivial', 'idem'],
  ['banal', 'trivial', 'idem'],
  ['momentous', 'mundane', 'extraordinário × comum'],
  ['transient', 'obstinate', 'M-W obstinate 2: "not easily removed"'],
  ['fickle', 'transient', 'passageiro'],
  ['tenable', 'sturdy', 'argumento robusto'],
  ['opaque', 'astute', 'M-W opaque 3: "obtuse"'],
  ['opaque', 'cogent', 'argumento claro'],
  ['salubrious', 'fusty', 'M-W fusty 1: "stale, musty"'],
  ['churlish', 'avaricious', 'Collins churlish (arc.): "niggardly"'],
  ['churlish', 'parsimonious', 'idem'],
  ['churlish', 'miserly', 'idem'],
  ['impugn', 'promulgate', 'proclaim ≈ affirm'],
  ['usurp', 'undermine', 'subvert'],
]

/** Palavras-chave que não podem aparecer como preenchimento de `word`. */
export function neighborsOf(word: string): Set<string> {
  const out = new Set<string>()
  for (const [x, y] of VOCAB_NEIGHBORS) {
    if (x === word) out.add(y)
    if (y === word) out.add(x)
  }
  return out
}

// --- Analogias ---------------------------------------------------------------

export interface AnalogyPair {
  a: string
  b: string
  /** rótulo da relação — é o gabarito: a alternativa certa é o par de MESMA relação */
  relation: string
  level: Difficulty
}

/** Nome de cada relação, usado na explicação da questão. */
export const RELATION_LABEL: Record<string, LocalizedText> = {
  part_whole: { pt: 'parte para o todo', en: 'part to whole' },
  tool_user: { pt: 'ferramenta para quem a usa', en: 'tool to its user' },
  worker_place: { pt: 'profissional para o local onde trabalha', en: 'worker to workplace' },
  worker_product: { pt: 'profissional para o que ele produz', en: 'worker to what they make' },
  cause_effect: { pt: 'causa para efeito', en: 'cause to effect' },
  degree: { pt: 'intensidade menor para intensidade maior', en: 'lesser to greater degree' },
  object_function: { pt: 'objeto para sua função', en: 'object to its function' },
  animal_young: { pt: 'animal adulto para seu filhote', en: 'adult animal to its young' },
  material_product: { pt: 'matéria-prima para o produto', en: 'raw material to product' },
  category_member: { pt: 'categoria para um membro dela', en: 'category to a member' },
  opposite: { pt: 'palavra para seu oposto', en: 'word to its opposite' },
  container_content: { pt: 'recipiente para o que ele guarda', en: 'container to its contents' },
  study_subject: { pt: 'ciência para o que ela estuda', en: 'field of study to its subject' },
  unit_measure: { pt: 'unidade para a grandeza que ela mede', en: 'unit to what it measures' },
  person_trait: { pt: 'tipo de pessoa para o traço que a define', en: 'type of person to defining trait' },
  person_lack: { pt: 'tipo de pessoa para aquilo que lhe falta', en: 'type of person to what they lack' },
}

/**
 * Famílias de relações parecidas na superfície. O distrator bom vem da MESMA
 * família do enunciado: diante de "SCALPEL : SURGEON", "pilot : cockpit" também
 * é "profissão e algo do trabalho" — o candidato precisa nomear a relação exata
 * para eliminar. Distrator de família distante ("grape : wine") cai de graça.
 */
export const RELATION_FAMILY: Record<string, string> = {
  tool_user: 'pessoas',
  worker_place: 'pessoas',
  worker_product: 'pessoas',
  person_trait: 'pessoas',
  person_lack: 'pessoas',
  part_whole: 'composicao',
  material_product: 'composicao',
  category_member: 'composicao',
  container_content: 'composicao',
  animal_young: 'composicao',
  degree: 'qualidade',
  opposite: 'qualidade',
  cause_effect: 'qualidade',
  object_function: 'funcao',
  unit_measure: 'funcao',
  study_subject: 'funcao',
}

/**
 * Pares de relações que se confundem de verdade — não só na superfície. Um par
 * de uma pode ser lido como da outra, então nunca aparecem juntas numa questão:
 *
 * - animal_young × category_member: "a kitten is a cat" tanto quanto "a falcon
 *   is a bird"; DOG : PUPPY defenderia "bird : falcon".
 * - category_member × container_content: "cereal inclui trigo" e "o silo guarda
 *   trigo" se leem ambos como "X contém Y".
 */
export const CONFUSABLE_RELATIONS: [string, string][] = [
  ['animal_young', 'category_member'],
  ['category_member', 'container_content'],
]

/**
 * Nível 1 já exige identificar a relação (SCALPEL : SURGEON, DROUGHT : FAMINE);
 * os pares de escola primária (DOG : PUPPY, WOLF : HOWL, EYE : SIGHT) saíram, e
 * com eles as relações animal_sound e body_sense, que se confundiam com
 * object_function ("a knife cuts, a lion roars").
 *
 * Palavras repetidas entre relações são de propósito ("author : novel" e
 * "chapter : novel", "grape : wine" e "decanter : wine"): é o distrator que
 * compartilha palavra com o enunciado que obriga a ler a relação.
 */
export const ANALOGY_PAIRS: AnalogyPair[] = [
  { a: 'chapter', b: 'novel', relation: 'part_whole', level: 1 },
  { a: 'spoke', b: 'wheel', relation: 'part_whole', level: 1 },
  { a: 'lens', b: 'camera', relation: 'part_whole', level: 1 },
  { a: 'rung', b: 'ladder', relation: 'part_whole', level: 1 },
  { a: 'keel', b: 'ship', relation: 'part_whole', level: 2 },
  { a: 'hilt', b: 'sword', relation: 'part_whole', level: 2 },
  { a: 'stanza', b: 'poem', relation: 'part_whole', level: 2 },
  { a: 'fret', b: 'guitar', relation: 'part_whole', level: 3 },
  { a: 'talon', b: 'hawk', relation: 'part_whole', level: 3 },
  { a: 'fuselage', b: 'airplane', relation: 'part_whole', level: 3 },
  { a: 'vestibule', b: 'building', relation: 'part_whole', level: 4 },
  { a: 'nave', b: 'church', relation: 'part_whole', level: 4 },
  { a: 'gable', b: 'house', relation: 'part_whole', level: 4 },
  { a: 'architrave', b: 'entablature', relation: 'part_whole', level: 5 },
  { a: 'pommel', b: 'saddle', relation: 'part_whole', level: 5 },
  { a: 'transept', b: 'cathedral', relation: 'part_whole', level: 5 },

  { a: 'scalpel', b: 'surgeon', relation: 'tool_user', level: 1 },
  { a: 'chisel', b: 'sculptor', relation: 'tool_user', level: 1 },
  { a: 'baton', b: 'conductor', relation: 'tool_user', level: 1 },
  { a: 'trowel', b: 'mason', relation: 'tool_user', level: 2 },
  { a: 'loom', b: 'weaver', relation: 'tool_user', level: 2 },
  { a: 'palette', b: 'painter', relation: 'tool_user', level: 2 },
  { a: 'gavel', b: 'auctioneer', relation: 'tool_user', level: 3 },
  { a: 'awl', b: 'cobbler', relation: 'tool_user', level: 3 },
  { a: 'kiln', b: 'potter', relation: 'tool_user', level: 3 },
  { a: 'sextant', b: 'navigator', relation: 'tool_user', level: 4 },
  { a: 'adze', b: 'shipwright', relation: 'tool_user', level: 4 },
  { a: 'lathe', b: 'machinist', relation: 'tool_user', level: 4 },
  { a: 'burin', b: 'engraver', relation: 'tool_user', level: 5 },
  { a: 'theodolite', b: 'surveyor', relation: 'tool_user', level: 5 },
  { a: 'spokeshave', b: 'wheelwright', relation: 'tool_user', level: 5 },

  { a: 'pilot', b: 'cockpit', relation: 'worker_place', level: 1 },
  { a: 'judge', b: 'courtroom', relation: 'worker_place', level: 1 },
  { a: 'curator', b: 'museum', relation: 'worker_place', level: 1 },
  { a: 'monk', b: 'monastery', relation: 'worker_place', level: 2 },
  { a: 'astronomer', b: 'observatory', relation: 'worker_place', level: 2 },
  { a: 'teller', b: 'bank', relation: 'worker_place', level: 2 },
  { a: 'croupier', b: 'casino', relation: 'worker_place', level: 3 },
  { a: 'actor', b: 'stage', relation: 'worker_place', level: 3 },
  { a: 'apiarist', b: 'apiary', relation: 'worker_place', level: 4 },
  { a: 'blacksmith', b: 'smithy', relation: 'worker_place', level: 4 },
  { a: 'miner', b: 'colliery', relation: 'worker_place', level: 4 },
  { a: 'prioress', b: 'priory', relation: 'worker_place', level: 5 },
  { a: 'ostler', b: 'stable', relation: 'worker_place', level: 5 },
  { a: 'farrier', b: 'forge', relation: 'worker_place', level: 5 },

  { a: 'author', b: 'novel', relation: 'worker_product', level: 1 },
  { a: 'composer', b: 'symphony', relation: 'worker_product', level: 1 },
  { a: 'architect', b: 'blueprint', relation: 'worker_product', level: 1 },
  { a: 'potter', b: 'vase', relation: 'worker_product', level: 2 },
  { a: 'poet', b: 'poem', relation: 'worker_product', level: 2 },
  { a: 'playwright', b: 'script', relation: 'worker_product', level: 2 },
  { a: 'cobbler', b: 'shoe', relation: 'worker_product', level: 3 },
  { a: 'cartographer', b: 'map', relation: 'worker_product', level: 3 },
  { a: 'brewer', b: 'beer', relation: 'worker_product', level: 3 },
  { a: 'luthier', b: 'violin', relation: 'worker_product', level: 4 },
  { a: 'milliner', b: 'hat', relation: 'worker_product', level: 4 },
  { a: 'tanner', b: 'leather', relation: 'worker_product', level: 4 },
  { a: 'chandler', b: 'candle', relation: 'worker_product', level: 5 },
  { a: 'cooper', b: 'barrel', relation: 'worker_product', level: 5 },
  { a: 'fletcher', b: 'arrow', relation: 'worker_product', level: 5 },

  { a: 'drought', b: 'famine', relation: 'cause_effect', level: 1 },
  { a: 'friction', b: 'heat', relation: 'cause_effect', level: 1 },
  { a: 'virus', b: 'illness', relation: 'cause_effect', level: 1 },
  { a: 'insomnia', b: 'fatigue', relation: 'cause_effect', level: 2 },
  { a: 'neglect', b: 'decay', relation: 'cause_effect', level: 2 },
  { a: 'erosion', b: 'canyon', relation: 'cause_effect', level: 2 },
  { a: 'deforestation', b: 'flooding', relation: 'cause_effect', level: 3 },
  { a: 'famine', b: 'emaciation', relation: 'cause_effect', level: 3 },
  { a: 'contagion', b: 'outbreak', relation: 'cause_effect', level: 4 },
  { a: 'overgrazing', b: 'desertification', relation: 'cause_effect', level: 4 },
  { a: 'sedition', b: 'upheaval', relation: 'cause_effect', level: 5 },
  { a: 'desiccation', b: 'brittleness', relation: 'cause_effect', level: 5 },
  { a: 'hubris', b: 'nemesis', relation: 'cause_effect', level: 5 },

  { a: 'chilly', b: 'frigid', relation: 'degree', level: 1 },
  { a: 'annoyed', b: 'furious', relation: 'degree', level: 1 },
  { a: 'pleased', b: 'ecstatic', relation: 'degree', level: 1 },
  { a: 'drizzle', b: 'downpour', relation: 'degree', level: 2 },
  { a: 'breeze', b: 'gale', relation: 'degree', level: 2 },
  { a: 'hungry', b: 'ravenous', relation: 'degree', level: 2 },
  { a: 'fond', b: 'devoted', relation: 'degree', level: 3 },
  { a: 'dislike', b: 'loathing', relation: 'degree', level: 3 },
  { a: 'misdemeanor', b: 'felony', relation: 'degree', level: 3 },
  { a: 'piqued', b: 'incensed', relation: 'degree', level: 4 },
  { a: 'content', b: 'euphoric', relation: 'degree', level: 4 },
  { a: 'warm', b: 'torrid', relation: 'degree', level: 4 },
  { a: 'penchant', b: 'obsession', relation: 'degree', level: 5 },
  { a: 'foible', b: 'vice', relation: 'degree', level: 5 },
  { a: 'qualm', b: 'dread', relation: 'degree', level: 5 },

  { a: 'compass', b: 'navigate', relation: 'object_function', level: 1 },
  { a: 'sieve', b: 'strain', relation: 'object_function', level: 1 },
  { a: 'filter', b: 'purify', relation: 'object_function', level: 1 },
  { a: 'thermostat', b: 'regulate', relation: 'object_function', level: 2 },
  { a: 'splint', b: 'immobilize', relation: 'object_function', level: 2 },
  { a: 'plow', b: 'till', relation: 'object_function', level: 2 },
  { a: 'crucible', b: 'melt', relation: 'object_function', level: 3 },
  { a: 'scythe', b: 'reap', relation: 'object_function', level: 3 },
  { a: 'whetstone', b: 'sharpen', relation: 'object_function', level: 3 },
  { a: 'tourniquet', b: 'constrict', relation: 'object_function', level: 4 },
  { a: 'ballast', b: 'stabilize', relation: 'object_function', level: 4 },
  { a: 'catalyst', b: 'accelerate', relation: 'object_function', level: 4 },
  { a: 'strop', b: 'hone', relation: 'object_function', level: 5 },
  { a: 'lodestone', b: 'attract', relation: 'object_function', level: 5 },
  { a: 'windlass', b: 'hoist', relation: 'object_function', level: 5 },

  { a: 'horse', b: 'foal', relation: 'animal_young', level: 1 },
  { a: 'deer', b: 'fawn', relation: 'animal_young', level: 1 },
  { a: 'owl', b: 'owlet', relation: 'animal_young', level: 1 },
  { a: 'goose', b: 'gosling', relation: 'animal_young', level: 2 },
  { a: 'eagle', b: 'eaglet', relation: 'animal_young', level: 2 },
  { a: 'swan', b: 'cygnet', relation: 'animal_young', level: 3 },
  { a: 'kangaroo', b: 'joey', relation: 'animal_young', level: 3 },
  { a: 'hare', b: 'leveret', relation: 'animal_young', level: 4 },
  { a: 'eel', b: 'elver', relation: 'animal_young', level: 4 },
  { a: 'fox', b: 'kit', relation: 'animal_young', level: 4 },
  { a: 'salmon', b: 'parr', relation: 'animal_young', level: 5 },
  { a: 'hawk', b: 'eyas', relation: 'animal_young', level: 5 },
  { a: 'oyster', b: 'spat', relation: 'animal_young', level: 5 },

  // só matérias que se TRANSFORMAM no produto: "flour : bread" ou "wool :
  // sweater" também se leem como parte-todo, e o distrator vira gabarito
  { a: 'grape', b: 'wine', relation: 'material_product', level: 1 },
  { a: 'sand', b: 'glass', relation: 'material_product', level: 1 },
  { a: 'wheat', b: 'flour', relation: 'material_product', level: 1 },
  { a: 'hide', b: 'leather', relation: 'material_product', level: 2 },
  { a: 'sap', b: 'syrup', relation: 'material_product', level: 2 },
  { a: 'cacao', b: 'chocolate', relation: 'material_product', level: 2 },
  { a: 'latex', b: 'rubber', relation: 'material_product', level: 3 },
  { a: 'milk', b: 'cheese', relation: 'material_product', level: 3 },
  { a: 'petroleum', b: 'plastic', relation: 'material_product', level: 3 },
  { a: 'tallow', b: 'soap', relation: 'material_product', level: 4 },
  { a: 'clay', b: 'terracotta', relation: 'material_product', level: 4 },
  { a: 'barley', b: 'malt', relation: 'material_product', level: 4 },
  { a: 'kaolin', b: 'porcelain', relation: 'material_product', level: 5 },
  { a: 'gypsum', b: 'plaster', relation: 'material_product', level: 5 },
  { a: 'wort', b: 'beer', relation: 'material_product', level: 5 },

  { a: 'reptile', b: 'iguana', relation: 'category_member', level: 1 },
  { a: 'mammal', b: 'whale', relation: 'category_member', level: 1 },
  { a: 'metal', b: 'copper', relation: 'category_member', level: 1 },
  { a: 'gemstone', b: 'opal', relation: 'category_member', level: 2 },
  { a: 'legume', b: 'lentil', relation: 'category_member', level: 2 },
  { a: 'citrus', b: 'kumquat', relation: 'category_member', level: 2 },
  { a: 'mollusk', b: 'squid', relation: 'category_member', level: 3 },
  { a: 'raptor', b: 'osprey', relation: 'category_member', level: 3 },
  { a: 'spice', b: 'cardamom', relation: 'category_member', level: 3 },
  { a: 'marsupial', b: 'wombat', relation: 'category_member', level: 4 },
  { a: 'conifer', b: 'larch', relation: 'category_member', level: 4 },
  { a: 'arachnid', b: 'scorpion', relation: 'category_member', level: 4 },
  { a: 'ungulate', b: 'tapir', relation: 'category_member', level: 5 },
  { a: 'cetacean', b: 'narwhal', relation: 'category_member', level: 5 },
  { a: 'crustacean', b: 'krill', relation: 'category_member', level: 5 },

  { a: 'expand', b: 'contract', relation: 'opposite', level: 1 },
  { a: 'conceal', b: 'reveal', relation: 'opposite', level: 1 },
  { a: 'ascend', b: 'descend', relation: 'opposite', level: 1 },
  { a: 'praise', b: 'censure', relation: 'opposite', level: 2 },
  { a: 'augment', b: 'diminish', relation: 'opposite', level: 2 },
  { a: 'bolster', b: 'undermine', relation: 'opposite', level: 2 },
  { a: 'squander', b: 'conserve', relation: 'opposite', level: 3 },
  { a: 'ephemeral', b: 'enduring', relation: 'opposite', level: 3 },
  { a: 'exculpate', b: 'incriminate', relation: 'opposite', level: 4 },
  { a: 'coalesce', b: 'disperse', relation: 'opposite', level: 4 },
  { a: 'garrulous', b: 'taciturn', relation: 'opposite', level: 4 },
  { a: 'obfuscate', b: 'elucidate', relation: 'opposite', level: 5 },
  { a: 'placate', b: 'incense', relation: 'opposite', level: 5 },
  { a: 'venerate', b: 'execrate', relation: 'opposite', level: 5 },

  { a: 'reservoir', b: 'water', relation: 'container_content', level: 1 },
  { a: 'silo', b: 'grain', relation: 'container_content', level: 1 },
  { a: 'quiver', b: 'arrows', relation: 'container_content', level: 1 },
  { a: 'vault', b: 'bullion', relation: 'container_content', level: 2 },
  { a: 'decanter', b: 'wine', relation: 'container_content', level: 2 },
  { a: 'urn', b: 'ashes', relation: 'container_content', level: 2 },
  { a: 'scabbard', b: 'sword', relation: 'container_content', level: 3 },
  { a: 'humidor', b: 'cigars', relation: 'container_content', level: 3 },
  { a: 'reliquary', b: 'relics', relation: 'container_content', level: 4 },
  { a: 'amphora', b: 'oil', relation: 'container_content', level: 4 },
  { a: 'cruet', b: 'vinegar', relation: 'container_content', level: 5 },
  { a: 'ewer', b: 'water', relation: 'container_content', level: 5 },
  { a: 'ciborium', b: 'wafers', relation: 'container_content', level: 5 },

  { a: 'geology', b: 'rocks', relation: 'study_subject', level: 1 },
  { a: 'botany', b: 'plants', relation: 'study_subject', level: 1 },
  { a: 'meteorology', b: 'weather', relation: 'study_subject', level: 1 },
  { a: 'cardiology', b: 'heart', relation: 'study_subject', level: 2 },
  { a: 'archaeology', b: 'artifacts', relation: 'study_subject', level: 2 },
  { a: 'ornithology', b: 'birds', relation: 'study_subject', level: 2 },
  { a: 'entomology', b: 'insects', relation: 'study_subject', level: 3 },
  { a: 'seismology', b: 'earthquakes', relation: 'study_subject', level: 3 },
  { a: 'herpetology', b: 'reptiles', relation: 'study_subject', level: 4 },
  { a: 'ichthyology', b: 'fish', relation: 'study_subject', level: 4 },
  { a: 'mycology', b: 'fungi', relation: 'study_subject', level: 4 },
  { a: 'numismatics', b: 'coins', relation: 'study_subject', level: 5 },
  { a: 'oology', b: 'eggs', relation: 'study_subject', level: 5 },
  { a: 'speleology', b: 'caves', relation: 'study_subject', level: 5 },

  { a: 'decibel', b: 'loudness', relation: 'unit_measure', level: 1 },
  { a: 'watt', b: 'power', relation: 'unit_measure', level: 1 },
  { a: 'liter', b: 'volume', relation: 'unit_measure', level: 1 },
  { a: 'hertz', b: 'frequency', relation: 'unit_measure', level: 2 },
  { a: 'calorie', b: 'energy', relation: 'unit_measure', level: 2 },
  { a: 'hectare', b: 'area', relation: 'unit_measure', level: 2 },
  { a: 'knot', b: 'speed', relation: 'unit_measure', level: 3 },
  { a: 'fathom', b: 'depth', relation: 'unit_measure', level: 3 },
  { a: 'kelvin', b: 'temperature', relation: 'unit_measure', level: 3 },
  { a: 'ohm', b: 'resistance', relation: 'unit_measure', level: 4 },
  { a: 'pascal', b: 'pressure', relation: 'unit_measure', level: 4 },
  { a: 'ampere', b: 'current', relation: 'unit_measure', level: 4 },
  { a: 'parsec', b: 'distance', relation: 'unit_measure', level: 5 },
  { a: 'becquerel', b: 'radioactivity', relation: 'unit_measure', level: 5 },
  { a: 'erg', b: 'work', relation: 'unit_measure', level: 5 },

  { a: 'miser', b: 'stingy', relation: 'person_trait', level: 1 },
  { a: 'optimist', b: 'hopeful', relation: 'person_trait', level: 1 },
  { a: 'braggart', b: 'boastful', relation: 'person_trait', level: 1 },
  { a: 'glutton', b: 'voracious', relation: 'person_trait', level: 2 },
  { a: 'zealot', b: 'fanatical', relation: 'person_trait', level: 2 },
  { a: 'philanthropist', b: 'generous', relation: 'person_trait', level: 2 },
  { a: 'sycophant', b: 'servile', relation: 'person_trait', level: 3 },
  { a: 'martinet', b: 'strict', relation: 'person_trait', level: 3 },
  { a: 'charlatan', b: 'fraudulent', relation: 'person_trait', level: 3 },
  { a: 'curmudgeon', b: 'irascible', relation: 'person_trait', level: 4 },
  { a: 'sybarite', b: 'self-indulgent', relation: 'person_trait', level: 4 },
  { a: 'dilettante', b: 'superficial', relation: 'person_trait', level: 4 },
  { a: 'poltroon', b: 'craven', relation: 'person_trait', level: 5 },
  { a: 'termagant', b: 'shrewish', relation: 'person_trait', level: 5 },
  { a: 'savant', b: 'erudite', relation: 'person_trait', level: 5 },

  // o que FALTA, não o que sobra: "novice : inexperienced" seria traço, e ficaria
  // indistinguível de "novice : experience"
  { a: 'pauper', b: 'money', relation: 'person_lack', level: 1 },
  { a: 'coward', b: 'courage', relation: 'person_lack', level: 1 },
  { a: 'novice', b: 'experience', relation: 'person_lack', level: 1 },
  { a: 'insomniac', b: 'sleep', relation: 'person_lack', level: 2 },
  { a: 'amnesiac', b: 'memory', relation: 'person_lack', level: 2 },
  { a: 'ingrate', b: 'gratitude', relation: 'person_lack', level: 2 },
  { a: 'ignoramus', b: 'knowledge', relation: 'person_lack', level: 3 },
  { a: 'philistine', b: 'culture', relation: 'person_lack', level: 3 },
  { a: 'boor', b: 'manners', relation: 'person_lack', level: 3 },
  { a: 'neophyte', b: 'expertise', relation: 'person_lack', level: 4 },
  { a: 'iconoclast', b: 'reverence', relation: 'person_lack', level: 4 },
  { a: 'recreant', b: 'valor', relation: 'person_lack', level: 5 },
  { a: 'churl', b: 'courtesy', relation: 'person_lack', level: 5 },
  { a: 'parvenu', b: 'pedigree', relation: 'person_lack', level: 5 },
]

// --- Completar frase ---------------------------------------------------------

export interface SentenceFrame {
  /** a lacuna é marcada por "___" */
  frame: string
  answer: string
  /** palavras que NÃO cabem na lacuna — autoradas junto com a frase */
  distractors: string[]
  level: Difficulty
  /** por que a resposta cabe e as outras não */
  rationale: LocalizedText
}

/**
 * Frases de completar.
 *
 * Os distratores são de propósito TENTADORES: cada frase traz ao menos uma
 * palavra que casa com metade da frase ou com o tema (a "armadilha de
 * conectivo") — "arid" numa frase sobre seca, "scathing" ao lado de "harsh
 * reviews". Mas nenhum sobrevive à frase inteira: onde um distrator era
 * defensável ("polluted" em "Once ___, the lake now draws tourists"), ele saiu.
 *
 * Nenhuma lacuna vem depois de "a"/"an": o artigo entregaria a inicial da
 * resposta.
 */
export const SENTENCE_FRAMES: SentenceFrame[] = [
  // --- nível 1 ---------------------------------------------------------------
  {
    frame: 'The evidence was so ___ that the jury reached a verdict in under an hour.',
    answer: 'compelling',
    distractors: ['circumstantial', 'voluminous', 'controversial', 'technical', 'inconclusive'],
    level: 1,
    rationale: {
      pt: 'Um veredito rápido indica prova FORTE. "compelling" (convincente) explica a pressa; "voluminous" e "technical" atrasariam o júri, e "inconclusive" diria o contrário.',
      en:
        'A verdict that fast points to STRONG evidence. "compelling" explains the speed; "voluminous" and "technical" would slow the jury down, and "inconclusive" says the opposite.',
    },
  },
  {
    frame: 'Although the route looked short on the map, the climb proved ___.',
    answer: 'arduous',
    distractors: ['scenic', 'brief', 'effortless', 'popular', 'uneventful'],
    level: 1,
    rationale: {
      pt: '"Although" anuncia contraste: o mapa prometia fácil, a realidade foi difícil. "arduous" é o contraste; "brief" e "effortless" só repetem a expectativa.',
      en:
        '"Although" announces a contrast: the map promised easy, the reality was hard. "arduous" supplies it; "brief" and "effortless" merely repeat the expectation.',
    },
  },
  {
    frame: 'What began as ___ curiosity, indulged only on the occasional weekend, eventually became his life’s work.',
    answer: 'casual',
    distractors: ['lifelong', 'insatiable', 'consuming', 'obsessive'],
    level: 1,
    rationale: {
      pt: '"What began as X became Y" pede contraste entre início e fim. O fim é intenso (o trabalho de uma vida), então o começo tem de ser leve. As armadilhas casam com o FIM da frase, não com o começo.',
      en:
        '"What began as X became Y" asks for a contrast between start and end. The end is intense (his life\'s work), so the start must be light. The traps match the END of the sentence, not the start.',
    },
  },
  {
    frame: 'Despite the storm warnings, the captain remained ___ and kept the crew calm.',
    answer: 'composed',
    distractors: ['frantic', 'seasick', 'indecisive', 'distracted', 'alarmed'],
    level: 1,
    rationale: {
      pt: 'Manter a tripulação calma exige estar calmo, apesar do alerta. "composed" sustenta a segunda metade; "alarmed" e "frantic" são a reação que o "despite" nega.',
      en:
        'Keeping the crew calm requires being calm despite the warning. "composed" holds up the second half; "alarmed" and "frantic" are the reaction that "despite" rules out.',
    },
  },
  {
    frame: 'The drought turned once-___ farmland into dust within a single season.',
    answer: 'fertile',
    distractors: ['barren', 'arid', 'remote', 'parched', 'neglected'],
    level: 1,
    rationale: {
      pt: '"once-___ ... into dust" exige que antes a terra fosse o oposto de pó. "fertile" cria o contraste; "arid" e "barren" combinam com a seca, mas destroem o "once".',
      en:
        '"once-___ ... into dust" requires the land to have been the opposite of dust before. "fertile" creates the contrast; "arid" and "barren" match the drought but destroy the "once".',
    },
  },
  {
    frame: 'Unlike her predecessor, who micromanaged every task, the new director was ___.',
    answer: 'hands-off',
    distractors: ['meticulous', 'controlling', 'intrusive', 'demanding', 'overbearing'],
    level: 1,
    rationale: {
      pt: '"Unlike" exige o oposto de microgerenciar. "hands-off" inverte; os demais descrevem justamente o antecessor.',
      en:
        '"Unlike" demands the opposite of micromanaging. "hands-off" inverts it; the others describe the predecessor himself.',
    },
  },
  {
    frame: 'The lecture was remarkably ___, covering four centuries of history in ninety minutes.',
    answer: 'sweeping',
    distractors: ['narrow', 'detailed', 'repetitive', 'specialized', 'meandering'],
    level: 1,
    rationale: {
      pt: 'Quatro séculos em noventa minutos é escopo amplo. "sweeping" descreve a amplitude; "detailed" parece elogio, mas é impossível nesse ritmo.',
      en:
        'Four centuries in ninety minutes is broad scope. "sweeping" describes the breadth; "detailed" sounds like praise but is impossible at that pace.',
    },
  },
  {
    frame: 'Rather than confront the problem, the board chose to ___ the decision until next quarter.',
    answer: 'defer',
    distractors: ['announce', 'reverse', 'expedite', 'finalize', 'publicize'],
    level: 1,
    rationale: {
      pt: '"Rather than confront" anuncia fuga, e "until next quarter" diz para quando. Empurrar para depois é adiar: "defer". "expedite" faria o oposto.',
      en:
        '"Rather than confront" announces avoidance, and "until next quarter" says for how long. Pushing it later is postponing: "defer". "expedite" would do the opposite.',
    },
  },
  {
    frame: 'Attendance was ___ this year, with barely a third of the usual crowd.',
    answer: 'sparse',
    distractors: ['steady', 'impressive', 'typical', 'robust', 'mandatory'],
    level: 1,
    rationale: {
      pt: 'Um terço do público habitual é pouca gente. "sparse" descreve a escassez; "steady" e "typical" negam a queda.',
      en:
        'A third of the usual crowd is very few people. "sparse" describes the shortfall; "steady" and "typical" deny the drop.',
    },
  },
  {
    frame: 'Because the instructions were so ___, half the class assembled the kit incorrectly.',
    answer: 'ambiguous',
    distractors: ['thorough', 'explicit', 'straightforward', 'precise'],
    level: 1,
    rationale: {
      pt: '"Because" liga causa e efeito: metade errou, logo a instrução permitia mais de uma leitura. "ambiguous" é a causa; as demais evitariam o erro.',
      en:
        '"Because" links cause and effect: half the class got it wrong, so the instructions allowed more than one reading. "ambiguous" is the cause; the others would prevent the error.',
    },
  },
  {
    frame: 'Funding was ___, so the team cut the study from three years to one.',
    answer: 'meager',
    distractors: ['generous', 'renewed', 'guaranteed', 'ample', 'secured'],
    level: 1,
    rationale: {
      pt: 'Cortar o estudo é consequência de pouco dinheiro. "meager" é a causa; "generous" e "ample" inverteriam o resultado.',
      en:
        'Cutting the study short is the consequence of thin funding. "meager" is the cause; "generous" and "ample" would invert the result.',
    },
  },

  // --- nível 2 ---------------------------------------------------------------
  {
    frame: 'Her ___ replies made it clear that she wanted the meeting to end.',
    answer: 'curt',
    distractors: ['rambling', 'cordial', 'detailed', 'thoughtful', 'enthusiastic'],
    level: 2,
    rationale: {
      pt: 'Querer encerrar produz respostas CURTAS e secas. "curt" casa; "rambling" e "detailed" alongariam a reunião.',
      en:
        'Wanting the meeting over produces SHORT, clipped replies. "curt" fits; "rambling" and "detailed" would drag the meeting out.',
    },
  },
  {
    frame: 'The treaty was ___ only after eleven rounds of talks spread over four years.',
    answer: 'ratified',
    distractors: ['violated', 'proposed', 'leaked', 'summarized', 'translated'],
    level: 2,
    rationale: {
      pt: '"only after" tantas rodadas marca o passo FINAL do processo. "ratified" é o desfecho; "proposed" seria o começo, e "violated" pressupõe um tratado já em vigor.',
      en:
        '"only after" that many rounds marks the FINAL step of the process. "ratified" is the outcome; "proposed" would be the beginning, and "violated" presupposes a treaty already in force.',
    },
  },
  {
    frame: 'The new policy was deliberately ___, leaving each department free to interpret it.',
    answer: 'vague',
    distractors: ['rigid', 'prescriptive', 'punitive', 'detailed', 'uniform'],
    level: 2,
    rationale: {
      pt: 'Liberdade de interpretação decorre de texto impreciso. "vague" explica a liberdade; "prescriptive" e "detailed" a eliminariam.',
      en:
        'Freedom to interpret follows from imprecise wording. "vague" explains the freedom; "prescriptive" and "detailed" would remove it.',
    },
  },
  {
    frame: 'The startup burned through its funding in months, and its investors had long predicted its ___.',
    answer: 'collapse',
    distractors: ['triumph', 'profitability', 'windfall', 'turnaround', 'longevity'],
    level: 2,
    rationale: {
      pt: 'Queimar o caixa em meses é fracasso. "collapse" nomeia o desfecho; "turnaround" e "windfall" contradizem a primeira metade.',
      en:
        'Burning through funding in months is failure. "collapse" names the outcome; "turnaround" and "windfall" contradict the first half.',
    },
  },
  {
    frame: 'The audit found no errors at all, a result the veteran accountants called ___.',
    answer: 'unprecedented',
    distractors: ['routine', 'catastrophic', 'predictable', 'disappointing', 'preliminary'],
    level: 2,
    rationale: {
      pt: '"no errors at all" é resultado extraordinário para contadores veteranos. "unprecedented" reage à raridade; "routine" e "predictable" anulariam o "at all".',
      en:
        '"no errors at all" is extraordinary to veteran accountants. "unprecedented" reacts to the rarity; "routine" and "predictable" would cancel out the "at all".',
    },
  },
  {
    frame: 'Critics dismissed the sequel as ___, a tired rehash of the original film’s best scenes.',
    answer: 'derivative',
    distractors: ['ambitious', 'innovative', 'subversive', 'polished', 'experimental'],
    level: 2,
    rationale: {
      pt: 'A vírgula define a lacuna: "tired rehash" é cópia requentada. "derivative" nomeia isso; "innovative" e "experimental" são o oposto.',
      en:
        'The comma defines the blank: a "tired rehash" is a warmed-over copy. "derivative" names it; "innovative" and "experimental" are its opposite.',
    },
  },
  {
    frame: 'The professor’s explanation was so ___ that even first-year students grasped the theory at once.',
    answer: 'lucid',
    distractors: ['technical', 'abstruse', 'erudite', 'lengthy', 'convoluted'],
    level: 2,
    rationale: {
      pt: '"so ___ that even first-year students grasped it" pede clareza. "lucid" é isso; "erudite" soa como elogio a professor, mas erudição não facilita para calouros.',
      en:
        '"so ___ that even first-year students grasped it" calls for clarity. "lucid" is exactly that; "erudite" sounds like praise for a professor, but erudition does not help freshmen.',
    },
  },
  {
    frame: 'Once ___, the lake now draws thousands of tourists each summer.',
    answer: 'secluded',
    distractors: ['crowded', 'famous', 'popular', 'accessible', 'bustling'],
    level: 2,
    rationale: {
      pt: '"Once ___ ... now draws thousands" pede o oposto de movimentado. "secluded" (isolado) contrasta; "popular" e "famous" descrevem o presente, não o passado.',
      en:
        '"Once ___ ... now draws thousands" calls for the opposite of busy. "secluded" contrasts; "popular" and "famous" describe the present, not the past.',
    },
  },
  {
    frame: 'The witness’s account was ___: it matched the security footage in every detail.',
    answer: 'accurate',
    distractors: ['embellished', 'fabricated', 'hesitant', 'vague', 'contradictory'],
    level: 2,
    rationale: {
      pt: 'Os dois-pontos explicam a lacuna: bater com a filmagem em cada detalhe é precisão. "accurate" é isso; "embellished" e "fabricated" seriam desmentidos pela filmagem.',
      en:
        'The colon explains the blank: matching the footage in every detail is precision. "accurate" is that; "embellished" and "fabricated" would be contradicted by the footage.',
    },
  },
  {
    frame: 'Although the author’s early novels sold poorly, her later work was ___ by critics and readers alike.',
    answer: 'acclaimed',
    distractors: ['ignored', 'panned', 'overlooked', 'censored', 'misunderstood'],
    level: 2,
    rationale: {
      pt: '"Although ... sold poorly" anuncia virada para o positivo. "acclaimed" é a virada; "ignored" e "panned" continuam o fracasso.',
      en:
        '"Although ... sold poorly" announces a turn for the better. "acclaimed" is the turn; "ignored" and "panned" continue the failure.',
    },
  },
  {
    frame: 'Years of careful saving allowed the ___ couple to retire early.',
    answer: 'frugal',
    distractors: ['extravagant', 'impulsive', 'indebted', 'spendthrift', 'lavish'],
    level: 2,
    rationale: {
      pt: '"careful saving" descreve gente econômica. "frugal" é isso; "lavish" e "spendthrift" nunca juntariam o bastante para parar cedo.',
      en:
        '"careful saving" describes thrifty people. "frugal" is exactly that; "lavish" and "spendthrift" would never put aside enough to stop early.',
    },
  },

  // --- nível 3 ---------------------------------------------------------------
  {
    frame: 'The manager’s ___ attitude toward safety rules eventually led to a serious accident.',
    answer: 'cavalier',
    distractors: ['vigilant', 'scrupulous', 'cautious', 'conscientious', 'rigorous'],
    level: 3,
    rationale: {
      pt: 'Uma atitude que LEVA a acidente é descaso. "cavalier" (displicente, arrogante com regras) é a causa; as demais preveniriam o acidente.',
      en:
        'An attitude that LEADS to an accident is disregard. "cavalier" (offhand, dismissive of rules) is the cause; the others would prevent the accident.',
    },
  },
  {
    frame: 'The committee’s report was ___: every recommendation was backed by data.',
    answer: 'rigorous',
    distractors: ['speculative', 'anecdotal', 'perfunctory', 'hasty', 'biased'],
    level: 3,
    rationale: {
      pt: 'Os dois-pontos definem: tudo apoiado em dados é rigor. "rigorous" nomeia isso; "speculative" e "anecdotal" são justamente o que dados evitam.',
      en:
        'The colon defines it: everything backed by data is rigor. "rigorous" names it; "speculative" and "anecdotal" are precisely what data rules out.',
    },
  },
  {
    frame: 'The critic’s praise was ___ compared with the harsh reviews in the other papers.',
    answer: 'effusive',
    distractors: ['scathing', 'caustic', 'withering', 'belated', 'anonymous'],
    level: 3,
    rationale: {
      pt: '"compared with harsh reviews" pede contraste: elogio caloroso. "effusive" contrasta; "scathing", "caustic" e "withering" combinam com "harsh" — são a armadilha de quem lê só o fim da frase.',
      en:
        '"compared with harsh reviews" demands a contrast: warm praise. "effusive" contrasts; "scathing", "caustic" and "withering" match "harsh" — the trap for whoever reads only the end of the sentence.',
    },
  },
  {
    frame: 'The negotiator remained ___ even as both sides raised their voices.',
    answer: 'impassive',
    distractors: ['agitated', 'triumphant', 'apologetic', 'bewildered', 'irate'],
    level: 3,
    rationale: {
      pt: '"even as" marca contraste com o clima da sala: todos exaltados, ele imperturbável. "agitated" e "irate" repetiriam a cena em vez de contrastar.',
      en:
        '"even as" marks a contrast with the mood of the room: everyone else raised, he unmoved. "agitated" and "irate" would repeat the scene instead of contrasting with it.',
    },
  },
  {
    frame: 'His memory of the accident was ___, limited to a sound and a flash of light.',
    answer: 'fragmentary',
    distractors: ['exhaustive', 'photographic', 'comprehensive', 'fabricated', 'detailed'],
    level: 3,
    rationale: {
      pt: 'A vírgula explica a lacuna: só restaram pedaços soltos. "fragmentary" nomeia isso; "exhaustive" e "photographic" contradizem o que vem depois.',
      en:
        'The comma explains the blank: only loose pieces remain. "fragmentary" names that; "exhaustive" and "photographic" contradict what follows.',
    },
  },
  {
    frame: 'She was ___ about the deadline, refusing every request for an extension.',
    answer: 'adamant',
    distractors: ['flexible', 'ambivalent', 'relaxed', 'forgetful', 'lenient'],
    level: 3,
    rationale: {
      pt: 'Recusar todos os pedidos revela firmeza inabalável. "adamant" casa; "flexible" e "lenient" tornariam a segunda metade impossível.',
      en:
        'Refusing every single request reveals unshakeable firmness. "adamant" fits; "flexible" and "lenient" would make the second half impossible.',
    },
  },
  {
    frame: 'The spokesman’s answers were so ___ that reporters left without knowing whether the plant would close.',
    answer: 'evasive',
    distractors: ['candid', 'forthright', 'definitive', 'blunt', 'unequivocal'],
    level: 3,
    rationale: {
      pt: 'Sair sem saber a resposta é efeito de quem se esquiva. "evasive" é a causa; "candid", "blunt" e "definitive" teriam dado a notícia.',
      en:
        'Leaving without the answer is the effect of dodging. "evasive" is the cause; "candid", "blunt" and "definitive" would have delivered the news.',
    },
  },
  {
    frame: 'Far from being ___, the new rules were enforced from the very first day.',
    answer: 'symbolic',
    distractors: ['stringent', 'draconian', 'binding', 'mandatory', 'punitive'],
    level: 3,
    rationale: {
      pt: '"Far from being X" nega X: as regras foram aplicadas, logo X é "só de fachada". "symbolic" é isso; as demais combinam com a aplicação e ignoram o "Far from".',
      en:
        '"Far from being X" denies X: the rules were enforced, so X means "for show only". "symbolic" is that; the others agree with the enforcement and ignore the "Far from".',
    },
  },
  {
    frame: 'The architect favored ___ designs: clean lines, bare walls, and no ornament whatsoever.',
    answer: 'austere',
    distractors: ['ornate', 'baroque', 'whimsical', 'eclectic', 'opulent'],
    level: 3,
    rationale: {
      pt: 'Os dois-pontos definem: linhas limpas, paredes nuas, zero ornamento. "austere" é exatamente isso; "ornate", "baroque" e "opulent" são o oposto.',
      en:
        'The colon defines it: clean lines, bare walls, no ornament. "austere" is exactly that; "ornate", "baroque" and "opulent" are its opposite.',
    },
  },
  {
    frame: 'The treatment offered only ___ relief; within an hour the pain had returned in full.',
    answer: 'transient',
    distractors: ['lasting', 'complete', 'permanent', 'profound', 'sustained'],
    level: 3,
    rationale: {
      pt: '"only" + a dor voltando em uma hora = alívio passageiro. "transient" é isso; "lasting" e "permanent" contradizem o ponto e vírgula.',
      en:
        '"only" plus the pain returning within an hour means short-lived relief. "transient" is that; "lasting" and "permanent" contradict the semicolon.',
    },
  },
  {
    frame: 'The manuscript was ___: three different scribes had copied it over two centuries.',
    answer: 'composite',
    distractors: ['forged', 'pristine', 'illegible', 'uniform', 'abridged'],
    level: 3,
    rationale: {
      pt: 'Os dois-pontos explicam: feito de partes de origens diferentes. "composite" nomeia isso; "uniform" e "pristine" negam as várias mãos.',
      en:
        'The colon explains it: made of parts from different sources. "composite" names that; "uniform" and "pristine" deny the many hands.',
    },
  },

  {
    frame: 'What was expected to be a brief skirmish turned into ___ fighting that dragged on for a decade.',
    answer: 'protracted',
    distractors: ['fleeting', 'perfunctory', 'bloodless', 'decisive', 'ephemeral'],
    level: 3,
    rationale: {
      pt: '"expected to be brief ... turned into" pede contraste, e "dragged on for a decade" define: prolongado. "protracted" é isso; "fleeting" e "ephemeral" repetem a expectativa.',
      en:
        '"expected to be brief ... turned into" asks for a contrast, and "dragged on for a decade" defines it: drawn out. "protracted" is that; "fleeting" and "ephemeral" repeat the expectation.',
    },
  },

  // --- nível 4 ---------------------------------------------------------------
  {
    frame: 'The committee was ___: not one member was willing to change position.',
    answer: 'intransigent',
    distractors: ['conciliatory', 'vacillating', 'pragmatic', 'deferential', 'malleable'],
    level: 4,
    rationale: {
      pt: 'Depois dos dois-pontos vem a definição: ninguém cede. "intransigent" é exatamente isso; "conciliatory" e "malleable" são o oposto.',
      en:
        'The colon introduces the definition: nobody will budge. "intransigent" is exactly that; "conciliatory" and "malleable" are its opposite.',
    },
  },
  {
    frame: 'His apology was ___, delivered in a monotone as he checked his watch.',
    answer: 'perfunctory',
    distractors: ['heartfelt', 'profuse', 'abject', 'tearful', 'elaborate'],
    level: 4,
    rationale: {
      pt: 'Monotonia + olhar o relógio revelam desculpa feita por obrigação. "perfunctory" nomeia isso; "heartfelt" e "abject" contradizem a cena.',
      en:
        'The monotone and the glance at the watch reveal an apology given out of obligation. "perfunctory" names it; "heartfelt" and "abject" contradict the scene.',
    },
  },
  {
    frame: 'Her argument was ___, moving from evidence to conclusion without a single gap.',
    answer: 'cogent',
    distractors: ['rambling', 'emotional', 'speculative', 'specious', 'digressive'],
    level: 4,
    rationale: {
      pt: '"sem lacuna entre prova e conclusão" descreve raciocínio rigoroso. "cogent" nomeia; "specious" parece próximo, mas é o argumento que só PARECE bom.',
      en:
        '"from evidence to conclusion without a single gap" describes rigorous reasoning. "cogent" names it; "specious" looks close, but it is an argument that only SEEMS sound.',
    },
  },
  {
    frame: 'The reforms were merely ___: they changed the letter of the law but not a single practice.',
    answer: 'cosmetic',
    distractors: ['sweeping', 'overdue', 'radical', 'unpopular', 'retroactive'],
    level: 4,
    rationale: {
      pt: '"merely" + os dois-pontos definem: mudança de fachada. "cosmetic" é exatamente isso; "sweeping" e "radical" diriam o contrário.',
      en:
        '"merely" and the colon define it: a change of facade only. "cosmetic" is exactly that; "sweeping" and "radical" would say the opposite.',
    },
  },
  {
    frame: 'The proposal was ___ enough to satisfy both factions without committing to either.',
    answer: 'equivocal',
    distractors: ['explicit', 'binding', 'partisan', 'detailed', 'decisive'],
    level: 4,
    rationale: {
      pt: 'Agradar dois lados sem se comprometer exige texto que admite duas leituras. "equivocal" é o mecanismo; "explicit" e "decisive" o impediriam.',
      en:
        'Pleasing both sides without committing requires wording that allows two readings. "equivocal" is the mechanism; "explicit" and "decisive" would prevent it.',
    },
  },
  {
    frame: 'Investigators concluded that the account had been ___: the witness added details the security footage flatly contradicted.',
    answer: 'embellished',
    distractors: ['corroborated', 'verified', 'understated', 'abridged', 'redacted'],
    level: 4,
    rationale: {
      pt: 'Acrescentar detalhes que a filmagem desmente é enfeitar. "embellished" nomeia; "corroborated" e "verified" seriam o oposto do que a filmagem mostrou.',
      en:
        'Adding details the footage contradicts is embroidering. "embellished" names it; "corroborated" and "verified" are the opposite of what the footage showed.',
    },
  },
  {
    frame: 'Though she was famously ___ in meetings, her memos ran to twenty pages.',
    answer: 'laconic',
    distractors: ['verbose', 'garrulous', 'loquacious', 'long-winded', 'effusive'],
    level: 4,
    rationale: {
      pt: '"Though" pede contraste com memorandos de vinte páginas: nas reuniões, ela falava pouco. "laconic" contrasta; as demais combinam com os memorandos — é a armadilha.',
      en:
        '"Though" demands a contrast with twenty-page memos: in meetings she said little. "laconic" contrasts; the others match the memos — that is the trap.',
    },
  },
  {
    frame: 'The ___ official accepted bribes from anyone who asked for a favor.',
    answer: 'venal',
    distractors: ['scrupulous', 'incorruptible', 'diligent', 'punctilious', 'impartial'],
    level: 4,
    rationale: {
      pt: 'Aceitar suborno de qualquer um é corrupção. "venal" (que se vende) é isso; "scrupulous" e "incorruptible" são o oposto.',
      en:
        'Taking bribes from anyone is corruption. "venal" (open to bribery) is that; "scrupulous" and "incorruptible" are its opposite.',
    },
  },
  {
    frame: 'After the scandal, the once-___ senator could barely fill a small conference room.',
    answer: 'lionized',
    distractors: ['obscure', 'reviled', 'disgraced', 'marginal', 'unknown'],
    level: 4,
    rationale: {
      pt: '"once-___" pede o oposto do presente (sala vazia). "lionized" (celebrado) contrasta; "disgraced" e "reviled" descrevem o DEPOIS do escândalo.',
      en:
        '"once-___" calls for the opposite of the present (an empty room). "lionized" (celebrated) contrasts; "disgraced" and "reviled" describe the AFTER of the scandal.',
    },
  },
  {
    frame: 'The documentary’s view of the war was ___, weighing the claims of every side without favoring any.',
    answer: 'dispassionate',
    distractors: ['partisan', 'polemical', 'sentimental', 'jingoistic', 'tendentious'],
    level: 4,
    rationale: {
      pt: 'Pesar todos os lados sem favorecer nenhum é imparcialidade fria. "dispassionate" nomeia; as demais tomam partido ou apelam à emoção.',
      en:
        'Weighing every side without favoring any is cool impartiality. "dispassionate" names it; the others take sides or play on emotion.',
    },
  },
  {
    frame: 'Rather than resolving the dispute, the mediator’s clumsy remarks only ___ it.',
    answer: 'exacerbated',
    distractors: ['defused', 'settled', 'mitigated', 'resolved', 'clarified'],
    level: 4,
    rationale: {
      pt: '"Rather than resolving" + "clumsy" anunciam piora. "exacerbated" é piorar; "defused" e "mitigated" seriam o que o mediador NÃO conseguiu.',
      en:
        '"Rather than resolving" plus "clumsy" announce a worsening. "exacerbated" is worsening; "defused" and "mitigated" are what the mediator failed to do.',
    },
  },

  // --- nível 5 ---------------------------------------------------------------
  {
    frame: 'The ___ child refused every instruction, shouting down teachers and classmates alike.',
    answer: 'obstreperous',
    distractors: ['docile', 'diffident', 'precocious', 'tractable', 'taciturn'],
    level: 5,
    rationale: {
      pt: 'Recusar ordens e gritar com todos é indisciplina barulhenta. "obstreperous" nomeia isso; "precocious" tenta por falar de criança, mas significa adiantada, não rebelde.',
      en:
        'Refusing instructions and shouting everyone down is noisy unruliness. "obstreperous" names it; "precocious" tempts because it describes children, but it means advanced, not unruly.',
    },
  },
  {
    frame: 'The general’s ___ retreat at the first sign of resistance cost him the respect of his troops.',
    answer: 'pusillanimous',
    distractors: ['intrepid', 'valiant', 'audacious', 'methodical', 'belated'],
    level: 5,
    rationale: {
      pt: 'Recuar ao primeiro sinal de resistência e perder o respeito da tropa é covardia. "pusillanimous" é isso; "belated" contradiz "at the first sign".',
      en:
        'Retreating at the first sign of resistance and losing the troops\' respect is cowardice. "pusillanimous" is that; "belated" contradicts "at the first sign".',
    },
  },
  {
    frame: 'The CEO’s claim that she had never read the memo was ___: her initials were on every page.',
    answer: 'disingenuous',
    distractors: ['candid', 'credible', 'ingenuous', 'forthright', 'plausible'],
    level: 5,
    rationale: {
      pt: 'As iniciais em cada página desmentem a alegação: ela fingia não saber. "disingenuous" é isso; "ingenuous" é a armadilha de grafia — significa ingênuo, sincero, o oposto.',
      en:
        'Her initials on every page give the claim the lie: she was feigning ignorance. "disingenuous" is that; "ingenuous" is the spelling trap — it means naive and sincere, the opposite.',
    },
  },
  {
    frame: 'The policy proved ___ in its effects, harming the very people it had been designed to protect.',
    answer: 'pernicious',
    distractors: ['salutary', 'benign', 'innocuous', 'negligible', 'salubrious'],
    level: 5,
    rationale: {
      pt: 'Prejudicar justamente quem deveria proteger é efeito nocivo. "pernicious" nomeia; "salutary" e "benign" são o oposto, e "negligible" nega o dano.',
      en:
        'Harming the very people it should protect is a damaging effect. "pernicious" names it; "salutary" and "benign" are its opposite, and "negligible" denies the harm.',
    },
  },
  {
    frame: 'Though the evidence against him was overwhelming, the defendant remained ___, insisting on his innocence to the end.',
    answer: 'obdurate',
    distractors: ['contrite', 'penitent', 'remorseful', 'compliant', 'tractable'],
    level: 5,
    rationale: {
      pt: '"Though" + insistir até o fim pedem teimosia inabalável. "obdurate" é isso; "contrite" e "penitent" são o que a prova esmagadora levaria alguém a sentir — e o "though" nega.',
      en:
        '"Though" plus insisting to the end call for unshakeable stubbornness. "obdurate" is that; "contrite" and "penitent" are what overwhelming evidence would produce — and "though" rules them out.',
    },
  },
  {
    frame: 'The ___ host greeted each guest at the door and made sure no glass was ever empty.',
    answer: 'solicitous',
    distractors: ['churlish', 'aloof', 'negligent', 'parsimonious', 'truculent'],
    level: 5,
    rationale: {
      pt: 'Receber cada convidado e cuidar dos copos é atenção cuidadosa. "solicitous" nomeia; "aloof" e "negligent" são o oposto, e "parsimonious" deixaria os copos vazios.',
      en:
        'Greeting every guest and minding the glasses is attentive care. "solicitous" names it; "aloof" and "negligent" are its opposite, and "parsimonious" would leave the glasses empty.',
    },
  },
  {
    frame: 'Critics called the novel’s prose ___, so clear that every sentence could be taken in at a glance.',
    answer: 'pellucid',
    distractors: ['turgid', 'abstruse', 'opaque', 'florid', 'byzantine'],
    level: 5,
    rationale: {
      pt: 'A vírgula define: clara a ponto de ser lida num relance. "pellucid" (translúcida) é isso; "turgid", "opaque" e "byzantine" são o oposto.',
      en:
        'The comma defines it: clear enough to be read at a glance. "pellucid" (translucent) is that; "turgid", "opaque" and "byzantine" are its opposite.',
    },
  },
  {
    frame: 'The ___ clerk, eager to please his superiors, agreed with every remark before it was finished.',
    answer: 'obsequious',
    distractors: ['truculent', 'insolent', 'recalcitrant', 'supercilious', 'taciturn'],
    level: 5,
    rationale: {
      pt: 'Ansioso por agradar e concordando antes do fim da frase: servilismo. "obsequious" é isso; "insolent" e "supercilious" são o desdém oposto.',
      en:
        'Eager to please and agreeing before the sentence ends: servility. "obsequious" is that; "insolent" and "supercilious" are the opposite disdain.',
    },
  },
  {
    frame: 'The regulator’s warnings proved ___: the bank collapsed exactly as she had predicted.',
    answer: 'prescient',
    distractors: ['alarmist', 'unfounded', 'premature', 'hyperbolic', 'spurious'],
    level: 5,
    rationale: {
      pt: 'Tudo aconteceu exatamente como previsto: os alertas enxergaram o futuro. "prescient" é isso; "alarmist" e "hyperbolic" são o rótulo que alertas costumam receber — a armadilha.',
      en:
        'It all happened exactly as predicted: the warnings saw the future. "prescient" is that; "alarmist" and "hyperbolic" are the labels warnings usually get — the trap.',
    },
  },
  {
    frame: 'Having inherited a fortune, he spent it with ___ abandon and was penniless within five years.',
    answer: 'profligate',
    distractors: ['parsimonious', 'frugal', 'prudent', 'abstemious', 'judicious'],
    level: 5,
    rationale: {
      pt: 'Torrar uma fortuna em cinco anos é esbanjamento. "profligate" é isso; as demais descrevem quem economiza e jamais ficaria sem nada.',
      en:
        'Blowing a fortune in five years is wastefulness. "profligate" is that; the others describe people who save and would never end up penniless.',
    },
  },
  {
    frame: 'The speech was so ___ that half the audience had dozed off before the halfway mark.',
    answer: 'soporific',
    distractors: ['stirring', 'incendiary', 'rousing', 'provocative', 'galvanizing'],
    level: 5,
    rationale: {
      pt: 'Metade da plateia dormindo é efeito de fala que dá sono. "soporific" nomeia isso; as demais despertariam a plateia.',
      en:
        'Half the audience asleep is the effect of a sleep-inducing speech. "soporific" names it; the others would wake the audience up.',
    },
  },
]

// --- Silogismos --------------------------------------------------------------

/**
 * Termos para os silogismos.
 *
 * Os níveis altos usam nomes inventados de propósito: com categorias reais, dá
 * para acertar por conhecimento de mundo em vez de por lógica, que é
 * exatamente o que a questão NÃO quer medir.
 */
export const LOGIC_TERMS = {
  concretos: [
    ['engineers', 'analysts', 'graduates'],
    ['dancers', 'athletes', 'performers'],
    ['pilots', 'officers', 'employees'],
    ['chemists', 'researchers', 'specialists'],
    ['sculptors', 'artists', 'creators'],
    ['editors', 'writers', 'professionals'],
    ['violinists', 'musicians', 'entertainers'],
    ['surgeons', 'physicians', 'licensees'],
    ['archivists', 'librarians', 'custodians'],
    ['brokers', 'agents', 'intermediaries'],
    ['welders', 'technicians', 'contractors'],
    ['botanists', 'scientists', 'academics'],
    ['drummers', 'percussionists', 'bandmates'],
    ['auditors', 'accountants', 'inspectors'],
    ['cartographers', 'surveyors', 'fieldworkers'],
    ['linguists', 'translators', 'consultants'],
    ['paramedics', 'responders', 'volunteers'],
    ['jockeys', 'riders', 'competitors'],
    ['glaziers', 'craftsmen', 'tradespeople'],
    ['seismologists', 'geologists', 'modelers'],
  ],
  inventados: [
    ['Zorans', 'Milvers', 'Trents'],
    ['Palkins', 'Rethas', 'Vondels'],
    ['Quimbs', 'Dashels', 'Norvicks'],
    ['Brelts', 'Yarrows', 'Skanes'],
    ['Gundars', 'Pellows', 'Chorvs'],
    ['Mirethes', 'Talvans', 'Ospreks'],
    ['Faldrics', 'Umbers', 'Lorvans'],
    ['Threlks', 'Bavins', 'Cordels'],
    ['Nypers', 'Grendts', 'Tulvars'],
    ['Wexins', 'Halbreds', 'Poldans'],
    ['Sarnicks', 'Velmers', 'Drathes'],
    ['Oriads', 'Kembles', 'Fanthers'],
    ['Riskels', 'Domvars', 'Aubrints'],
    ['Pelvids', 'Storrans', 'Gaviths'],
    ['Yendels', 'Marchets', 'Ilvanes'],
    ['Crethins', 'Obarks', 'Selvores'],
    ['Tamrigs', 'Weslons', 'Dunvers'],
    ['Halkins', 'Zevrids', 'Porthals'],
    ['Nurvals', 'Bethics', 'Quandars'],
    ['Ashgrens', 'Voltrims', 'Merdocks'],
  ],
} as const

// --- Índices e consistência --------------------------------------------------

export const VOCAB_BY_WORD = new Map(VOCAB.map((e) => [e.word, e]))

/** Todas as palavras que NÃO podem virar distrator de `entry`. */
export function forbiddenFor(entry: VocabEntry): Set<string> {
  return new Set([entry.word, ...entry.synonyms, ...entry.antonyms])
}

export const RELATIONS = [...new Set(ANALOGY_PAIRS.map((p) => p.relation))]

export function pairsOfRelation(relation: string): AnalogyPair[] {
  return ANALOGY_PAIRS.filter((p) => p.relation === relation)
}

/** As duas relações se confundem a ponto de não poderem dividir uma questão? */
export function areConfusable(r1: string, r2: string): boolean {
  return CONFUSABLE_RELATIONS.some(
    ([x, y]) => (x === r1 && y === r2) || (x === r2 && y === r1),
  )
}
