/**
 * Hand-written questions for the 50 built-in cards: 3 Fill in the blank sentences and 3 Choose the picture
 * questions each (Choose the picture is retired; its questions stay for old activities). A Fill sentence is one
 * plain, natural sentence with the blank inside it. The first of each list is the main one (saved activities
 * upgrade to it). `group` keeps look-alike words out of the choices when a card a teacher made is involved (see
 * `activity-option-sets.ts`).
 * Every line must pass `checkQuestion` in `rules.ts`.
 */
export type BankEntry = { group: string; fill: string[]; choose: string[] };

export const builtInQuestions: Record<string, BankEntry> = {
  hello: {
    group: "greeting",
    fill: [
      "I say ____ when I greet someone.",
      "I say ____ when I answer the phone.",
      "I wave my hand and say ____ when I see my friend."
    ],
    choose: [
      "What do we say when we meet someone?",
      "What do I say when I see my friend?",
      "What do I say when I answer the phone?"
    ]
  },
  goodbye: {
    group: "greeting",
    fill: [
      "I say ____ when school is over.",
      "I say ____ to Grandma when she goes home.",
      "I say ____ to my teacher before I go home."
    ],
    choose: [
      "What do we say when we leave school?",
      "What do I say when a visitor goes home?",
      "What do I say when I leave my friend?"
    ]
  },
  "good morning": {
    group: "greeting",
    fill: [
      "I say ____ to my family when I wake up.",
      "I say ____ to my teacher when I get to school.",
      "I say ____ to my classmates when I walk into our classroom."
    ],
    choose: [
      "What do we say at the start of the day?",
      "What do I say to my teacher when I arrive?",
      "What do I say to Mom when I wake up?"
    ]
  },
  "thank you": {
    group: "greeting",
    fill: [
      "I say ____ when my friend shares a snack with me.",
      "I say ____ when I get a gift.",
      "I say ____ when someone helps me."
    ],
    choose: [
      "What do we say when someone helps us?",
      "What do I say when I get a gift?",
      "What do I say when a friend shares a snack?"
    ]
  },
  please: {
    group: "greeting",
    fill: [
      "Can I have the red crayon, ____?",
      "May I have some water, ____?",
      "Can you help me tie my shoe, ____?"
    ],
    choose: [
      "What polite word do we use when asking for something?",
      "What word do I add to ask for a snack?",
      "What word makes my asking kind and polite?"
    ]
  },
  sorry: {
    group: "greeting",
    fill: [
      "I say ____ when I make a mistake.",
      "I say ____ when I bump into my friend.",
      "I say ____ when I spill my juice."
    ],
    choose: [
      "What do we say when we make a mistake?",
      "What do I say when I bump into someone?",
      "What do I say when I break my friend's toy?"
    ]
  },
  happy: {
    group: "feeling",
    fill: [
      "I feel ____ when I get a perfect score.",
      "I feel ____ when I get a gift.",
      "I feel ____ on my birthday."
    ],
    choose: [
      "How do I feel on my birthday?",
      "How do I feel when I get a gold star?",
      "How do I feel when my friend plays with me?"
    ]
  },
  sad: {
    group: "feeling",
    fill: [
      "I feel ____ when my toy breaks.",
      "I feel ____ when I cannot play outside today.",
      "I feel ____ when my friend cannot come to play."
    ],
    choose: [
      "How do I feel when my toy breaks?",
      "How do I feel when my balloon flies away?",
      "How do I feel when I miss my friend?"
    ]
  },
  angry: {
    group: "feeling",
    fill: [
      "I feel ____ when someone takes my toy.",
      "I feel ____ when someone throws my bag.",
      "I feel ____ when someone breaks my crayons."
    ],
    choose: [
      "How do I feel when someone takes my toy?",
      "How do I feel when someone pushes me?",
      "How do I feel when someone breaks my blocks?"
    ]
  },
  scared: {
    group: "feeling",
    fill: [
      "I feel ____ when the thunder is loud.",
      "I feel ____ when I get lost in the mall.",
      "I feel ____ when I see a big spider."
    ],
    choose: [
      "How do I feel when the thunder is loud?",
      "How do I feel in a very dark room?",
      "How do I feel when a big dog barks?"
    ]
  },
  tired: {
    group: "feeling",
    fill: [
      "I feel ____ after playing all day.",
      "I feel ____ when I stay up late.",
      "I feel ____ when I wake up very early."
    ],
    choose: [
      "How do I feel after playing all day?",
      "How do I feel after a long run?",
      "How do I feel when I yawn at night?"
    ]
  },
  sick: {
    group: "feeling",
    fill: [
      "I see the doctor when I feel ____.",
      "I feel ____ when I have a fever.",
      "I stay home from school when I feel ____."
    ],
    choose: [
      "How do I feel when I have a fever?",
      "How do I feel when I have a cough?",
      "How do I feel when I need the doctor?"
    ]
  },
  i: {
    group: "person",
    fill: [
      "____ am ready to learn today.",
      "____ can tie my shoes by myself.",
      "____ raise my hand to answer."
    ],
    choose: [
      "Which word do I use to talk about myself?",
      "Which word do I use to say my own name?",
      "Which word means me, the one who is talking?"
    ]
  },
  you: {
    group: "person",
    fill: [
      "Can ____ help me, please?",
      "Do ____ want to play with me after lunch?",
      "Are ____ ready to go when the bell rings?"
    ],
    choose: [
      "Which word means the person I talk to?",
      "Which word is for the friend I point at?",
      "Which word is for the person I am asking?"
    ]
  },
  mother: {
    group: "person",
    fill: [
      "I give my ____ a hug when she comes home.",
      "I love my ____, and she loves me too.",
      "I am happy when I am with my ____."
    ],
    choose: [
      "Who is the woman who looks after me at home?",
      "Which person is my mom at home?",
      "Who tucks me in at night at home?"
    ]
  },
  father: {
    group: "person",
    fill: [
      "I give my ____ a hug when he comes home.",
      "I love my ____, and he loves me too.",
      "My ____ plays with me when he gets home."
    ],
    choose: [
      "Who is the man who looks after me at home?",
      "Which person is my dad at home?",
      "Who is the man who drives me to school?"
    ]
  },
  teacher: {
    group: "person",
    fill: [
      "My ____ helps me learn at school.",
      "I show my ____ my work in class.",
      "I listen to my ____ in class."
    ],
    choose: [
      "Who helps us learn at school?",
      "Who writes on the board in class?",
      "Who reads us stories in the classroom?"
    ]
  },
  friend: {
    group: "person",
    fill: [
      "My best ____ and I play tag at recess.",
      "I share my toys with my best ____.",
      "My best ____ comes to my birthday party."
    ],
    choose: [
      "Who do I play with at recess?",
      "Who do I share my snack with at recess?",
      "Who laughs and plays games with me at school?"
    ]
  },
  eat: {
    group: "action",
    fill: [
      "I ____ my sandwich at lunch time.",
      "I ____ my breakfast before school.",
      "I wash my hands before I ____."
    ],
    choose: [
      "What do we want to do when we are hungry?",
      "What do we do with our lunch?",
      "What do I do with a spoon and my rice?"
    ]
  },
  drink: {
    group: "action",
    fill: [
      "I ____ water when I am thirsty.",
      "I ____ my juice from a cup.",
      "I ____ a lot of water on hot days."
    ],
    choose: [
      "What do we want to do when we are thirsty?",
      "What do I do with a cup of water?",
      "What do I do with my juice box?"
    ]
  },
  food: {
    group: "food",
    fill: [
      "I eat rice, bread, and other kinds of ____.",
      "I eat many kinds of ____ at lunch.",
      "I buy all kinds of ____ at the store."
    ],
    choose: [
      "What do I need when my tummy is rumbling?",
      "What do I need when I am very hungry?",
      "What does Mom cook for us at dinner?"
    ]
  },
  water: {
    group: "drink",
    fill: [
      "I drink cold ____ after I play.",
      "I give my plant some ____.",
      "I wash my hands with soap and ____."
    ],
    choose: [
      "What clear drink do we have when we are thirsty?",
      "What do I give my dry plant?",
      "What comes out when I turn on the tap?"
    ]
  },
  rice: {
    group: "food",
    fill: [
      "I eat chicken and white ____ for lunch.",
      "My family cooks ____ in a pot.",
      "I eat ____ with a spoon."
    ],
    choose: [
      "What white food do we eat with chicken?",
      "What does Mom cook in a pot for our meal?",
      "What small white grains do we eat at lunch?"
    ]
  },
  bread: {
    group: "food",
    fill: [
      "I put butter on my ____ at breakfast.",
      "I need two slices of ____ to make a sandwich.",
      "The baker bakes fresh ____ in the oven."
    ],
    choose: [
      "What do we spread butter on for breakfast?",
      "What do I need to make a sandwich?",
      "What does the baker bake in the oven?"
    ]
  },
  milk: {
    group: "drink",
    fill: [
      "I pour cold ____ on my cereal.",
      "The cow gives us white ____ to drink.",
      "I dip my cookies in a glass of ____."
    ],
    choose: [
      "What white drink do we pour on cereal?",
      "What white drink comes from a cow?",
      "What white drink goes well with cookies?"
    ]
  },
  banana: {
    group: "food",
    fill: [
      "The monkey peels a long yellow ____.",
      "I peel my ____ before I eat it.",
      "I eat a yellow ____ for my snack."
    ],
    choose: [
      "What long yellow fruit do monkeys love?",
      "Which fruit is long, yellow, and soft?",
      "What yellow fruit do I peel before I eat it?"
    ]
  },
  sit: {
    group: "action",
    fill: [
      "Please ____ down on the mat for story time.",
      "I ____ on my chair in class.",
      "We ____ at the table to eat."
    ],
    choose: [
      "What do we do on the mat at story time?",
      "What do I do on a chair?",
      "What do we do at the table to eat?"
    ]
  },
  stand: {
    group: "action",
    fill: [
      "Please ____ up and go to the door.",
      "We ____ up to sing the flag song.",
      "I ____ up when my name is called."
    ],
    choose: [
      "What do we do to line up?",
      "What do we do when we sing the flag song?",
      "What do I do when my name is called?"
    ]
  },
  listen: {
    group: "action",
    fill: [
      "I sit quietly and ____ to the story.",
      "I ____ to my teacher in class.",
      "I ____ to music with my ears."
    ],
    choose: [
      "What do we do when the teacher reads a story?",
      "What do I do when my friend is talking?",
      "What do I do with my ears in class?"
    ]
  },
  look: {
    group: "action",
    fill: [
      "I ____ both ways before I cross the road.",
      "I ____ in the mirror when I comb my hair.",
      "I ____ up at the sky when a plane flies by."
    ],
    choose: [
      "What do our eyes do when the teacher points?",
      "What do I do with my eyes to see?",
      "What do I do both ways before crossing the road?"
    ]
  },
  read: {
    group: "action",
    fill: [
      "I open my book and ____ the story.",
      "I pick a book to ____ at library time.",
      "I ____ the words on the board."
    ],
    choose: [
      "What do we do with a book of stories?",
      "What do I do with the words in a book?",
      "What do I do at library time with a book?"
    ]
  },
  write: {
    group: "action",
    fill: [
      "I ____ my name with a pencil.",
      "I ____ the letters on my paper.",
      "I ____ a letter to Grandma."
    ],
    choose: [
      "What do we do with a pencil and paper?",
      "How do I put my name on my paper?",
      "What do I do to make letters with a pencil?"
    ]
  },
  wait: {
    group: "action",
    fill: [
      "I ____ for my turn on the swing.",
      "We ____ for the bus at the stop.",
      "We ____ in line for the slide."
    ],
    choose: [
      "What do we do until it is our turn?",
      "What do we do when the bus is late?",
      "What do I do in line for the slide?"
    ]
  },
  stop: {
    group: "action",
    fill: [
      "We ____ when the light is red.",
      "We ____ dancing when the music ends.",
      "Cars ____ to let us cross the road."
    ],
    choose: [
      "What do we do when the light is red?",
      "What do we do when the music ends?",
      "What do I do when a car is coming?"
    ]
  },
  toilet: {
    group: "need",
    fill: [
      "I flush the ____ after I pee.",
      "I wash my hands after I use the ____.",
      "I ask my teacher if I can use the ____."
    ],
    choose: [
      "Where do I go when I need to pee?",
      "Where do I sit when I need to poo?",
      "What do I ask for when I need to pee?"
    ]
  },
  help: {
    group: "action",
    fill: [
      "Can you ____ me tie my shoe?",
      "I ____ my friend when she falls down.",
      "I ____ my family clean the house."
    ],
    choose: [
      "What do I ask for when my shoe is untied?",
      "What do I need when my bag is too heavy?",
      "What do I do when my friend falls down?"
    ]
  },
  rest: {
    group: "action",
    fill: [
      "My legs are tired, so I take a short ____.",
      "After the race, I take a ____ on the bench.",
      "We take a quick ____ between games."
    ],
    choose: [
      "What do I need when my body wants a break?",
      "What do I take after running a lot?",
      "What do we take after working hard?"
    ]
  },
  sleep: {
    group: "action",
    fill: [
      "At night, I get into bed and go to ____.",
      "I brush my teeth before I go to ____.",
      "I turn off the light when it is time to ____."
    ],
    choose: [
      "What do I do in bed at night?",
      "What do I do in bed with my eyes closed?",
      "What does a baby do in the crib at night?"
    ]
  },
  "wash hands": {
    group: "action",
    fill: [
      "We ____ with soap before lunch.",
      "I ____ after I use the toilet.",
      "I ____ after I play in the sand."
    ],
    choose: [
      "What do we do with soap before we eat?",
      "What do I do after I use the toilet?",
      "What do I do when my hands are dirty?"
    ]
  },
  more: {
    group: "word",
    fill: [
      "I am still hungry, so I want ____ food.",
      "The song is fun, so we sing it one ____ time.",
      "I want one ____ turn on the swing."
    ],
    choose: [
      "What do I ask for when I am still hungry?",
      "What word do I say to get a little extra?",
      "What do I say when I want another turn?"
    ]
  },
  finished: {
    group: "word",
    fill: [
      "I put my pencil down because my work is ____.",
      "I put my crayons away when my picture is ____.",
      "I clean up when I am ____ playing."
    ],
    choose: [
      "What do I say when my work is all done?",
      "What do I say when my plate is empty?",
      "What word means the story is at its end?"
    ]
  },
  danger: {
    group: "need",
    fill: [
      "A red sign warns us of ____.",
      "I stay away from ____ to keep safe.",
      "I watch out for ____ when I cross the road."
    ],
    choose: [
      "What does a keep-out sign warn us about?",
      "What word tells us to stay away from something?",
      "What word do we shout when something can hurt us?"
    ]
  },
  hot: {
    group: "describing",
    fill: [
      "Do not touch the stove because it is ____.",
      "I blow on my soup because it is ____.",
      "The sand feels ____ on a sunny day."
    ],
    choose: [
      "How does soup feel right off the stove?",
      "How does the sand feel on a sunny day?",
      "How does the stove feel when it is on?"
    ]
  },
  hurt: {
    group: "feeling",
    fill: [
      "I got ____ when I fell off my bike.",
      "I ____ my knee when I fell down.",
      "I ____ my arm when the ball hit it."
    ],
    choose: [
      "What am I when I fall and scrape my knee?",
      "What am I when I bump my head?",
      "What word do I say when my arm is sore?"
    ]
  },
  yes: {
    group: "word",
    fill: [
      "I nod my head and say ____.",
      "I say ____ when I agree.",
      "I say ____ when my friend asks me to play."
    ],
    choose: [
      "What do I say when I nod my head?",
      "What do I say when I agree?",
      "What word do I say to agree with my teacher?"
    ]
  },
  no: {
    group: "word",
    fill: [
      "I shake my head and say ____.",
      "I say ____ when something is not true.",
      "I say ____ when I do not like something."
    ],
    choose: [
      "What do I say when I shake my head?",
      "What word means I do not agree?",
      "What do I say when something is not true?"
    ]
  },
  want: {
    group: "action",
    fill: [
      "I ____ to play with the toy train.",
      "I ____ to go outside and play.",
      "I ____ my jacket because it is cold."
    ],
    choose: [
      "Which word do I use to wish for a toy?",
      "What word tells what I wish to have?",
      "What word goes with I when I ask for water?"
    ]
  },
  am: {
    group: "word",
    fill: [
      "I ____ a student at this school.",
      "I ____ happy today.",
      "I ____ ready for school."
    ],
    choose: [
      'Which word finishes "I ___ happy"?',
      'Which word goes with I, like "I ___ ready"?',
      'Which word finishes "I ___ a student"?'
    ]
  },
  is: {
    group: "word",
    fill: [
      "My puppy ____ very fluffy.",
      "The sun ____ out today.",
      "My cat ____ small and soft."
    ],
    choose: [
      'Which word finishes "She ___ my friend"?',
      'Which word finishes "The cat ___ small"?',
      'Which word finishes "My dad ___ tall"?'
    ]
  },
  are: {
    group: "word",
    fill: [
      "We ____ best friends.",
      "The birds ____ flying high.",
      "My shoes ____ under my bed."
    ],
    choose: [
      'Which word finishes "We ___ friends"?',
      'Which word finishes "They ___ happy"?',
      'Which word finishes "You ___ my friend"?'
    ]
  }
};

/**
 * The Sep 27 Fill sentences (a situation, then the blank). The owner chose one plain sentence instead. Kept
 * only so saved activities that use one are recognised as MakaLearn's and upgraded.
 */
export const retiredBuiltInFill: Record<string, string[]> = {
  hello: [
    "A new classmate comes in. I wave and say ____.",
    "I see my friend at the gate. I smile and say ____.",
    "The phone rings. I pick it up and say ____.",
    "I say ____ to my new classmate.",
    "I say ____ when I see my friend."
  ],
  goodbye: [
    "School is over. I wave and say ____.",
    "Grandma is going home. I hug her and say ____.",
    "The bus is here. I wave to Mom and say ____."
  ],
  "good morning": [
    "I arrive at school. I say ____ to my teacher.",
    "The sun is up and I wake up. I say ____ to Mom.",
    "It is the start of the school day. We say ____.",
    "We say ____ at the start of the school day."
  ],
  "thank you": [
    "My friend helps me. I say ____.",
    "Grandma gives me a gift. I smile and say ____.",
    "My teacher helps me with my bag. I say ____."
  ],
  please: [
    "I want the red crayon. Can I have it, ____?",
    "I want some water. May I have some, ____?",
    "I need help with my shoe. Can you help me, ____?"
  ],
  sorry: [
    "I bumped into my friend. I say ____.",
    "I spilled juice on the table. I tell Mom, ____.",
    "I stepped on my friend's toes. I say ____."
  ],
  happy: [
    "Everyone sings on my birthday. I feel ____.",
    "I got a gold star today. I feel ____.",
    "My friend plays with me. I smile and feel ____.",
    "I feel ____ when everyone sings on my birthday.",
    "I feel ____ when I get a gold star.",
    "I feel ____ when I play with my friend."
  ],
  sad: [
    "My balloon flew away. I feel ____.",
    "My toy is broken. I cry and feel ____.",
    "My friend moved away. I miss her and feel ____.",
    "I feel ____ because my blue balloon flew away.",
    "I feel ____ when I miss my friend."
  ],
  angry: [
    "My friend took my toy. I feel ____.",
    "Someone pushed me in line. I feel ____.",
    "My brother broke my blocks on purpose. I feel ____.",
    "I feel ____ when someone pushes me.",
    "I feel ____ when someone breaks my blocks."
  ],
  scared: [
    "The thunder is so loud. I feel ____.",
    "It is very dark in my room. I feel ____.",
    "A big dog barks at me. I feel ____.",
    "I feel ____ when I am all alone.",
    "I feel ____ when a big dog barks at me."
  ],
  tired: [
    "I played all day. Now I feel ____.",
    "I ran around the field. Now I feel ____.",
    "It is late at night. I yawn and feel ____.",
    "I feel ____ after a long run.",
    "I yawn at night because I feel ____."
  ],
  sick: [
    "I have a fever. I feel ____.",
    "My tummy hurts and my head aches. I feel ____.",
    "I have a cough and a runny nose. I feel ____.",
    "I stay home from school because I feel ____.",
    "I feel ____ when I have a cough."
  ],
  i: [
    "I point to myself. ____ am ready to learn.",
    "My teacher asks who is ready. ____ am ready!",
    "Tell the class your name. ____ am Sam."
  ],
  you: [
    "I point to my friend. Do ____ want to play?",
    "I give my friend a ball. This is for ____.",
    "I ask my teacher a question. Can ____ help me?",
    "Do ____ want to play with me?",
    "Can ____ help me with my bag?",
    "Are ____ my friend?"
  ],
  mother: [
    "My mom cooks for us. She is my ____.",
    "She takes care of me at home. She is my ____.",
    "She tucks me in at night. She is my ____."
  ],
  father: [
    "My dad drives me to school. He is my ____.",
    "He takes care of me at home. He is my ____.",
    "He carries me on his back. He is my ____."
  ],
  teacher: [
    "In class, my ____ writes on the board.",
    "She reads us a story in class. She is my ____.",
    "The bell rings. My ____ starts the lesson."
  ],
  friend: [
    "At recess, I play tag with my ____.",
    "We share our snacks. You are my best ____.",
    "We laugh and play at recess. You are my ____.",
    "I play with my ____ at recess.",
    "My ____ and I share our toys.",
    "I sit next to my ____ in class."
  ],
  eat: [
    "It is lunch time. I want to ____ my sandwich.",
    "My tummy is rumbling. I sit down to ____.",
    "The rice is ready. Let us ____ now."
  ],
  drink: [
    "I am thirsty. I want to ____ some water.",
    "My juice is in a cup. I ____ it slowly.",
    "It is hot outside. I ____ my water."
  ],
  food: [
    "My tummy is rumbling. I need some ____.",
    "It is lunch time. Mom brings us some ____.",
    "I am very hungry. Please give me some ____.",
    "I am hungry, so I need some ____.",
    "We buy ____ at the store.",
    "I eat all the ____ on my plate."
  ],
  water: [
    "It is hot. Can I have a glass of ____?",
    "My plant looks dry. I give it some ____.",
    "I am thirsty after running. I drink cold ____."
  ],
  rice: [
    "For lunch, I have chicken and white ____.",
    "Mom cooks white ____ in a pot. We eat it with egg.",
    "We eat this every day with our meal. It is white ____."
  ],
  bread: [
    "It is breakfast time. I put butter on my ____.",
    "I make a sandwich. I need two slices of ____.",
    "The baker bakes it in the oven. It is fresh ____."
  ],
  milk: [
    "It is breakfast time. I pour cold ____ on my cereal.",
    "The cow gives us something white to drink. It is ____.",
    "I have cookies. I dip them in a glass of ____."
  ],
  banana: [
    "The monkey is hungry. It peels a long yellow ____.",
    "This fruit is long and yellow. It is a ____.",
    "I peel my snack. It is a soft yellow ____."
  ],
  sit: [
    "The story is starting. Please ____ down on the mat.",
    "My legs are tired. I ____ on the chair.",
    "It is time to eat. We ____ at the table."
  ],
  stand: [
    "It is time to line up. Please ____ up.",
    "We sing the flag song. We all ____ up.",
    "My name is called. I ____ up and go to the front."
  ],
  listen: [
    "The teacher reads a story. Be quiet and ____.",
    "Music is playing. I close my eyes and ____.",
    "My friend is talking. I look at her and ____."
  ],
  look: [
    "The teacher points at the board. Please ____ at it.",
    "A bird is in the sky. ____ up at it!",
    "Before I cross the road, I ____ both ways.",
    "Please ____ at the board.",
    "I ____ up at the birds in the sky."
  ],
  read: [
    "I open my book. I ____ the story.",
    "It is library time. I pick a book to ____.",
    "The words are on the board. I ____ them out loud."
  ],
  write: [
    "I hold my pencil. I ____ my name.",
    "The teacher gives us paper. We ____ the letters.",
    "I have a pencil and paper. I ____ a letter to Grandma."
  ],
  wait: [
    "My friend is on the swing. I ____ for my turn.",
    "The light is red. We ____ to cross.",
    "The bus is not here yet. We ____ at the stop."
  ],
  stop: [
    "The light is red. We must ____ now.",
    "The music ends. Everyone must ____ dancing.",
    "A car is coming. ____ at the side of the road!"
  ],
  toilet: [
    "I need to pee. I go to the ____.",
    "After I use the ____, I wash my hands.",
    "I need to poo. Teacher, can I go to the ____?",
    "I need to pee, so I go to the ____."
  ],
  help: [
    "I cannot tie my shoe. Can you ____ me?",
    "My bag is too heavy. Please ____ me.",
    "My friend fell down. I go to ____ her."
  ],
  rest: [
    "I ran a lot. Now I need a ____.",
    "My body feels tired after play. I lie down for a ____.",
    "We worked hard today. Let us take a short ____.",
    "I lie down for a ____ after playing.",
    "My legs are tired, so I need a ____.",
    "We take a short ____ after hard work."
  ],
  sleep: [
    "It is night. I close my eyes and ____.",
    "I am so tired. I go to bed to ____.",
    "The baby is in the crib. Shh, the baby needs to ____.",
    "I close my eyes and ____ at night.",
    "I go to bed to ____.",
    "The baby needs to ____ in the crib."
  ],
  "wash hands": [
    "Lunch is ready. First, we go and ____.",
    "I played in the sand. Now I need to ____.",
    "I used the toilet. Next, I ____ with soap."
  ],
  more: [
    "I am still hungry. Can I have some ____?",
    "The song is fun. Sing it one ____ time!",
    "I finished my juice. May I have ____, please?",
    "I am still hungry, so I want ____ rice."
  ],
  finished: [
    "I colored the whole picture. Now I am ____.",
    "I ate all my food. My plate is empty. I am ____.",
    "We read the last page. The story is ____.",
    "I colored the whole picture, and now I am ____.",
    "I am ____ with my work.",
    "The story is ____, so I close my book."
  ],
  danger: [
    "The sign says to keep out. It warns us of ____.",
    "The pot is on a hot stove. That is ____!",
    "A car is coming fast. Watch out, ____!"
  ],
  hot: [
    "The soup just came off the stove. It is ____!",
    "The sun is out all day. The sand feels ____.",
    "Do not touch the stove. It is very ____."
  ],
  hurt: [
    "I fell and scraped my knee. I am ____.",
    "The ball hit my arm. It is ____.",
    "I bumped my head on the door. Ouch, I am ____!",
    "My knee is ____ because I fell down.",
    "My arm is ____ because the ball hit it."
  ],
  yes: [
    "Do you want to play outside? I nod and say ____.",
    "The teacher asks if I am ready. I am, so I say ____.",
    "Mom asks if I want a hug. I smile and say ____."
  ],
  no: [
    "My teacher asks if the sky is green. I say ____.",
    "Is the fire safe to touch? I shake my head and say ____.",
    "Can we cross when the light is red? The answer is ____."
  ],
  want: [
    "I see the toy train. I ____ to play with it.",
    "I am thirsty. I ____ some water.",
    "It is cold. I ____ my jacket."
  ],
  am: [
    "I go to school every day. I ____ a student.",
    "I ate my lunch. Now I ____ full.",
    "Look at my smile. I ____ happy today."
  ],
  is: [
    "Look at my puppy. He ____ very fluffy.",
    "My sister has a new dress. It ____ pink.",
    "Look outside at the sky. The sun ____ out."
  ],
  are: [
    "My friends and I play together. We ____ best friends.",
    "Look at the birds. They ____ flying high.",
    "You and I sing. We ____ happy."
  ]
};
