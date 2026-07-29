export interface TopicOption {
  name: string;
  icon: string;
}

const TOPIC_WORKSHEET_QUESTIONS: Record<string, string[]> = {
  Counting: [
    'Count the stars from 1 to 10.',
    'What number comes after 14?',
    'Circle the group with more objects.',
    'Write the missing number: 7, 8, __, 10.',
    'Count by 2s to 20.',
    'Count backward from 10 to 1.',
    'How many apples are shown?',
    'Choose the bigger number: 9 or 6.',
    'Fill in: __, 5, 6, 7.',
    'Count the shapes in the picture.',
  ],
  Fractions: [
    'What is 1/2 + 1/4?',
    'Convert 3/5 to a decimal.',
    'Which fraction is larger: 2/3 or 3/4?',
    'Simplify 8/12.',
    'What is 5/6 - 1/3?',
    'Solve: 2 1/2 + 1 3/4',
    'Write 0.75 as a fraction.',
    'Find 3/8 of 24.',
    'Compare 4/9 and 5/12.',
    'A pizza has 12 slices. If you eat 5, what fraction is left?',
  ],
  Decimals: [
    'Write 0.4 as a fraction.',
    'Which is greater: 0.56 or 0.6?',
    'Add 1.25 + 0.5.',
    'Subtract 3.8 - 1.45.',
    'Round 7.68 to the nearest tenth.',
    'Write 5 tenths as a decimal.',
    'Multiply 0.4 × 10.',
    'Order these decimals: 0.9, 0.09, 0.19.',
    'Convert 3/10 to a decimal.',
    'A juice box holds 1.5 liters. If you drink 0.7 liters, how much is left?',
  ],
  Geometry: [
    'Name a shape with 4 equal sides.',
    'How many angles does a triangle have?',
    'Find the perimeter of a square with side 6.',
    'Which shape has no corners?',
    'What is the area of a 4 × 5 rectangle?',
    'Identify an acute angle.',
    'How many faces does a cube have?',
    'Draw a line of symmetry for a rectangle.',
    'What is the perimeter of a triangle with sides 3, 4, and 5?',
    'Name a 3D shape that rolls.',
  ],
};

export const DEFAULT_GRADE = '4';

export const GRADE_TOPIC_CATALOG: Record<string, TopicOption[]> = {
  K: [
    { name: 'Counting', icon: '🔢' },
    { name: 'Shapes', icon: '🟦' },
    { name: 'Patterns', icon: '🌈' },
    { name: 'Comparing Numbers', icon: '⚖️' },
  ],
  '1': [
    { name: 'Addition', icon: '➕' },
    { name: 'Subtraction', icon: '➖' },
    { name: 'Place Value', icon: '🏗️' },
    { name: 'Measurement Basics', icon: '📏' },
  ],
  '2': [
    { name: 'Addition & Subtraction', icon: '🧮' },
    { name: 'Place Value', icon: '🏗️' },
    { name: 'Time', icon: '⏰' },
    { name: 'Money', icon: '💰' },
  ],
  '3': [
    { name: 'Multiplication', icon: '✖️' },
    { name: 'Division', icon: '➗' },
    { name: 'Fractions', icon: '🍕' },
    { name: 'Area & Perimeter', icon: '📐' },
  ],
  '4': [
    { name: 'Fractions', icon: '🍕' },
    { name: 'Decimals', icon: '🔟' },
    { name: 'Factors & Multiples', icon: '🧩' },
    { name: 'Geometry', icon: '📐' },
  ],
  '5': [
    { name: 'Fractions', icon: '🍕' },
    { name: 'Decimals', icon: '🔟' },
    { name: 'Volume', icon: '📦' },
    { name: 'Coordinate Graphs', icon: '📊' },
  ],
  '6': [
    { name: 'Ratios', icon: '⚗️' },
    { name: 'Expressions', icon: '📝' },
    { name: 'Statistics', icon: '📈' },
    { name: 'Geometry', icon: '📐' },
  ],
  '7': [
    { name: 'Proportional Reasoning', icon: '⚖️' },
    { name: 'Integers', icon: '🔣' },
    { name: 'Equations', icon: '🟰' },
    { name: 'Probability', icon: '🎲' },
  ],
  '8': [
    { name: 'Linear Equations', icon: '📏' },
    { name: 'Functions', icon: '🪄' },
    { name: 'Transformations', icon: '🔄' },
    { name: 'Pythagorean Theorem', icon: '📐' },
  ],
  '9': [
    { name: 'Algebra Foundations', icon: '🧠' },
    { name: 'Polynomials', icon: '🌿' },
    { name: 'Coordinate Geometry', icon: '🗺️' },
    { name: 'Data Analysis', icon: '📊' },
  ],
  '10': [
    { name: 'Quadratics', icon: '🎯' },
    { name: 'Trigonometry', icon: '📐' },
    { name: 'Proof & Geometry', icon: '🧱' },
    { name: 'Functions', icon: '🪄' },
  ],
  '11': [
    { name: 'Advanced Algebra', icon: '🚀' },
    { name: 'Precalculus', icon: '🧭' },
    { name: 'Statistics', icon: '📈' },
    { name: 'Sequences', icon: '🔁' },
  ],
  '12': [
    { name: 'Calculus Prep', icon: '🛫' },
    { name: 'Advanced Functions', icon: '🪄' },
    { name: 'Probability', icon: '🎲' },
    { name: 'Data Modeling', icon: '🧪' },
  ],
};

export function getTopicsForGrade(grade: string): TopicOption[] {
  return GRADE_TOPIC_CATALOG[grade] ?? GRADE_TOPIC_CATALOG[DEFAULT_GRADE];
}

export function getDefaultTopicForGrade(grade: string): string {
  return getTopicsForGrade(grade)[0]?.name ?? '';
}

export function getWorksheetTitle(grade: string, topic: string): string {
  return `Grade ${grade} ${topic} Practice`;
}

export function getWorksheetDescription(grade: string, topic: string): string {
  return `Solve these Grade ${grade} ${topic.toLowerCase()} questions. Show your steps if needed.`;
}

export function getRecommendedWorksheetLabel(grade: string, topic: string): string {
  return `Grade ${grade} · ${topic} · Level 2 worksheet`;
}

export function getWorksheetQuestions(grade: string, topic: string): string[] {
  const questions = TOPIC_WORKSHEET_QUESTIONS[topic];
  if (questions?.length) {
    return questions;
  }

  return Array.from({ length: 10 }).map((_, index) => `Grade ${grade} ${topic} practice question ${index + 1}.`);
}

