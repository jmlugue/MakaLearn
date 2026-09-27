/**
 * Questions for Makaton / PECS words that are not built-in cards, so a card a teacher makes (for example
 * "Apple" or "Doctor") gets ready questions. Every word in `src/data/symbol-vocabulary.ts` has a profile here
 * (a test checks). Words share a `group`; words in the same group are never wrong choices for each other, so
 * each question keeps one right answer. Every line must pass `rules.ts`.
 *
 * Fill in the blank sentences live in `vocabulary-fill.ts`. The profiles below hold each word's group and its
 * Choose the picture question (a retired type, kept for old activities).
 *
 * To add a word: add it to `symbol-vocabulary.ts`, add a profile below with one of the helpers (or `q`), add
 * its sentence to `vocabulary-fill.ts`, then run `npm run test:activities`.
 */
import type { BankEntry } from "./built-in";
import { vocabularyFill } from "./vocabulary-fill";

/** A word's questions. `hint` picks between two meanings by category name ("orange" in Colors). */
export type WordProfile = BankEntry & { hint?: string[] };

/** A hand-written Choose question. The Fill sentence is joined from `vocabulary-fill.ts`. */
function q(group: string, choose: string | string[], hint?: string[]): WordProfile {
  return { group, fill: [], choose: ([] as string[]).concat(choose), hint };
}

/** A feeling, from a short present-tense situation: "my toy breaks". */
function feel(when: string, choose?: string): WordProfile {
  return q("feeling", choose ?? `How do I feel when ${when}?`);
}

/** A thing, from its kind and a description: Which fruit is long and yellow? */
function it(group: string, cls: string, desc: string, hint?: string[]): WordProfile {
  return q(group, `Which ${cls} ${desc}?`, hint);
}

/** Several things: Which fruits are small and round? */
function they(group: string, cls: string, desc: string): WordProfile {
  return q(group, `Which ${cls} ${desc}?`);
}

/** An action, from a short situation: "What do I do when the music plays?" */
function act(when: string, choose?: string): WordProfile {
  return q("action", choose ?? `What do I do when ${when}?`);
}

/** A place, from what we do there. */
function place(todo: string): WordProfile {
  return q("place", `Where do we go to ${todo}?`);
}

/** A color, from something that has it. */
function color(thing: string, hint?: string[]): WordProfile {
  return q("color", `What color is ${thing}?`, hint);
}

/** A part of the body, from what it helps me do. */
function body(todo: string, plural = false): WordProfile {
  return plural ? q("body", `Which parts of my body help me ${todo}?`) : q("body", `Which part of my body helps me ${todo}?`);
}

/** A ride (car, bus, boat), from a description. */
function ride(desc: string): WordProfile {
  return it("ride", "ride", desc);
}

/** An animal, from a description. */
function animal(desc: string, hint?: string[]): WordProfile {
  return it("animal", "animal", desc, hint);
}

/** A small word, from a quoted example with the gap. */
function word(example: string): WordProfile {
  return q("word", `Which word finishes "${example}"?`);
}

const rawWordProfiles: Record<string, WordProfile | WordProfile[]> = {
  // Greetings
  hi: q("greeting", "What short word do I say to a friend?"),
  bye: q("greeting", "What short word do I say when I leave?"),
  "good afternoon": q("greeting", "What do I say to someone after lunch time?"),
  "good night": q("greeting", "What do I say to my family at bedtime?"),
  "good evening": q("greeting", "What do I say when I meet someone at sunset?"),
  "excuse me": q("greeting", "What do I say to get past someone?"),
  welcome: q("greeting", "What do we say to a new classmate?"),
  "see you": q("greeting", "What do I say to a friend I meet tomorrow?"),
  "nice to meet you": q("greeting", "What do I say to a person I just met?"),
  "how are you": q("greeting", "What do I ask to know if someone is well?"),

  // Feelings
  mad: feel("my brother breaks my crayon"),
  afraid: feel("I hear a strange noise"),
  sleepy: feel("I yawn at bedtime"),
  bad: feel("I break Mom's cup"),
  good: feel("I help my friend"),
  okay: feel("my small cut stops hurting"),
  fine: feel("I am not sick anymore"),
  excited: q("feeling", "How do I feel before a trip to the zoo?"),
  bored: feel("I have nothing to do"),
  worried: feel("my pet is sick"),
  nervous: feel("I sing on the stage"),
  calm: feel("I breathe slowly and rest"),
  upset: feel("my drawing gets torn"),
  frustrated: feel("my puzzle will not fit"),
  shy: feel("I meet many new people"),
  proud: feel("I finish a hard puzzle"),
  surprised: feel("friends jump out and shout"),
  confused: feel("the steps make no sense"),
  lonely: feel("no one plays with me"),
  silly: feel("I make funny faces"),
  grumpy: feel("I wake up too early"),
  jealous: feel("my sister gets a toy"),
  embarrassed: feel("everyone laughs when I trip"),
  love: q("feeling", "What word tells how much I care for Mom?"),
  like: q("feeling", "What word tells that I enjoy something?"),
  hungry: q("feeling", "How do I feel when my tummy rumbles?"),
  thirsty: feel("my mouth is very dry"),
  cold: q("feeling", "How do I feel after playing in the rain?"),
  pain: q("feeling", "What do I feel when I hurt my leg?"),
  ill: q("feeling", "How do I feel when I have a bad fever?"),
  better: feel("my medicine starts to work"),
  unwell: feel("my head and tummy hurt"),
  cry: act("I fall and hurt my knee", "What do I do when tears fall from my eyes?"),
  laugh: act("my friend tells a funny joke", "What do I do when I hear a funny joke?"),
  smile: act("I see my mom at the gate", "What do I do with my mouth when happy?"),

  // People
  me: word("Give it to ___"),
  my: word("This is ___ bag"),
  mine: word("That toy is ___"),
  your: word("Is this ___ pencil?"),
  he: q("word", "Which word do we use for a boy, like Ben?"),
  she: q("word", "Which word do we use for a girl, like Ana?"),
  we: q("word", "Which word means me and my friends together?"),
  they: q("word", "Which word do we use for other people or things?"),
  it: q("word", "Which word is for a thing, like a ball?"),
  mom: q("person", "What do I call my mother?"),
  mum: q("person", "What is another name for my mother?"),
  mummy: q("person", "What does a small child call Mother?"),
  dad: q("person", "What do I call my father?"),
  daddy: q("person", "What does a small child call Father?"),
  parent: q("person", "What is a mom or dad called?"),
  brother: q("person", "Which boy in my family shares my parents?"),
  sister: q("person", "Which girl in my family shares my parents?"),
  baby: q("person", "Who is very small and sleeps in a crib?"),
  grandmother: q("person", "Who is my mother's mother?"),
  grandma: q("person", "What do I call my mom's mom?"),
  grandfather: q("person", "Who is my father's father?"),
  grandpa: q("person", "What do I call my dad's dad?"),
  aunt: q("person", "Who is my mom's sister?"),
  uncle: q("person", "Who is my dad's brother?"),
  cousin: q("person", "Who is my aunt's child?"),
  family: q("person", "What do we call the people I live with?"),
  boy: q("person", "What is a young child who is not a girl?"),
  girl: q("person", "What is a young child who is not a boy?"),
  man: q("person", "What is a grown-up boy called?"),
  woman: q("person", "What is a grown-up girl called?"),
  child: q("person", "What is a young person called?"),
  children: q("person", "What do we call many young boys and girls?"),
  people: q("person", "What do we call many men and women?"),
  doctor: q("person", "Who helps me get better when I am sick?"),
  nurse: q("person", "Who helps the doctor and gives me a shot?"),
  police: q("person", "Who keeps our town safe from bad people?"),
  principal: q("person", "Who is the leader of our school?"),
  classmate: q("person", "Who learns with me in the same class?"),
  helper: q("person", "Who helps the teacher in our classroom?"),
  neighbor: q("person", "Who lives in the house next to mine?"),

  // Food
  snack: q("food", "What small food do I eat at recess?"),
  breakfast: q("food", "What meal do I eat in the morning?"),
  lunch: q("food", "What meal do we eat at noon?"),
  dinner: q("food", "What meal do we eat at night?"),
  meal: q("food", "What do we call food we eat at the table?"),
  toast: it("food", "bread", "is warm and crunchy from the toaster"),
  sandwich: it("food", "food", "has bread on top and bottom"),
  egg: it("food", "food", "comes from a hen and has a shell"),
  chicken: [
    it("food", "food", "is meat from a bird that clucks"),
    animal("says cluck and lays eggs", ["animal", "farm", "pet"])
  ],
  fish: [
    it("food", "food", "swims in the sea before we cook it"),
    animal("swims in water and has fins", ["animal", "sea", "pet"])
  ],
  meat: it("food", "food", "comes from animals like cows and pigs"),
  pork: it("food", "food", "is meat from a pig"),
  beef: it("food", "food", "is meat from a cow"),
  hotdog: it("food", "food", "is a long sausage in a bun"),
  burger: it("food", "food", "is a round patty in a bun"),
  pizza: it("food", "food", "is round and flat with cheese on top"),
  pasta: it("food", "food", "is made from flour and cooked in water"),
  noodles: they("food", "foods", "are long, thin, and slurpy"),
  spaghetti: it("food", "food", "is long and thin with red sauce"),
  soup: it("food", "food", "is a warm liquid in a bowl"),
  cereal: it("food", "food", "comes in a box and goes with milk"),
  cheese: it("food", "food", "is yellow and made from milk"),
  butter: it("food", "food", "is soft and yellow to put on bread"),
  jam: it("food", "food", "is sweet and made from fruit for bread"),
  biscuit: it("food", "snack", "is small, hard, and sweet"),
  cookie: it("food", "snack", "is round and sweet with chocolate chips"),
  cake: it("food", "food", "has candles on top at a birthday party"),
  candy: it("food", "snack", "is very sweet and comes in a wrapper"),
  chocolate: it("food", "snack", "is sweet and brown and melts"),
  "ice cream": it("food", "snack", "is cold and sweet in a cone"),
  chips: they("food", "snacks", "are thin, salty, and crunchy"),
  fries: they("food", "foods", "are long, salty potato sticks"),
  crackers: they("food", "snacks", "are flat, dry, and crunchy squares"),
  yogurt: it("food", "food", "is cold and creamy and made from milk"),
  fruit: q("food", "What sweet food grows on trees?"),
  apple: it("food", "fruit", "is red, round, and crunchy"),
  orange: [it("food", "fruit", "is round and has a thick peel"), color("a carrot", ["color", "colour"])],
  mango: it("food", "fruit", "is yellow, sweet, and juicy"),
  grapes: they("food", "fruits", "are small, round, and grow in bunches"),
  pineapple: it("food", "fruit", "is spiky on the outside and sweet inside"),
  watermelon: it("food", "fruit", "is green outside and red inside"),
  strawberry: it("food", "fruit", "is small and red with tiny seeds"),
  papaya: it("food", "fruit", "is orange inside with black seeds"),
  vegetable: q("food", "What kind of food is a carrot?"),
  carrot: it("food", "vegetable", "is orange and long, and rabbits love it"),
  potato: it("food", "vegetable", "is brown and grows under the ground"),
  tomato: it("food", "vegetable", "is red and round and goes in salad"),
  corn: it("food", "vegetable", "is yellow and grows on a cob"),
  peas: they("food", "vegetables", "are small, round, and green"),
  salad: it("food", "food", "is a bowl of fresh green leaves"),
  sugar: it("food", "food", "is white and makes food sweet"),
  salt: it("food", "food", "is white and makes food salty"),
  full: q("feeling", "How does my tummy feel after a big lunch?"),
  yummy: q("describing", "What word tells that food tastes good?"),
  delicious: q("describing", "What long word means food tastes very good?"),

  // Drinks
  juice: it("drink", "drink", "is made from squeezed fruit"),
  tea: it("drink", "drink", "is hot and made from leaves"),
  coffee: it("drink", "drink", "is hot and brown, and grown-ups drink it"),
  "chocolate milk": it("drink", "drink", "is brown, sweet, and cold"),
  soda: it("drink", "drink", "is sweet and fizzy with bubbles"),
  cup: it("home", "thing", "holds my drink and has a handle"),
  bottle: it("home", "thing", "holds water and has a cap"),
  glass: it("home", "thing", "is clear, holds water, and can break"),

  // Actions
  "sit down": act("the teacher starts the story"),
  "stand up": act("the flag song begins"),
  watch: act("my show is on TV"),
  draw: act("I have paper and crayons"),
  color: act("I have crayons and a picture", "What do I do with crayons and a picture?"),
  paint: q("action", "What do I do with a brush and colors?"),
  cut: act("I have paper and scissors"),
  glue: act("two papers must stick"),
  go: act("the light turns green"),
  come: act("my teacher waves at me"),
  "come here": q("action", "What does Mom say when she wants me near her?"),
  walk: act("the hallway is busy"),
  run: act("we race at sports day"),
  jump: act("I see a puddle"),
  hop: q("action", "What do I do on one foot like a bunny?"),
  climb: act("I reach the ladder"),
  dance: act("the music plays"),
  sing: act("it is music class"),
  play: act("it is recess time"),
  work: act("the teacher gives a task"),
  give: act("my friend has no pencil"),
  take: act("the teacher offers a sticker"),
  get: act("I need my water bottle"),
  put: act("I finish with my toys"),
  open: act("it is time for recess"),
  close: act("the room is too windy"),
  push: act("the swing stops"),
  pull: act("I bring my wagon along"),
  throw: act("we play catch"),
  catch: act("my friend throws the ball"),
  kick: act("we play soccer"),
  "wake up": act("the morning alarm rings"),
  wash: act("my plate is dirty"),
  brush: act("my hair is messy"),
  "brush teeth": act("I finish eating at night"),
  bath: q("action", "What do I take in the tub to get clean?"),
  shower: q("action", "What do I take to wash under running water?"),
  dress: [
    act("it is time for school"),
    it("clothes", "clothing", "is one piece with a skirt", ["clothes", "clothing", "wear"])
  ],
  "get dressed": act("I wake up for school"),
  cook: act("the family is hungry"),
  clean: act("my room is messy"),
  "tidy up": act("toys cover the floor"),
  "line up": act("the bell rings for class"),
  share: act("my friend has no snack"),
  turn: q("action", "What is it when it is my chance to play?"),
  "my turn": q("action", "What do I say when I get my chance?"),
  "your turn": q("action", "What do I say to give my friend a chance?"),
  finish: act("my work is almost done"),
  done: q("word", "What word means all finished?"),
  start: act("the teacher says go"),
  again: q("word", "What word means one more time?"),
  need: q("action", "What word tells what I must have?"),
  have: q("action", "What word tells what I hold as mine?"),
  make: act("I have blocks"),
  see: act("I open my eyes"),
  hear: act("the bell rings"),
  talk: act("my friend asks a question"),
  say: q("action", "What do I do with words from my mouth?"),
  tell: act("I have a story"),
  ask: act("I need to know something"),
  answer: act("my teacher asks a question"),
  point: act("I see a bird"),
  show: act("I made a drawing"),
  think: act("the puzzle is hard"),
  know: q("action", "What word tells that I understand something?"),
  learn: act("I go to school"),
  count: act("I have five blocks"),
  find: act("I lost my pencil"),
  hide: act("my friend starts to seek"),
  carry: act("I pick up my bag"),
  fall: act("I trip on a rock"),
  "sit quietly": q("action", "What do we do during story time on the mat?"),
  "be quiet": q("action", "What do we do when the baby is sleeping?"),
  clap: act("my friend wins the race"),
  wave: act("my bus leaves"),
  hug: act("Grandma comes to visit"),
  kiss: act("Mom leaves for work"),
  swim: act("I jump into the pool"),
  ride: act("I get on my bike"),
  drive: q("action", "What does Dad do with a car?"),
  fly: q("action", "What do birds do with their wings?"),
  buy: q("action", "What do I do with money at the store?"),
  pay: q("action", "What do I do with money at the counter?"),
  call: act("I miss Grandma"),

  // Small words
  not: word("A mouse is ___ big"),
  was: word("Yesterday it ___ sunny"),
  be: word("Please ___ kind"),
  do: word("What ___ you want?"),
  can: word("Fish ___ swim"),
  will: word("Tomorrow I ___ play"),
  the: word("Close ___ door, please"),
  and: word("Salt ___ pepper"),
  or: word("Red ___ blue, pick one"),
  with: word("I play ___ my friend"),
  for: word("This gift is ___ you"),
  to: word("I walk ___ the park"),
  in: word("The fish is ___ the water"),
  on: word("The cat sits ___ the mat"),
  under: q("word", "Which word tells that the ball is below the table?"),
  up: q("word", "Which word tells where a balloon goes?"),
  down: q("word", "Which word tells where the rain falls?"),
  here: q("word", "Which word means this place near me?"),
  there: q("word", "Which word means that place far away?"),
  this: q("word", "Which word points to a thing near me?"),
  that: q("word", "Which word points to a thing far away?"),
  what: q("word", "Which word asks about a thing?"),
  where: q("word", "Which word asks about a place?"),
  who: q("word", "Which word asks about a person?"),
  when: q("word", "Which word asks about a time?"),
  why: q("word", "Which word asks for a reason?"),
  how: q("word", "Which word asks the way something is done?"),
  which: q("word", "What word asks you to pick one of many?"),
  all: q("word", "What word means every one of them?"),
  some: q("word", "What word means a few, not all?"),
  many: q("word", "What word means a lot of things?"),
  less: q("word", "What word means not as much?"),
  same: q("word", "What word means just alike?"),
  different: q("word", "What word means not the same?"),
  now: q("word", "What word means at this very time?"),
  later: q("word", "What word means not now, but after?"),
  first: q("word", "What word tells who is number one in line?"),
  next: q("word", "What word tells whose turn comes after this one?"),
  then: q("word", "What word tells what comes after first?"),
  last: q("word", "What word tells who is at the very end?"),
  before: q("word", "What word means earlier than something?"),
  after: q("word", "What word means later than something?"),
  today: q("word", "What word means this day?"),
  tomorrow: q("word", "What word means the day after today?"),
  yesterday: q("word", "What word means the day before today?"),
  morning: q("word", "What time of day does the sun come up?"),
  afternoon: q("word", "What time of day comes after lunch?"),
  night: q("word", "What time is it when the moon is out?"),
  time: q("word", "What does a clock tell us?"),

  // Needs
  bathroom: q("need", "Which room has a toilet and a sink?"),
  potty: q("need", "What small seat does a baby use to pee?"),
  pee: q("need", "What do I need to do after lots of water?"),
  poo: q("need", "What else do I do on the toilet besides pee?"),
  tissue: q("need", "What do I use to wipe my runny nose?"),
  medicine: q("need", "What does the doctor give to help me get well?"),
  break: q("action", "What do we take after working a long time?"),
  quiet: q("describing", "How should we be when the baby sleeps?"),
  noise: q("need", "What do we hear when a drum bangs?"),
  loud: q("describing", "How does a drum sound when it bangs?"),
  safe: q("need", "What word means no one can get hurt?"),
  careful: q("need", "What word do we say near a wet floor?"),
  emergency: q("need", "What do we call a time we need help fast?"),

  // Describing
  big: q("describing", "What word tells the size of an elephant?"),
  small: q("describing", "What word tells the size of an ant?"),
  little: q("describing", "What word means tiny, like baby hands?"),
  long: q("describing", "What word tells about a snake from end to end?"),
  short: q("describing", "What word is the opposite of long?"),
  tall: q("describing", "What word tells about a giraffe's height?"),
  fast: q("describing", "What word tells how a race car moves?"),
  slow: q("describing", "What word tells how a turtle moves?"),
  warm: q("describing", "How do I feel under a thick blanket?"),
  wet: q("describing", "How are my clothes after the rain?"),
  dry: q("describing", "What is a towel after hanging in the sun?"),
  dirty: q("describing", "What are my hands after playing in mud?"),
  soft: q("describing", "How does a pillow feel when I hug it?"),
  hard: q("describing", "How does a rock feel in my hand?"),
  heavy: q("describing", "What word tells about a bag full of books?"),
  light: q("describing", "What word tells about a feather's weight?"),
  new: q("describing", "What word tells about a toy I just got?"),
  old: q("describing", "What word tells about Grandpa's hat from long ago?"),
  empty: q("describing", "What is my cup when nothing is in it?"),
  closed: q("describing", "What word means the store is not open?"),
  nice: q("describing", "What word tells about a friend who shares?"),
  pretty: q("describing", "What word tells how lovely the flowers look?"),
  ugly: q("describing", "What word is the opposite of pretty?"),
  funny: q("describing", "What word tells about a clown's silly faces?"),
  easy: q("describing", "What word means not hard to do?"),
  difficult: q("describing", "What long word means very hard to do?"),
  right: q("describing", "What word tells that my answer is correct?"),
  wrong: q("describing", "What word tells that my answer is not right?"),
  dark: q("describing", "What is a room like with the lights off?"),
  bright: q("describing", "What word tells about the shining sun?"),
  broken: q("describing", "What word tells about a cracked toy?"),

  // Colors
  red: color("a ripe strawberry"),
  blue: color("the clear sky"),
  yellow: color("a ripe banana"),
  green: color("the fresh grass"),
  purple: color("a bunch of grapes"),
  pink: color("a flamingo"),
  black: color("the night sky"),
  white: color("the fluffy clouds"),
  brown: color("a chocolate bar"),
  gray: color("an elephant"),
  grey: color("a rain cloud"),
  gold: color("a shiny crown"),
  silver: color("a shiny spoon"),

  // Numbers
  one: q("number", "How many noses do I have?"),
  two: q("number", "How many eyes do I have?"),
  three: q("number", "How many sides does a triangle have?"),
  four: q("number", "How many legs does a dog have?"),
  five: q("number", "How many fingers are on one hand?"),
  six: q("number", "How many legs does an ant have?"),
  seven: q("number", "How many days are in one week?"),
  eight: q("number", "How many legs does a spider have?"),
  nine: q("number", "Which number comes right after eight?"),
  ten: q("number", "How many fingers are on my two hands?"),
  zero: q("number", "How many cookies are in an empty jar?"),
  number: q("number", "What do we call one, two, and three?"),

  // Shapes
  circle: it("shape", "shape", "is round like a ball"),
  square: it("shape", "shape", "has four sides that are all the same"),
  triangle: it("shape", "shape", "has three sides and three corners"),
  rectangle: it("shape", "shape", "has four sides, two long and two short"),
  star: it("shape", "shape", "has five points and shines in the sky"),
  heart: it("shape", "shape", "is a sign for love"),
  shape: q("shape", "What do we call a circle or a square?"),

  // Body
  body: q("body", "What do my head, arms, and legs make up?"),
  head: q("body", "Where do I wear my hat in the sun?"),
  hair: q("body", "What do I brush and comb on my head?"),
  face: q("body", "Where are my eyes, nose, and mouth?"),
  eyes: body("see", true),
  eye: q("body", "Which one part do I close to wink?"),
  ears: body("hear", true),
  ear: q("body", "Where do I whisper a secret to a friend?"),
  nose: body("smell"),
  mouth: body("eat and talk"),
  teeth: q("body", "What do I use to chew my food?"),
  tongue: body("taste"),
  neck: q("body", "What part of my body holds up my head?"),
  shoulder: q("body", "Where do I put the strap of my bag?"),
  arm: q("body", "What do I raise high to ask a question?"),
  hand: body("hold a spoon"),
  hands: q("body", "What do I clap together to cheer?"),
  finger: q("body", "What part of my hand do I point with?"),
  tummy: q("body", "Where does my food go after I eat?"),
  stomach: q("body", "What is another word for my tummy?"),
  back: q("body", "Where do I carry my school bag?"),
  leg: q("body", "What do I use to kick a ball?"),
  knee: q("body", "What bends in the middle of my leg?"),
  foot: q("body", "Where do I put one shoe?"),
  feet: q("body", "Where do I wear my socks and shoes?"),
  toes: q("body", "What can I wiggle inside my socks?"),

  // Clothes
  clothes: q("clothes", "What do I wear to cover my body?"),
  shirt: it("clothes", "clothing", "has buttons and covers my chest"),
  "t-shirt": it("clothes", "clothing", "has short sleeves and no buttons"),
  pants: they("clothes", "clothes", "cover my legs all the way down"),
  shorts: they("clothes", "clothes", "are short and show my knees"),
  skirt: it("clothes", "clothing", "hangs from my waist and swings"),
  uniform: it("clothes", "clothing", "is what all students wear to school"),
  jacket: it("clothes", "clothing", "keeps me warm and has a zipper"),
  coat: it("clothes", "clothing", "is long and warm for cold days"),
  hat: it("clothes", "clothing", "goes on my head in the sun"),
  cap: it("clothes", "clothing", "has a bill to shade my eyes"),
  shoes: they("clothes", "clothes", "go on my feet when I go out"),
  socks: they("clothes", "clothes", "go on my feet under my shoes"),
  slippers: they("clothes", "clothes", "are soft and I wear them at home"),
  bag: it("school", "thing", "holds my books for school"),

  // School
  school: q("place", "Where do I go to learn with my teacher?"),
  class: q("school", "What starts when the bell rings at school?"),
  classroom: q("place", "Which room has my desk and the board?"),
  book: it("school", "thing", "has pages with words and pictures"),
  pencil: it("school", "thing", "writes and has an eraser on top"),
  pen: it("school", "thing", "writes in ink and cannot be erased"),
  crayon: it("school", "thing", "is waxy and I color with it"),
  paper: it("school", "thing", "is thin and white for writing"),
  scissors: they("school", "tools", "cut paper and have two blades"),
  eraser: it("school", "thing", "rubs out my pencil marks"),
  ruler: it("school", "thing", "is long and helps me draw straight lines"),
  desk: it("school", "thing", "is where I sit and work in class"),
  table: it("home", "thing", "has four legs, and we eat on it"),
  chair: it("home", "thing", "is a seat with legs and a back"),
  board: it("school", "thing", "hangs on the wall for writing"),
  computer: it("school", "thing", "has a screen and a keyboard"),
  tablet: it("school", "thing", "is flat with a touch screen"),
  homework: q("school", "What school work do I do at home?"),
  lesson: q("school", "What does the teacher teach in class?"),
  story: q("school", "What does the teacher read to us at circle time?"),
  song: q("school", "What do we sing in music class?"),
  music: q("school", "What do we hear from a piano?"),
  art: q("school", "In which class do we paint and draw?"),
  recess: q("school", "What break do we have to play at school?"),
  playground: q("place", "Where are the swings and slides at school?"),
  library: q("place", "Where do we go to borrow books?"),
  line: q("school", "What do we make when we stand one behind another?"),
  "circle time": q("school", "When do we sit in a ring on the mat?"),

  // Home
  home: q("place", "Where do I go after school to see my family?"),
  house: it("place", "building", "is where my family lives"),
  room: q("home", "What is a space in a house with walls?"),
  bedroom: q("place", "Which room has my bed?"),
  kitchen: q("place", "Which room does Mom cook in?"),
  bed: it("home", "thing", "is where I sleep at night"),
  door: it("home", "thing", "opens and closes to let me in"),
  window: it("home", "thing", "is glass, and I look outside through it"),
  tv: q("home", "What do I watch cartoons on at home?"),
  television: q("home", "What screen at home shows the news?"),
  phone: it("home", "thing", "rings, and I talk to Grandma on it"),
  sofa: it("home", "thing", "is a long soft seat for the family"),
  blanket: it("home", "thing", "keeps me warm in bed at night"),
  pillow: it("home", "thing", "is soft under my head in bed"),
  toothbrush: it("home", "thing", "helps me clean my teeth"),
  soap: it("home", "thing", "makes bubbles and cleans my hands"),
  towel: it("home", "thing", "dries my body after a bath"),
  plate: it("home", "thing", "is flat and holds my food"),
  bowl: it("home", "thing", "is round and deep, and holds my soup"),
  spoon: it("home", "thing", "helps me eat soup and rice"),
  fork: it("home", "thing", "has sharp points to pick up food"),
  knife: it("home", "thing", "cuts food, and only grown-ups use it"),

  // Places and rides
  park: place("play on the swings"),
  shop: place("buy things we need"),
  store: place("buy snacks and milk"),
  market: place("buy fresh fish and vegetables"),
  church: place("pray on Sunday"),
  hospital: place("stay when very sick"),
  clinic: place("get a checkup"),
  outside: q("place", "Where do we play in the sun?"),
  inside: q("place", "Where do we play when it rains?"),
  garden: place("see flowers and plants grow"),
  beach: place("swim and play in sand"),
  zoo: place("see lions and elephants"),
  car: ride("has four wheels and seats for my family"),
  bus: ride("is big and takes many kids to school"),
  jeepney: ride("has a long back seat and many riders"),
  tricycle: ride("has three wheels and a side seat"),
  train: ride("runs on tracks and has many cars"),
  bike: ride("has two wheels and pedals"),
  boat: ride("floats on the water"),
  plane: ride("flies high in the sky with wings"),
  road: q("place", "Where do cars and buses drive?"),

  // Toys
  toy: q("toy", "What do I play with in my room?"),
  ball: it("toy", "toy", "is round, and I kick or throw it"),
  doll: it("toy", "toy", "looks like a little baby"),
  blocks: they("toy", "toys", "stack up to build a tower"),
  puzzle: it("toy", "toy", "has pieces that fit together"),
  game: q("toy", "What do we play with dice and pieces?"),
  bubbles: they("toy", "toys", "float and pop when I blow them"),
  "car toy": it("toy", "toy", "is a tiny car with wheels"),
  teddy: it("toy", "toy", "is a soft bear I hug at night"),
  kite: it("toy", "toy", "flies high on a string in the wind"),
  swing: q("toy", "What at the park goes back and forth?"),
  slide: q("toy", "What at the park do I zoom down?"),
  crayons: they("school", "things", "are waxy sticks for coloring"),

  // Animals
  animal: q("animal", "What do we call a dog, cat, or cow?"),
  dog: animal("barks and wags its tail"),
  cat: animal("says meow and has whiskers"),
  bird: animal("has wings and feathers and can fly"),
  cow: animal("says moo and gives us milk"),
  pig: animal("says oink and rolls in mud"),
  horse: animal("has a mane and can run fast"),
  duck: animal("says quack and swims in the pond"),
  sheep: animal("says baa and has soft wool"),
  goat: animal("has horns and a beard and eats grass"),
  rabbit: animal("has long ears and hops"),
  mouse: animal("is tiny and says squeak"),
  monkey: animal("climbs trees and loves bananas"),
  lion: animal("has a big mane and roars"),
  tiger: animal("has orange fur with black stripes"),
  elephant: animal("is huge and has a long trunk"),
  bear: animal("is big and furry and loves honey"),
  frog: animal("is green, hops, and says ribbit"),
  snake: animal("is long and has no legs"),
  butterfly: animal("has pretty wings and flies to flowers"),
  bee: animal("buzzes and makes honey"),
  ant: animal("is tiny and walks in a line"),

  // Weather
  weather: q("weather", "What do we call sun, rain, and wind outside?"),
  sun: q("weather", "What shines bright in the sky in the day?"),
  sunny: q("weather", "What is the day like when the sun shines?"),
  rain: q("weather", "What falls from the clouds and makes us wet?"),
  rainy: q("weather", "What is the day like when water falls from clouds?"),
  cloud: q("weather", "What is white and fluffy up in the sky?"),
  cloudy: q("weather", "What is the sky like when clouds cover the sun?"),
  wind: q("weather", "What makes the kite fly and the trees shake?"),
  windy: q("weather", "What is the day like when my hat blows away?"),
  storm: q("weather", "What has strong wind, rain, and thunder?"),
  thunder: q("weather", "What makes a loud boom in a storm?"),
  "hot day": q("weather", "What kind of day makes me sweat a lot?"),
  "cold day": q("weather", "What kind of day needs a warm jacket?"),
  moon: q("weather", "What shines in the night sky?"),
  sky: q("weather", "Where do birds and planes fly?"),

  // Gestures
  "eat food": q("action", "What do I want to do when I am hungry?"),
  "drink water": q("action", "What do I want to do after playing outside?")
};

/** A profile with its Fill sentence. The second meaning of a word is keyed by its first hint: "orange (color)". */
function withFill(label: string, profile: WordProfile): WordProfile {
  const sentence = vocabularyFill[profile.hint ? `${label} (${profile.hint[0]})` : label];
  return { ...profile, fill: sentence ? [sentence] : [] };
}

export const wordProfiles: Record<string, WordProfile | WordProfile[]> = Object.fromEntries(
  Object.entries(rawWordProfiles).map(([label, entry]) => [
    label,
    Array.isArray(entry) ? entry.map((profile) => withFill(label, profile)) : withFill(label, entry)
  ])
);
