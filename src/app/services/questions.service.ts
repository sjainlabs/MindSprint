import { Injectable } from '@angular/core';

export interface Question {
  id: number;
  question: string;
  options: Array<{id: number, text: string}>;
  correctAnswer: number;
  points: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsService {
  private mathQuestions: Question[] = [
    {
      id: 1,
      question: 'What is 15 + 27?',
      options: [
        { id: 1, text: '40' },
        { id: 2, text: '42' },
        { id: 3, text: '43' },
        { id: 4, text: '45' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 2,
      question: 'What is 8 × 7?',
      options: [
        { id: 1, text: '54' },
        { id: 2, text: '56' },
        { id: 3, text: '58' },
        { id: 4, text: '64' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 3,
      question: 'What is 144 ÷ 12?',
      options: [
        { id: 1, text: '10' },
        { id: 2, text: '11' },
        { id: 3, text: '12' },
        { id: 4, text: '13' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 4,
      question: 'What is 35 - 18?',
      options: [
        { id: 1, text: '15' },
        { id: 2, text: '16' },
        { id: 3, text: '17' },
        { id: 4, text: '18' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 5,
      question: 'What is 5² (5 squared)?',
      options: [
        { id: 1, text: '10' },
        { id: 2, text: '15' },
        { id: 3, text: '20' },
        { id: 4, text: '25' }
      ],
      correctAnswer: 4,
      points: 100
    },
    {
      id: 6,
      question: 'What is 3/4 as a decimal?',
      options: [
        { id: 1, text: '0.25' },
        { id: 2, text: '0.50' },
        { id: 3, text: '0.75' },
        { id: 4, text: '1.00' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 7,
      question: 'What is 20% of 80?',
      options: [
        { id: 1, text: '12' },
        { id: 2, text: '14' },
        { id: 3, text: '16' },
        { id: 4, text: '18' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 8,
      question: 'What is the perimeter of a square with side length 6 cm?',
      options: [
        { id: 1, text: '18 cm' },
        { id: 2, text: '20 cm' },
        { id: 3, text: '24 cm' },
        { id: 4, text: '36 cm' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 9,
      question: 'What is 9 + 6 × 2?',
      options: [
        { id: 1, text: '21' },
        { id: 2, text: '24' },
        { id: 3, text: '27' },
        { id: 4, text: '30' }
      ],
      correctAnswer: 1,
      points: 100
    },
    {
      id: 10,
      question: 'If a triangle has angles of 60°, 60°, and x°, what is x?',
      options: [
        { id: 1, text: '30°' },
        { id: 2, text: '45°' },
        { id: 3, text: '60°' },
        { id: 4, text: '90°' }
      ],
      correctAnswer: 3,
      points: 100
    }
  ];

  private englishQuestions: Question[] = [
    {
      id: 1,
      question: 'Choose the correct word: The cat ___ on the mat.',
      options: [
        { id: 1, text: 'sit' },
        { id: 2, text: 'sits' },
        { id: 3, text: 'sitting' },
        { id: 4, text: 'sat' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 2,
      question: 'What is the plural of "child"?',
      options: [
        { id: 1, text: 'childs' },
        { id: 2, text: 'childes' },
        { id: 3, text: 'children' },
        { id: 4, text: 'childrens' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 3,
      question: 'Which word is a noun?',
      options: [
        { id: 1, text: 'quickly' },
        { id: 2, text: 'happiness' },
        { id: 3, text: 'beautiful' },
        { id: 4, text: 'run' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 4,
      question: 'Choose the correct sentence:',
      options: [
        { id: 1, text: 'She don\'t like pizza.' },
        { id: 2, text: 'She doesn\'t likes pizza.' },
        { id: 3, text: 'She doesn\'t like pizza.' },
        { id: 4, text: 'She doesn\'t liked pizza.' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 5,
      question: 'What is a synonym for "happy"?',
      options: [
        { id: 1, text: 'sad' },
        { id: 2, text: 'angry' },
        { id: 3, text: 'joyful' },
        { id: 4, text: 'tired' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 6,
      question: 'Which is the correct spelling?',
      options: [
        { id: 1, text: 'seperate' },
        { id: 2, text: 'separate' },
        { id: 3, text: 'seperete' },
        { id: 4, text: 'separete' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 7,
      question: 'What type of word is "beautiful"?',
      options: [
        { id: 1, text: 'noun' },
        { id: 2, text: 'verb' },
        { id: 3, text: 'adjective' },
        { id: 4, text: 'adverb' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 8,
      question: 'Choose the correct past tense: "I ___ to the store yesterday."',
      options: [
        { id: 1, text: 'go' },
        { id: 2, text: 'goes' },
        { id: 3, text: 'went' },
        { id: 4, text: 'going' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 9,
      question: 'What is an antonym for "hot"?',
      options: [
        { id: 1, text: 'warm' },
        { id: 2, text: 'cold' },
        { id: 3, text: 'sunny' },
        { id: 4, text: 'bright' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 10,
      question: 'Which sentence uses correct punctuation?',
      options: [
        { id: 1, text: 'I love pizza pasta and salad.' },
        { id: 2, text: 'I love pizza, pasta, and salad.' },
        { id: 3, text: 'I love pizza pasta, and salad.' },
        { id: 4, text: 'I love, pizza pasta and salad.' }
      ],
      correctAnswer: 2,
      points: 100
    }
  ];

  private scienceQuestions: Question[] = [
    {
      id: 1,
      question: 'What is the largest planet in our solar system?',
      options: [
        { id: 1, text: 'Mars' },
        { id: 2, text: 'Jupiter' },
        { id: 3, text: 'Saturn' },
        { id: 4, text: 'Earth' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 2,
      question: 'What do plants need to make their own food?',
      options: [
        { id: 1, text: 'Only water' },
        { id: 2, text: 'Only air' },
        { id: 3, text: 'Sunlight, water, and carbon dioxide' },
        { id: 4, text: 'Only sunlight' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 3,
      question: 'What is the process by which water turns into vapor?',
      options: [
        { id: 1, text: 'Condensation' },
        { id: 2, text: 'Evaporation' },
        { id: 3, text: 'Precipitation' },
        { id: 4, text: 'Freezing' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 4,
      question: 'Which organ pumps blood throughout the human body?',
      options: [
        { id: 1, text: 'Brain' },
        { id: 2, text: 'Lungs' },
        { id: 3, text: 'Heart' },
        { id: 4, text: 'Stomach' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 5,
      question: 'What force pulls objects toward the Earth?',
      options: [
        { id: 1, text: 'Magnetism' },
        { id: 2, text: 'Friction' },
        { id: 3, text: 'Gravity' },
        { id: 4, text: 'Electricity' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 6,
      question: 'How many bones are in the adult human body?',
      options: [
        { id: 1, text: '186' },
        { id: 2, text: '206' },
        { id: 3, text: '226' },
        { id: 4, text: '246' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 7,
      question: 'What is the chemical symbol for water?',
      options: [
        { id: 1, text: 'O2' },
        { id: 2, text: 'H2O' },
        { id: 3, text: 'CO2' },
        { id: 4, text: 'HO' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 8,
      question: 'What type of animal is a dolphin?',
      options: [
        { id: 1, text: 'Fish' },
        { id: 2, text: 'Mammal' },
        { id: 3, text: 'Reptile' },
        { id: 4, text: 'Amphibian' }
      ],
      correctAnswer: 2,
      points: 100
    },
    {
      id: 9,
      question: 'What do we call animals that eat only plants?',
      options: [
        { id: 1, text: 'Carnivores' },
        { id: 2, text: 'Omnivores' },
        { id: 3, text: 'Herbivores' },
        { id: 4, text: 'Predators' }
      ],
      correctAnswer: 3,
      points: 100
    },
    {
      id: 10,
      question: 'What is the center of our solar system?',
      options: [
        { id: 1, text: 'Earth' },
        { id: 2, text: 'The Moon' },
        { id: 3, text: 'The Sun' },
        { id: 4, text: 'Mars' }
      ],
      correctAnswer: 3,
      points: 100
    }
  ];

  getMathQuestions(): Question[] {
    return this.mathQuestions;
  }

  getEnglishQuestions(): Question[] {
    return this.englishQuestions;
  }

  getScienceQuestions(): Question[] {
    return this.scienceQuestions;
  }
}
