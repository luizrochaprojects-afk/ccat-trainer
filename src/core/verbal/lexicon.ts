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

export interface VocabEntry {
  word: string
  level: Difficulty
  /** agrupamento semântico: distratores vêm sempre de OUTRO cluster */
  cluster: string
  synonyms: string[]
  antonyms: string[]
}

export const VOCAB: VocabEntry[] = [
  // --- nível 1 ---------------------------------------------------------------
  { word: 'rapid', level: 1, cluster: 'speed', synonyms: ['swift', 'quick'], antonyms: ['slow', 'gradual'] },
  { word: 'ancient', level: 1, cluster: 'age', synonyms: ['aged', 'archaic'], antonyms: ['modern', 'recent'] },
  { word: 'vacant', level: 1, cluster: 'occupancy', synonyms: ['empty', 'unoccupied'], antonyms: ['occupied', 'crowded'] },
  { word: 'visible', level: 1, cluster: 'visibility', synonyms: ['apparent', 'noticeable'], antonyms: ['hidden', 'concealed'] },
  { word: 'abundant', level: 1, cluster: 'quantity', synonyms: ['plentiful', 'copious'], antonyms: ['scarce', 'meager'] },
  { word: 'hostile', level: 1, cluster: 'warmth', synonyms: ['unfriendly', 'antagonistic'], antonyms: ['friendly', 'welcoming'] },
  { word: 'feeble', level: 1, cluster: 'strength', synonyms: ['frail', 'weak'], antonyms: ['strong', 'vigorous'] },
  { word: 'calm', level: 1, cluster: 'agitation', synonyms: ['tranquil', 'serene'], antonyms: ['frantic', 'turbulent'] },
  { word: 'simple', level: 1, cluster: 'complexity', synonyms: ['straightforward', 'uncomplicated'], antonyms: ['intricate', 'convoluted'] },
  { word: 'permanent', level: 1, cluster: 'duration', synonyms: ['lasting', 'enduring'], antonyms: ['temporary', 'fleeting'] },
  { word: 'humid', level: 1, cluster: 'moisture', synonyms: ['damp', 'muggy'], antonyms: ['dry', 'arid'] },
  { word: 'noisy', level: 1, cluster: 'stillness', synonyms: ['loud', 'raucous'], antonyms: ['hushed', 'silent'] },

  // --- nível 2 ---------------------------------------------------------------
  { word: 'diligent', level: 2, cluster: 'effort', synonyms: ['industrious', 'assiduous'], antonyms: ['lazy', 'idle'] },
  { word: 'trivial', level: 2, cluster: 'importance', synonyms: ['insignificant', 'petty'], antonyms: ['crucial', 'momentous'] },
  { word: 'candid', level: 2, cluster: 'honesty', synonyms: ['frank', 'forthright'], antonyms: ['evasive', 'guarded'] },
  { word: 'prudent', level: 2, cluster: 'judgment', synonyms: ['cautious', 'judicious'], antonyms: ['reckless', 'rash'] },
  { word: 'sturdy', level: 2, cluster: 'strength', synonyms: ['robust', 'durable'], antonyms: ['flimsy', 'fragile'] },
  { word: 'brisk', level: 2, cluster: 'speed', synonyms: ['lively', 'energetic'], antonyms: ['sluggish', 'languid'] },
  { word: 'lucid', level: 2, cluster: 'clarity', synonyms: ['clear', 'intelligible'], antonyms: ['muddled', 'incoherent'] },
  { word: 'ample', level: 2, cluster: 'quantity', synonyms: ['generous', 'spacious'], antonyms: ['scant', 'cramped'] },
  { word: 'rigid', level: 2, cluster: 'severity', synonyms: ['stiff', 'unbending'], antonyms: ['pliable', 'supple'] },
  { word: 'dormant', level: 2, cluster: 'stillness', synonyms: ['inactive', 'latent'], antonyms: ['active', 'bustling'] },
  { word: 'fertile', level: 2, cluster: 'fertility', synonyms: ['productive', 'fruitful'], antonyms: ['barren', 'infertile'] },
  { word: 'timid', level: 2, cluster: 'boldness', synonyms: ['bashful', 'diffident'], antonyms: ['bold', 'audacious'] },

  // --- nível 3 ---------------------------------------------------------------
  { word: 'meticulous', level: 3, cluster: 'effort', synonyms: ['thorough', 'scrupulous'], antonyms: ['careless', 'slapdash'] },
  { word: 'obscure', level: 3, cluster: 'visibility', synonyms: ['cryptic', 'abstruse'], antonyms: ['obvious', 'evident'] },
  { word: 'volatile', level: 3, cluster: 'agitation', synonyms: ['unstable', 'erratic'], antonyms: ['steady', 'stable'] },
  { word: 'benevolent', level: 3, cluster: 'warmth', synonyms: ['charitable', 'kindly'], antonyms: ['malevolent', 'spiteful'] },
  { word: 'tedious', level: 3, cluster: 'interest', synonyms: ['monotonous', 'dreary'], antonyms: ['engaging', 'riveting'] },
  { word: 'arduous', level: 3, cluster: 'difficulty', synonyms: ['strenuous', 'grueling'], antonyms: ['effortless', 'undemanding'] },
  { word: 'lenient', level: 3, cluster: 'severity', synonyms: ['permissive', 'indulgent'], antonyms: ['strict', 'exacting'] },
  { word: 'transient', level: 3, cluster: 'duration', synonyms: ['momentary', 'passing'], antonyms: ['perpetual', 'abiding'] },
  { word: 'adept', level: 3, cluster: 'skill', synonyms: ['proficient', 'skilled'], antonyms: ['bungling', 'unskilled'] },
  { word: 'frugal', level: 3, cluster: 'spending', synonyms: ['thrifty', 'economical'], antonyms: ['extravagant', 'wasteful'] },
  { word: 'lucrative', level: 3, cluster: 'profit', synonyms: ['profitable', 'remunerative'], antonyms: ['unprofitable', 'ruinous'] },
  { word: 'ambiguous', level: 3, cluster: 'clarity', synonyms: ['equivocal', 'indeterminate'], antonyms: ['unequivocal', 'definite'] },

  // --- nível 4 ---------------------------------------------------------------
  { word: 'ephemeral', level: 4, cluster: 'duration', synonyms: ['transitory', 'evanescent'], antonyms: ['everlasting', 'imperishable'] },
  { word: 'austere', level: 4, cluster: 'severity', synonyms: ['stern', 'spartan'], antonyms: ['lavish', 'indulgent'] },
  { word: 'tenacious', level: 4, cluster: 'persistence', synonyms: ['dogged', 'unrelenting'], antonyms: ['yielding', 'irresolute'] },
  { word: 'opaque', level: 4, cluster: 'visibility', synonyms: ['impenetrable', 'murky'], antonyms: ['transparent', 'limpid'] },
  { word: 'placid', level: 4, cluster: 'agitation', synonyms: ['untroubled', 'unruffled'], antonyms: ['tempestuous', 'agitated'] },
  { word: 'redundant', level: 4, cluster: 'necessity', synonyms: ['superfluous', 'surplus'], antonyms: ['indispensable', 'requisite'] },
  { word: 'garrulous', level: 4, cluster: 'speech', synonyms: ['loquacious', 'voluble'], antonyms: ['taciturn', 'reticent'] },
  { word: 'inept', level: 4, cluster: 'skill', synonyms: ['incompetent', 'maladroit'], antonyms: ['competent', 'dexterous'] },
  { word: 'zealous', level: 4, cluster: 'enthusiasm', synonyms: ['fervent', 'ardent'], antonyms: ['apathetic', 'indifferent'] },
  { word: 'candor', level: 4, cluster: 'honesty', synonyms: ['frankness', 'openness'], antonyms: ['duplicity', 'evasiveness'] },
  { word: 'pervasive', level: 4, cluster: 'extent', synonyms: ['ubiquitous', 'widespread'], antonyms: ['localized', 'confined'] },
  { word: 'innocuous', level: 4, cluster: 'harm', synonyms: ['harmless', 'benign'], antonyms: ['harmful', 'pernicious'] },

  // --- nível 5 ---------------------------------------------------------------
  { word: 'perfunctory', level: 5, cluster: 'effort', synonyms: ['cursory', 'desultory'], antonyms: ['painstaking', 'exhaustive'] },
  { word: 'laconic', level: 5, cluster: 'speech', synonyms: ['terse', 'succinct'], antonyms: ['verbose', 'prolix'] },
  { word: 'obdurate', level: 5, cluster: 'persistence', synonyms: ['unyielding', 'adamant'], antonyms: ['tractable', 'compliant'] },
  { word: 'ebullient', level: 5, cluster: 'enthusiasm', synonyms: ['exuberant', 'effervescent'], antonyms: ['morose', 'sullen'] },
  { word: 'recalcitrant', level: 5, cluster: 'obedience', synonyms: ['refractory', 'unruly'], antonyms: ['docile', 'submissive'] },
  { word: 'munificent', level: 5, cluster: 'spending', synonyms: ['bountiful', 'openhanded'], antonyms: ['miserly', 'parsimonious'] },
  { word: 'quiescent', level: 5, cluster: 'stillness', synonyms: ['quiet', 'reposeful'], antonyms: ['tumultuous', 'restive'] },
  { word: 'mendacious', level: 5, cluster: 'truthfulness', synonyms: ['untruthful', 'deceitful'], antonyms: ['veracious', 'truthful'] },
  { word: 'intransigent', level: 5, cluster: 'negotiation', synonyms: ['uncompromising', 'implacable'], antonyms: ['accommodating', 'conciliatory'] },
  { word: 'sagacious', level: 5, cluster: 'judgment', synonyms: ['discerning', 'perspicacious'], antonyms: ['obtuse', 'fatuous'] },
  { word: 'truculent', level: 5, cluster: 'aggression', synonyms: ['belligerent', 'pugnacious'], antonyms: ['peaceable', 'amiable'] },
  { word: 'soporific', level: 5, cluster: 'alertness', synonyms: ['somniferous', 'sedative'], antonyms: ['stimulating', 'invigorating'] },
]

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
  animal_sound: { pt: 'animal para o som que ele faz', en: 'animal to the sound it makes' },
  body_sense: { pt: 'órgão para o sentido correspondente', en: 'organ to its sense' },
  study_subject: { pt: 'ciência para o que ela estuda', en: 'field of study to its subject' },
  unit_measure: { pt: 'unidade para a grandeza que ela mede', en: 'unit to what it measures' },
  shelter_animal: { pt: 'abrigo para o animal que o habita', en: 'shelter to its animal' },
}

export const ANALOGY_PAIRS: AnalogyPair[] = [
  { a: 'page', b: 'book', relation: 'part_whole', level: 1 },
  { a: 'petal', b: 'flower', relation: 'part_whole', level: 1 },
  { a: 'wheel', b: 'car', relation: 'part_whole', level: 1 },
  { a: 'branch', b: 'tree', relation: 'part_whole', level: 2 },
  { a: 'verse', b: 'poem', relation: 'part_whole', level: 3 },

  { a: 'scalpel', b: 'surgeon', relation: 'tool_user', level: 2 },
  { a: 'brush', b: 'painter', relation: 'tool_user', level: 1 },
  { a: 'hammer', b: 'carpenter', relation: 'tool_user', level: 1 },
  { a: 'baton', b: 'conductor', relation: 'tool_user', level: 3 },
  { a: 'chisel', b: 'sculptor', relation: 'tool_user', level: 3 },

  { a: 'chef', b: 'kitchen', relation: 'worker_place', level: 1 },
  { a: 'judge', b: 'courtroom', relation: 'worker_place', level: 1 },
  { a: 'pilot', b: 'cockpit', relation: 'worker_place', level: 2 },
  { a: 'actor', b: 'stage', relation: 'worker_place', level: 2 },
  { a: 'curator', b: 'museum', relation: 'worker_place', level: 4 },

  { a: 'baker', b: 'bread', relation: 'worker_product', level: 1 },
  { a: 'author', b: 'novel', relation: 'worker_product', level: 2 },
  { a: 'architect', b: 'blueprint', relation: 'worker_product', level: 3 },
  { a: 'composer', b: 'symphony', relation: 'worker_product', level: 3 },
  { a: 'cobbler', b: 'shoe', relation: 'worker_product', level: 4 },

  { a: 'fire', b: 'smoke', relation: 'cause_effect', level: 1 },
  { a: 'drought', b: 'famine', relation: 'cause_effect', level: 3 },
  { a: 'virus', b: 'illness', relation: 'cause_effect', level: 2 },
  { a: 'friction', b: 'heat', relation: 'cause_effect', level: 3 },
  { a: 'neglect', b: 'decay', relation: 'cause_effect', level: 4 },

  { a: 'warm', b: 'scorching', relation: 'degree', level: 2 },
  { a: 'cold', b: 'freezing', relation: 'degree', level: 1 },
  { a: 'happy', b: 'elated', relation: 'degree', level: 2 },
  { a: 'large', b: 'colossal', relation: 'degree', level: 3 },
  { a: 'annoyed', b: 'irate', relation: 'degree', level: 4 },

  { a: 'knife', b: 'cut', relation: 'object_function', level: 1 },
  { a: 'pen', b: 'write', relation: 'object_function', level: 1 },
  { a: 'key', b: 'unlock', relation: 'object_function', level: 1 },
  { a: 'broom', b: 'sweep', relation: 'object_function', level: 2 },
  { a: 'sieve', b: 'strain', relation: 'object_function', level: 4 },

  { a: 'dog', b: 'puppy', relation: 'animal_young', level: 1 },
  { a: 'cat', b: 'kitten', relation: 'animal_young', level: 1 },
  { a: 'horse', b: 'foal', relation: 'animal_young', level: 2 },
  { a: 'sheep', b: 'lamb', relation: 'animal_young', level: 2 },
  { a: 'swan', b: 'cygnet', relation: 'animal_young', level: 5 },

  { a: 'flour', b: 'bread', relation: 'material_product', level: 2 },
  { a: 'clay', b: 'pottery', relation: 'material_product', level: 2 },
  { a: 'wool', b: 'sweater', relation: 'material_product', level: 2 },
  { a: 'grape', b: 'wine', relation: 'material_product', level: 3 },
  { a: 'ore', b: 'metal', relation: 'material_product', level: 4 },

  { a: 'mammal', b: 'whale', relation: 'category_member', level: 2 },
  { a: 'instrument', b: 'violin', relation: 'category_member', level: 1 },
  { a: 'fruit', b: 'mango', relation: 'category_member', level: 1 },
  { a: 'metal', b: 'copper', relation: 'category_member', level: 2 },
  { a: 'reptile', b: 'iguana', relation: 'category_member', level: 3 },

  { a: 'ally', b: 'enemy', relation: 'opposite', level: 1 },
  { a: 'ascend', b: 'descend', relation: 'opposite', level: 2 },
  { a: 'expand', b: 'contract', relation: 'opposite', level: 2 },
  { a: 'praise', b: 'censure', relation: 'opposite', level: 4 },
  { a: 'bolster', b: 'undermine', relation: 'opposite', level: 5 },

  { a: 'wallet', b: 'money', relation: 'container_content', level: 1 },
  { a: 'vault', b: 'bullion', relation: 'container_content', level: 4 },
  { a: 'reservoir', b: 'water', relation: 'container_content', level: 3 },
  { a: 'silo', b: 'grain', relation: 'container_content', level: 3 },
  { a: 'quiver', b: 'arrows', relation: 'container_content', level: 5 },

  // --- ampliação: mais pares nas relações existentes -------------------------
  { a: 'stanza', b: 'poem', relation: 'part_whole', level: 3 },
  { a: 'lens', b: 'camera', relation: 'part_whole', level: 2 },
  { a: 'fin', b: 'fish', relation: 'part_whole', level: 1 },
  { a: 'rung', b: 'ladder', relation: 'part_whole', level: 4 },

  { a: 'wrench', b: 'mechanic', relation: 'tool_user', level: 1 },
  { a: 'loom', b: 'weaver', relation: 'tool_user', level: 4 },
  { a: 'stethoscope', b: 'doctor', relation: 'tool_user', level: 2 },
  { a: 'gavel', b: 'auctioneer', relation: 'tool_user', level: 5 },

  { a: 'librarian', b: 'library', relation: 'worker_place', level: 1 },
  { a: 'farmer', b: 'field', relation: 'worker_place', level: 1 },
  { a: 'miner', b: 'quarry', relation: 'worker_place', level: 3 },
  { a: 'cashier', b: 'checkout', relation: 'worker_place', level: 2 },

  { a: 'potter', b: 'vase', relation: 'worker_product', level: 2 },
  { a: 'tailor', b: 'suit', relation: 'worker_product', level: 1 },
  { a: 'brewer', b: 'beer', relation: 'worker_product', level: 2 },
  { a: 'playwright', b: 'drama', relation: 'worker_product', level: 4 },

  { a: 'spark', b: 'fire', relation: 'cause_effect', level: 1 },
  { a: 'insomnia', b: 'fatigue', relation: 'cause_effect', level: 3 },
  { a: 'pollution', b: 'smog', relation: 'cause_effect', level: 2 },
  { a: 'frost', b: 'damage', relation: 'cause_effect', level: 2 },

  { a: 'chilly', b: 'frigid', relation: 'degree', level: 3 },
  { a: 'fond', b: 'devoted', relation: 'degree', level: 5 },
  { a: 'angry', b: 'furious', relation: 'degree', level: 1 },
  { a: 'tired', b: 'exhausted', relation: 'degree', level: 1 },

  { a: 'compass', b: 'navigate', relation: 'object_function', level: 2 },
  { a: 'thermometer', b: 'measure', relation: 'object_function', level: 2 },
  { a: 'anchor', b: 'secure', relation: 'object_function', level: 3 },
  { a: 'filter', b: 'purify', relation: 'object_function', level: 3 },

  { a: 'goat', b: 'kid', relation: 'animal_young', level: 3 },
  { a: 'deer', b: 'fawn', relation: 'animal_young', level: 4 },
  { a: 'goose', b: 'gosling', relation: 'animal_young', level: 4 },
  { a: 'eagle', b: 'eaglet', relation: 'animal_young', level: 5 },

  { a: 'timber', b: 'furniture', relation: 'material_product', level: 1 },
  { a: 'sand', b: 'glass', relation: 'material_product', level: 3 },
  { a: 'cotton', b: 'fabric', relation: 'material_product', level: 1 },
  { a: 'milk', b: 'cheese', relation: 'material_product', level: 1 },

  { a: 'bird', b: 'falcon', relation: 'category_member', level: 1 },
  { a: 'vehicle', b: 'tractor', relation: 'category_member', level: 1 },
  { a: 'gemstone', b: 'opal', relation: 'category_member', level: 4 },
  { a: 'spice', b: 'cardamom', relation: 'category_member', level: 5 },

  { a: 'accelerate', b: 'decelerate', relation: 'opposite', level: 2 },
  { a: 'import', b: 'export', relation: 'opposite', level: 1 },
  { a: 'conceal', b: 'reveal', relation: 'opposite', level: 2 },
  { a: 'squander', b: 'conserve', relation: 'opposite', level: 5 },

  { a: 'barrel', b: 'cider', relation: 'container_content', level: 2 },
  { a: 'locker', b: 'equipment', relation: 'container_content', level: 1 },
  { a: 'satchel', b: 'books', relation: 'container_content', level: 2 },
  { a: 'urn', b: 'ashes', relation: 'container_content', level: 5 },

  // --- ampliação: relações novas ---------------------------------------------
  { a: 'lion', b: 'roar', relation: 'animal_sound', level: 1 },
  { a: 'wolf', b: 'howl', relation: 'animal_sound', level: 1 },
  { a: 'snake', b: 'hiss', relation: 'animal_sound', level: 1 },
  { a: 'owl', b: 'hoot', relation: 'animal_sound', level: 2 },
  { a: 'frog', b: 'croak', relation: 'animal_sound', level: 2 },
  { a: 'crow', b: 'caw', relation: 'animal_sound', level: 3 },
  { a: 'bee', b: 'buzz', relation: 'animal_sound', level: 2 },
  { a: 'duck', b: 'quack', relation: 'animal_sound', level: 3 },
  { a: 'donkey', b: 'bray', relation: 'animal_sound', level: 4 },

  { a: 'eye', b: 'sight', relation: 'body_sense', level: 1 },
  { a: 'ear', b: 'hearing', relation: 'body_sense', level: 1 },
  { a: 'tongue', b: 'taste', relation: 'body_sense', level: 1 },
  { a: 'nose', b: 'smell', relation: 'body_sense', level: 2 },
  { a: 'skin', b: 'touch', relation: 'body_sense', level: 2 },
  { a: 'palate', b: 'flavor', relation: 'body_sense', level: 4 },
  { a: 'cochlea', b: 'sound', relation: 'body_sense', level: 5 },
  { a: 'fingertip', b: 'texture', relation: 'body_sense', level: 3 },
  { a: 'nerve', b: 'sensation', relation: 'body_sense', level: 3 },

  { a: 'biology', b: 'organisms', relation: 'study_subject', level: 1 },
  { a: 'astronomy', b: 'stars', relation: 'study_subject', level: 1 },
  { a: 'geology', b: 'rocks', relation: 'study_subject', level: 2 },
  { a: 'cardiology', b: 'heart', relation: 'study_subject', level: 3 },
  { a: 'entomology', b: 'insects', relation: 'study_subject', level: 5 },
  { a: 'botany', b: 'plants', relation: 'study_subject', level: 2 },
  { a: 'meteorology', b: 'weather', relation: 'study_subject', level: 3 },
  { a: 'archaeology', b: 'artifacts', relation: 'study_subject', level: 3 },
  { a: 'ornithology', b: 'birds', relation: 'study_subject', level: 4 },

  { a: 'meter', b: 'length', relation: 'unit_measure', level: 1 },
  { a: 'gram', b: 'mass', relation: 'unit_measure', level: 1 },
  { a: 'second', b: 'time', relation: 'unit_measure', level: 1 },
  { a: 'liter', b: 'volume', relation: 'unit_measure', level: 2 },
  { a: 'ampere', b: 'current', relation: 'unit_measure', level: 4 },
  { a: 'watt', b: 'power', relation: 'unit_measure', level: 3 },
  { a: 'hertz', b: 'frequency', relation: 'unit_measure', level: 4 },
  { a: 'decibel', b: 'loudness', relation: 'unit_measure', level: 3 },
  { a: 'knot', b: 'speed', relation: 'unit_measure', level: 5 },

  { a: 'nest', b: 'bird', relation: 'shelter_animal', level: 1 },
  { a: 'den', b: 'fox', relation: 'shelter_animal', level: 2 },
  { a: 'hive', b: 'bee', relation: 'shelter_animal', level: 1 },
  { a: 'burrow', b: 'rabbit', relation: 'shelter_animal', level: 2 },
  { a: 'stable', b: 'horse', relation: 'shelter_animal', level: 1 },
  { a: 'kennel', b: 'dog', relation: 'shelter_animal', level: 3 },
  { a: 'coop', b: 'hen', relation: 'shelter_animal', level: 3 },
  { a: 'lodge', b: 'beaver', relation: 'shelter_animal', level: 5 },
  { a: 'web', b: 'spider', relation: 'shelter_animal', level: 4 },

  // --- reforço dos níveis 4 e 5 ----------------------------------------------
  // Os níveis altos estavam curtos (20 e 13 pares contra os 30 necessários).
  // Preferi escrever pares mais difíceis a deixar o gerador cair no nível
  // vizinho: num nível 5, a dificuldade TEM de vir do vocabulário do par.
  { a: 'vestibule', b: 'building', relation: 'part_whole', level: 4 },
  { a: 'hilt', b: 'sword', relation: 'part_whole', level: 4 },
  { a: 'keel', b: 'ship', relation: 'part_whole', level: 4 },
  { a: 'awl', b: 'cobbler', relation: 'tool_user', level: 4 },
  { a: 'apiarist', b: 'apiary', relation: 'worker_place', level: 4 },
  { a: 'attrition', b: 'decline', relation: 'cause_effect', level: 4 },
  { a: 'pleased', b: 'ecstatic', relation: 'degree', level: 4 },
  { a: 'crucible', b: 'melt', relation: 'object_function', level: 4 },
  { a: 'pulp', b: 'paper', relation: 'material_product', level: 4 },
  { a: 'legume', b: 'lentil', relation: 'category_member', level: 4 },
  { a: 'augment', b: 'diminish', relation: 'opposite', level: 4 },
  { a: 'decanter', b: 'wine', relation: 'container_content', level: 4 },

  { a: 'architrave', b: 'entablature', relation: 'part_whole', level: 5 },
  { a: 'pommel', b: 'saddle', relation: 'part_whole', level: 5 },
  { a: 'stamen', b: 'blossom', relation: 'part_whole', level: 5 },
  { a: 'adze', b: 'shipwright', relation: 'tool_user', level: 5 },
  { a: 'burin', b: 'engraver', relation: 'tool_user', level: 5 },
  { a: 'vintner', b: 'vineyard', relation: 'worker_place', level: 5 },
  { a: 'farrier', b: 'forge', relation: 'worker_place', level: 5 },
  { a: 'luthier', b: 'violin', relation: 'worker_product', level: 5 },
  { a: 'milliner', b: 'hat', relation: 'worker_product', level: 5 },
  { a: 'chandler', b: 'candle', relation: 'worker_product', level: 5 },
  { a: 'sedition', b: 'upheaval', relation: 'cause_effect', level: 5 },
  { a: 'desiccation', b: 'brittleness', relation: 'cause_effect', level: 5 },
  { a: 'piqued', b: 'incensed', relation: 'degree', level: 5 },
  { a: 'bellows', b: 'aerate', relation: 'object_function', level: 5 },
  { a: 'scythe', b: 'reap', relation: 'object_function', level: 5 },
  { a: 'latex', b: 'rubber', relation: 'material_product', level: 5 },
  { a: 'tallow', b: 'soap', relation: 'material_product', level: 5 },
  { a: 'raptor', b: 'osprey', relation: 'category_member', level: 5 },
  { a: 'exculpate', b: 'incriminate', relation: 'opposite', level: 5 },
  { a: 'coalesce', b: 'disperse', relation: 'opposite', level: 5 },
  { a: 'reliquary', b: 'relics', relation: 'container_content', level: 5 },
  { a: 'amphora', b: 'oil', relation: 'container_content', level: 5 },
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

export const SENTENCE_FRAMES: SentenceFrame[] = [
  {
    frame: 'The evidence was so ___ that the jury reached a verdict in under an hour.',
    answer: 'compelling',
    distractors: ['tedious', 'ambiguous', 'reluctant', 'ornate'],
    level: 1,
    rationale: {
      pt: 'Um veredito rápido indica prova FORTE. "compelling" (convincente) é o único que explica a pressa; "ambiguous" diria o contrário.',
      en:
        'A verdict that fast points to STRONG evidence. "compelling" is the only choice that explains the speed; "ambiguous" would say the opposite.',
    },
  },
  {
    frame: 'Although the road looked short on the map, the climb proved ___.',
    answer: 'arduous',
    distractors: ['effortless', 'brief', 'scenic', 'punctual'],
    level: 2,
    rationale: {
      pt: '"Although" anuncia contraste: o esperado era fácil, o real foi difícil. "arduous" é o contraste; "effortless" repetiria a expectativa.',
      en:
        '"Although" announces a contrast: the map promised easy, the reality was hard. "arduous" supplies the contrast; "effortless" would just repeat the expectation.',
    },
  },
  {
    frame: 'Her ___ replies gave the impression that she wanted the meeting to end.',
    answer: 'curt',
    distractors: ['rambling', 'cordial', 'detailed', 'hesitant'],
    level: 3,
    rationale: {
      pt: 'Querer encerrar produz respostas CURTAS e secas. "curt" casa; "rambling" e "detailed" alongariam a reunião.',
      en:
        'Wanting the meeting over produces SHORT, clipped replies. "curt" fits; "rambling" and "detailed" would drag the meeting out.',
    },
  },
  {
    frame: 'The committee was ___: not one member was willing to change position.',
    answer: 'intransigent',
    distractors: ['conciliatory', 'indecisive', 'enthusiastic', 'disorganized'],
    level: 5,
    rationale: {
      pt: 'Depois dos dois-pontos vem a definição: ninguém cede. "intransigent" é exatamente isso; "conciliatory" é o oposto.',
      en:
        'The colon introduces the definition: nobody will budge. "intransigent" is exactly that; "conciliatory" is its opposite.',
    },
  },
  {
    frame: 'What began as a ___ interest in photography became his life’s work.',
    answer: 'casual',
    distractors: ['obsessive', 'professional', 'lucrative', 'reluctant'],
    level: 2,
    rationale: {
      pt: '"What began as X became Y" pede contraste entre início e fim. O fim é "life’s work", então o início tem de ser leve: "casual".',
      en:
        '"What began as X became Y" asks for a contrast between start and end. The end is his life\'s work, so the start has to be light: "casual".',
    },
  },
  {
    frame: 'The old bridge was ___ by decades of neglect and finally closed to traffic.',
    answer: 'weakened',
    distractors: ['reinforced', 'celebrated', 'widened', 'inaugurated'],
    level: 1,
    rationale: {
      pt: 'Negligência por décadas + fechamento = deterioração. "weakened" é a única consequência coerente.',
      en:
        'Decades of neglect plus a closure add up to decay. "weakened" is the only consequence that holds together.',
    },
  },
  {
    frame: 'He offered a ___ apology, delivered in a monotone as he checked his watch.',
    answer: 'perfunctory',
    distractors: ['heartfelt', 'elaborate', 'tearful', 'public'],
    level: 5,
    rationale: {
      pt: 'Monotonia + olhar o relógio revelam desculpa feita por obrigação. "perfunctory" nomeia isso; "heartfelt" contradiz a cena.',
      en:
        'The monotone and the glance at the watch reveal an apology given out of obligation. "perfunctory" names it; "heartfelt" contradicts the scene.',
    },
  },
  {
    frame: 'The new policy was deliberately ___, leaving each department free to interpret it.',
    answer: 'vague',
    distractors: ['precise', 'mandatory', 'punitive', 'retroactive'],
    level: 3,
    rationale: {
      pt: 'Liberdade de interpretação decorre de texto impreciso. "vague" explica a liberdade; "precise" a eliminaria.',
      en:
        'Freedom to interpret follows from imprecise wording. "vague" explains the freedom; "precise" would remove it.',
    },
  },
  {
    frame: 'Supplies were ___ after the harvest, so the village stored what it could not use.',
    answer: 'abundant',
    distractors: ['scarce', 'perishable', 'expensive', 'rationed'],
    level: 1,
    rationale: {
      pt: 'Só se guarda o que sobra. "abundant" explica a sobra; "scarce" tornaria a frase incoerente.',
      en:
        'You only store what is left over. "abundant" explains the surplus; "scarce" would make the sentence incoherent.',
    },
  },
  {
    frame: 'The critic’s praise was ___ compared with the harsh reviews of the other papers.',
    answer: 'effusive',
    distractors: ['scathing', 'restrained', 'belated', 'anonymous'],
    level: 4,
    rationale: {
      pt: '"compared with harsh reviews" pede contraste: elogio caloroso. "effusive" contrasta; "scathing" seria mais do mesmo.',
      en:
        '"compared with harsh reviews" demands a contrast: warm praise. "effusive" contrasts; "scathing" would be more of the same.',
    },
  },
  {
    frame: 'Despite the storm warning, the captain remained ___ and kept the crew calm.',
    answer: 'composed',
    distractors: ['frantic', 'oblivious', 'seasick', 'indecisive'],
    level: 2,
    rationale: {
      pt: 'Manter a tripulação calma exige estar calmo. "composed" sustenta a segunda metade da frase.',
      en:
        'Keeping the crew calm requires being calm. "composed" is what holds up the second half of the sentence.',
    },
  },
  {
    frame: 'The manuscript was ___: three separate scribes had copied it over two centuries.',
    answer: 'composite',
    distractors: ['forged', 'pristine', 'illegible', 'anonymous'],
    level: 4,
    rationale: {
      pt: 'Os dois-pontos explicam: feito de partes de origens diferentes. "composite" nomeia isso.',
      en:
        'The colon explains it: made of parts from different sources. "composite" names that.',
    },
  },
  {
    frame: 'Funding was ___, so the team cut the study from three years to one.',
    answer: 'meager',
    distractors: ['generous', 'renewable', 'anonymous', 'taxable'],
    level: 3,
    rationale: {
      pt: 'Cortar o estudo é consequência de pouco dinheiro. "meager" é a causa; "generous" inverteria o resultado.',
      en:
        'Cutting the study short is the consequence of thin funding. "meager" is the cause; "generous" would invert the result.',
    },
  },
  {
    frame: 'His argument was ___, moving from evidence to conclusion without a gap.',
    answer: 'cogent',
    distractors: ['rambling', 'emotional', 'lengthy', 'rehearsed'],
    level: 5,
    rationale: {
      pt: '"sem lacuna entre prova e conclusão" descreve raciocínio rigoroso. "cogent" nomeia; "rambling" é o oposto.',
      en:
        '"from evidence to conclusion without a gap" describes rigorous reasoning. "cogent" names it; "rambling" is the opposite.',
    },
  },
  {
    frame: 'The drought made once-___ farmland useless within a single season.',
    answer: 'fertile',
    distractors: ['barren', 'distant', 'expensive', 'forested'],
    level: 2,
    rationale: {
      pt: '"once-___ ... useless" exige que antes fosse o contrário de inútil. "fertile" cria o contraste; "barren" o destruiria.',
      en:
        '"once-___ ... useless" requires the land to have been the opposite of useless before. "fertile" creates the contrast; "barren" would destroy it.',
    },
  },
  {
    frame: 'Because the instructions were ___, half the class assembled the kit incorrectly.',
    answer: 'confusing',
    distractors: ['detailed', 'illustrated', 'bilingual', 'laminated'],
    level: 1,
    rationale: {
      pt: '"Because" liga causa e efeito: metade errou, logo a instrução era ruim. "confusing" é a única causa que produz o erro.',
      en:
        '"Because" links cause and effect: half the class got it wrong, so the instructions were bad. "confusing" is the only cause that produces the error.',
    },
  },
  {
    frame: 'Years of ___ left the machinery rusted beyond repair.',
    answer: 'neglect',
    distractors: ['maintenance', 'innovation', 'inspection', 'investment'],
    level: 1,
    rationale: {
      pt: 'Ferrugem irreparável é consequência de abandono. "neglect" é a única causa coerente; "maintenance" produziria o oposto.',
      en:
        'Irreparable rust is the consequence of abandonment. "neglect" is the only coherent cause; "maintenance" would produce the opposite.',
    },
  },
  {
    frame: 'Attendance was ___ this year, with barely a third of the usual crowd.',
    answer: 'sparse',
    distractors: ['record-breaking', 'mandatory', 'ticketed', 'staggered'],
    level: 1,
    rationale: {
      pt: 'Um terço do público habitual é pouca gente. "sparse" descreve a escassez; os outros não dialogam com o número.',
      en:
        'A third of the usual crowd is very few people. "sparse" describes the shortfall; the others do not engage with the number.',
    },
  },
  {
    frame: 'Unlike her predecessor, who micromanaged every task, the new director was ___.',
    answer: 'hands-off',
    distractors: ['meticulous', 'controlling', 'intrusive', 'demanding'],
    level: 2,
    rationale: {
      pt: '"Unlike" exige o oposto de microgerenciar. "hands-off" inverte; os outros três são sinônimos de microgerenciar.',
      en:
        '"Unlike" demands the opposite of micromanaging. "hands-off" inverts it; the other three are synonyms for micromanaging.',
    },
  },
  {
    frame: 'The lecture was ___, covering four centuries of history in ninety minutes.',
    answer: 'sweeping',
    distractors: ['narrow', 'inaudible', 'cancelled', 'repetitive'],
    level: 2,
    rationale: {
      pt: 'Quatro séculos em noventa minutos é escopo amplo. "sweeping" descreve a amplitude; "narrow" contradiz o dado.',
      en:
        'Four centuries in ninety minutes is broad scope. "sweeping" describes the breadth; "narrow" contradicts the figure.',
    },
  },
  {
    frame: 'Rather than confront the problem, the board chose to ___ the decision to next quarter.',
    answer: 'defer',
    distractors: ['announce', 'reverse', 'enforce', 'publish'],
    level: 2,
    rationale: {
      pt: '"Rather than confront" anuncia fuga. Empurrar para o próximo trimestre é adiar: "defer".',
      en:
        '"Rather than confront" announces avoidance. Pushing the decision to next quarter is postponing it: "defer".',
    },
  },
  {
    frame: 'The startup burned through its funding in months, a ___ that its investors had predicted.',
    answer: 'collapse',
    distractors: ['triumph', 'merger', 'expansion', 'rebate'],
    level: 3,
    rationale: {
      pt: 'Queimar o caixa em meses é fracasso. "collapse" nomeia o desfecho; "triumph" contradiz a primeira metade.',
      en:
        'Burning through funding in months is failure. "collapse" names the outcome; "triumph" contradicts the first half.',
    },
  },
  {
    frame: 'The treaty was ___ only after eleven rounds of talks spread over four years.',
    answer: 'ratified',
    distractors: ['drafted', 'rejected', 'leaked', 'translated'],
    level: 3,
    rationale: {
      pt: '"only after" tantas rodadas indica o passo FINAL do processo. "ratified" é o desfecho; "drafted" seria o começo.',
      en:
        '"only after" that many rounds marks the FINAL step of the process. "ratified" is the outcome; "drafted" would be the beginning.',
    },
  },
  {
    frame: 'The audit found no errors at all, a result the accountants called ___.',
    answer: 'unprecedented',
    distractors: ['routine', 'alarming', 'preliminary', 'confidential'],
    level: 3,
    rationale: {
      pt: '"no errors at all" é resultado extraordinário. "unprecedented" reage à raridade; "routine" anularia o "at all".',
      en:
        '"no errors at all" is an extraordinary result. "unprecedented" reacts to the rarity; "routine" would cancel out the "at all".',
    },
  },
  {
    frame: 'The negotiator stayed ___ even as both sides raised their voices.',
    answer: 'impassive',
    distractors: ['agitated', 'triumphant', 'apologetic', 'bewildered'],
    level: 4,
    rationale: {
      pt: '"even as" marca contraste com o clima da sala: todos exaltados, ele imperturbável. "agitated" repetiria a cena em vez de contrastar.',
      en:
        '"even as" marks a contrast with the mood of the room: everyone else raised, he unmoved. "agitated" would repeat the scene instead of contrasting with it.',
    },
  },
  {
    frame: 'His memory of the accident was ___, limited to a sound and a flash of light.',
    answer: 'fragmentary',
    distractors: ['vivid', 'photographic', 'fabricated', 'traumatic'],
    level: 4,
    rationale: {
      pt: 'A vírgula explica a lacuna: só restaram pedaços soltos. "fragmentary" nomeia isso; "vivid" contradiz o que vem depois.',
      en:
        'The comma explains the gap: only loose pieces remain. "fragmentary" names that; "vivid" contradicts what follows.',
    },
  },
  {
    frame: 'She was ___ about the deadline, refusing every request for an extension.',
    answer: 'adamant',
    distractors: ['flexible', 'uncertain', 'apologetic', 'forgetful'],
    level: 4,
    rationale: {
      pt: 'Recusar cada um dos pedidos revela firmeza inabalável. "adamant" casa; "flexible" tornaria a segunda metade impossível.',
      en:
        'Refusing every single request reveals unshakeable firmness. "adamant" fits; "flexible" would make the second half impossible.',
    },
  },
  {
    frame: 'The reforms were ___: they changed the letter of the law but not a single practice.',
    answer: 'cosmetic',
    distractors: ['sweeping', 'overdue', 'unpopular', 'expensive'],
    level: 5,
    rationale: {
      pt: 'Os dois-pontos definem: mudança de fachada. "cosmetic" é exatamente isso; "sweeping" diria o contrário.',
      en:
        'The colon defines it: a change of facade only. "cosmetic" is exactly that; "sweeping" would say the opposite.',
    },
  },
  {
    frame: 'The witness gave an ___ account, adding details that no one else had mentioned.',
    answer: 'embellished',
    distractors: ['terse', 'sworn', 'recorded', 'translated'],
    level: 5,
    rationale: {
      pt: 'Acrescentar detalhes que ninguém mais viu sugere enfeite. "embellished" nomeia; "terse" contradiz o acréscimo.',
      en:
        'Adding details nobody else saw suggests embroidery. "embellished" names it; "terse" contradicts the addition.',
    },
  },
  {
    frame: 'The proposal was ___ enough to satisfy both factions without committing to either.',
    answer: 'ambiguous',
    distractors: ['explicit', 'binding', 'itemized', 'notarized'],
    level: 5,
    rationale: {
      pt: 'Agradar dois lados sem se comprometer exige texto que admite duas leituras. "ambiguous" é o mecanismo; "explicit" o impediria.',
      en:
        'Pleasing both sides without committing requires wording that allows two readings. "ambiguous" is the mechanism; "explicit" would prevent it.',
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
