/**
 * Common words used on Makaton-style signs and PECS / AAC symbol cards, grouped by topic. Add material uses
 * it so a file named after a real symbol word (`bad_emotions`) fills the label even before that card exists,
 * while random words or letters (`asdf`, `IMG_2044`) do not. This is a starter list for autofill, not an
 * official Makaton vocabulary. Add words freely; multi-word symbols use spaces.
 */
const vocabularyByTopic: Record<string, string[]> = {
  greetings: [
    "hello", "hi", "goodbye", "bye", "good morning", "good afternoon", "good night", "good evening", "please",
    "thank you", "sorry", "excuse me", "welcome", "see you", "nice to meet you", "how are you"
  ],
  feelings: [
    "happy", "sad", "angry", "mad", "scared", "afraid", "tired", "sleepy", "sick", "hurt", "bad", "good", "okay",
    "fine", "excited", "bored", "worried", "nervous", "calm", "upset", "frustrated", "shy", "proud", "surprised",
    "confused", "lonely", "silly", "grumpy", "jealous", "embarrassed", "love", "like", "hungry", "thirsty", "cold",
    "hot", "pain", "ill", "better", "unwell", "cry", "laugh", "smile"
  ],
  people: [
    "i", "me", "my", "mine", "you", "your", "he", "she", "we", "they", "it", "mother", "mom", "mum", "mummy", "father",
    "dad", "daddy", "parent", "brother", "sister", "baby", "grandmother", "grandma", "grandfather", "grandpa",
    "aunt", "uncle", "cousin", "family", "friend", "teacher", "boy", "girl", "man", "woman", "child", "children",
    "people", "doctor", "nurse", "police", "principal", "classmate", "helper", "neighbor"
  ],
  food: [
    "eat", "food", "snack", "breakfast", "lunch", "dinner", "meal", "rice", "bread", "toast", "sandwich", "egg",
    "chicken", "fish", "meat", "pork", "beef", "hotdog", "burger", "pizza", "pasta", "noodles", "spaghetti", "soup",
    "cereal", "cheese", "butter", "jam", "biscuit", "cookie", "cake", "candy", "chocolate", "ice cream", "chips",
    "fries", "crackers", "yogurt", "fruit", "apple", "banana", "orange", "mango", "grapes", "pineapple",
    "watermelon", "strawberry", "papaya", "vegetable", "carrot", "potato", "tomato", "corn", "peas", "salad",
    "sugar", "salt", "hungry", "full", "yummy", "delicious"
  ],
  drinks: ["drink", "water", "milk", "juice", "tea", "coffee", "chocolate milk", "soda", "cup", "bottle", "glass", "thirsty"],
  actions: [
    "sit", "sit down", "stand", "stand up", "listen", "look", "watch", "read", "write", "draw", "color", "paint",
    "cut", "glue", "wait", "stop", "go", "come", "come here", "walk", "run", "jump", "hop", "climb", "dance",
    "sing", "play", "work", "help", "give", "take", "get", "put", "open", "close", "push", "pull", "throw", "catch",
    "kick", "sleep", "rest", "wake up", "wash", "wash hands", "brush", "brush teeth", "bath", "shower", "dress",
    "get dressed", "cook", "clean", "tidy up", "line up", "share", "turn", "my turn", "your turn", "finish",
    "finished", "done", "start", "again", "more", "want", "need", "have", "make", "see", "hear", "talk", "say",
    "tell", "ask", "answer", "point", "show", "think", "know", "learn", "count", "find", "hide", "carry", "fall",
    "sit quietly", "be quiet", "clap", "wave", "hug", "kiss", "swim", "ride", "drive", "fly", "buy", "pay", "call"
  ],
  words: [
    "yes", "no", "not", "am", "is", "are", "was", "be", "do", "can", "will", "the", "a", "and", "or", "with", "for",
    "to", "in", "on", "under", "up", "down", "here", "there", "this", "that", "what", "where", "who", "when", "why",
    "how", "which", "all", "some", "many", "more", "less", "same", "different", "now", "later", "first", "next",
    "then", "last", "before", "after", "today", "tomorrow", "yesterday", "morning", "afternoon", "night", "time"
  ],
  needs: ["toilet", "bathroom", "potty", "pee", "poo", "tissue", "medicine", "break", "quiet", "noise", "loud", "safe", "danger", "careful", "emergency"],
  describing: [
    "big", "small", "little", "long", "short", "tall", "fast", "slow", "hot", "cold", "warm", "wet", "dry", "clean",
    "dirty", "soft", "hard", "heavy", "light", "new", "old", "empty", "full", "open", "closed", "nice", "pretty",
    "ugly", "funny", "easy", "difficult", "right", "wrong", "same", "loud", "quiet", "dark", "bright", "broken"
  ],
  colors: ["red", "blue", "yellow", "green", "orange", "purple", "pink", "black", "white", "brown", "gray", "grey", "gold", "silver"],
  numbers: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "zero", "number"],
  shapes: ["circle", "square", "triangle", "rectangle", "star", "heart", "shape"],
  body: [
    "body", "head", "hair", "face", "eyes", "eye", "ears", "ear", "nose", "mouth", "teeth", "tongue", "neck",
    "shoulder", "arm", "hand", "hands", "finger", "tummy", "stomach", "back", "leg", "knee", "foot", "feet", "toes"
  ],
  clothes: ["clothes", "shirt", "t-shirt", "pants", "shorts", "skirt", "dress", "uniform", "jacket", "coat", "hat", "cap", "shoes", "socks", "slippers", "bag"],
  school: [
    "school", "class", "classroom", "book", "pencil", "pen", "crayon", "paper", "scissors", "glue", "eraser",
    "ruler", "bag", "desk", "table", "chair", "board", "computer", "tablet", "homework", "lesson", "story", "song",
    "music", "art", "recess", "playground", "library", "line", "circle time"
  ],
  home: ["home", "house", "room", "bedroom", "kitchen", "bed", "door", "window", "light", "tv", "television", "phone", "sofa", "blanket", "pillow", "toothbrush", "soap", "towel", "plate", "bowl", "spoon", "fork", "knife"],
  places: ["park", "shop", "store", "market", "church", "hospital", "clinic", "outside", "inside", "garden", "beach", "zoo", "car", "bus", "jeepney", "tricycle", "train", "bike", "boat", "plane", "road"],
  toys: ["toy", "ball", "doll", "blocks", "puzzle", "game", "bubbles", "car toy", "teddy", "kite", "swing", "slide", "crayons"],
  animals: ["animal", "dog", "cat", "bird", "fish", "cow", "pig", "horse", "chicken", "duck", "sheep", "goat", "rabbit", "mouse", "monkey", "lion", "tiger", "elephant", "bear", "frog", "snake", "butterfly", "bee", "ant"],
  weather: ["weather", "sun", "sunny", "rain", "rainy", "cloud", "cloudy", "wind", "windy", "storm", "thunder", "hot day", "cold day", "moon", "sky"],
  gestures: ["eat food", "drink water", "sit down", "stand up", "help", "yes", "no", "toilet"]
};

/**
 * Every vocabulary word, lowercase, without duplicates. Single letters are left out so a file named "a" or
 * "x" never becomes a label (the built-in "I" card still matches through the card list).
 */
export const symbolVocabulary: string[] = Array.from(
  new Set(
    Object.values(vocabularyByTopic)
      .flat()
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.replace(/[^a-z]/g, "").length > 1)
  )
);
