// server/words.js
export const WORDS = [
    'apple', 'banana', 'car', 'dog', 'elephant', 'fish', 'guitar', 'house', 'ice', 'jacket',
    'kite', 'lion', 'monkey', 'nose', 'orange', 'pencil', 'queen', 'rocket', 'sun', 'tree',
    'umbrella', 'violin', 'water', 'xylophone', 'yacht', 'zebra', 'airplane', 'beach', 'cat',
    'dragon', 'eagle', 'fire', 'ghost', 'helicopter', 'island', 'jungle', 'kangaroo', 'lemon',
    'mountain', 'ninja', 'ocean', 'pirate', 'quilt', 'rainbow', 'snake', 'train', 'unicorn',
    'volcano', 'whale', 'x-ray', 'yoyo', 'zombie'
];

export const getRandomWords = (count = 3) => {
    const shuffled = [...WORDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
