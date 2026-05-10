import { type GradeLevel, type Topic, type TopicDifficultyMapping } from '../../models/types';

const FOUNDATION_GRADES: GradeLevel[] = [0, 1];
const ELEMENTARY_GRADES: GradeLevel[] = [2, 3, 4, 5];
const MIDDLE_GRADES: GradeLevel[] = [6, 7, 8];

export const TOPIC_TAXONOMY: Topic[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    stage: 'Foundation',
    grades: FOUNDATION_GRADES,
    supportsAiWorksheet: false,
    subtopics: [
      { id: 'counting', name: 'Counting', difficulty: { min: 5, max: 20 } },
      { id: 'number-sense', name: 'Number Sense', difficulty: { min: 10, max: 25 } },
      { id: 'shapes', name: 'Shapes', difficulty: { min: 10, max: 30 } },
      { id: 'basic-addition-subtraction', name: 'Basic Addition/Subtraction', difficulty: { min: 15, max: 35 } },
    ],
  },
  {
    id: 'elementary',
    name: 'Elementary',
    stage: 'Elementary',
    grades: ELEMENTARY_GRADES,
    supportsAiWorksheet: false,
    subtopics: [
      { id: 'multiplication', name: 'Multiplication', difficulty: { min: 25, max: 45 } },
      { id: 'division', name: 'Division', difficulty: { min: 25, max: 50 } },
      { id: 'fractions', name: 'Fractions', difficulty: { min: 30, max: 55 } },
      { id: 'decimals', name: 'Decimals', difficulty: { min: 35, max: 55 } },
      { id: 'measurement', name: 'Measurement', difficulty: { min: 30, max: 50 } },
      { id: 'geometry-basics', name: 'Geometry Basics', difficulty: { min: 25, max: 45 } },
    ],
  },
  {
    id: 'middle-school',
    name: 'Middle School',
    stage: 'Middle School',
    grades: MIDDLE_GRADES,
    supportsAiWorksheet: false,
    subtopics: [
      { id: 'ratios', name: 'Ratios', difficulty: { min: 45, max: 65 } },
      { id: 'percentages', name: 'Percentages', difficulty: { min: 45, max: 65 } },
      { id: 'negative-numbers', name: 'Negative Numbers', difficulty: { min: 40, max: 60 } },
      { id: 'expressions', name: 'Expressions', difficulty: { min: 50, max: 70 } },
      { id: 'equations', name: 'Equations', difficulty: { min: 50, max: 70 } },
      { id: 'graphing', name: 'Graphing', difficulty: { min: 50, max: 70 } },
    ],
  },
  {
    id: 'pre-algebra',
    name: 'Pre-Algebra',
    stage: 'Pre-Algebra',
    grades: [8, 9],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'variables', name: 'Variables', difficulty: { min: 55, max: 75 } },
      { id: 'multi-step-equations', name: 'Multi-step Equations', difficulty: { min: 60, max: 80 } },
      { id: 'inequalities', name: 'Inequalities', difficulty: { min: 60, max: 80 } },
      { id: 'exponents', name: 'Exponents', difficulty: { min: 60, max: 80 } },
      { id: 'square-roots', name: 'Square Roots', difficulty: { min: 60, max: 80 } },
    ],
  },
  {
    id: 'algebra-i',
    name: 'Algebra I',
    stage: 'Algebra I',
    grades: [9],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'linear-equations', name: 'Linear Equations', difficulty: { min: 65, max: 85 } },
      { id: 'systems', name: 'Systems', difficulty: { min: 65, max: 85 } },
      { id: 'quadratics', name: 'Quadratics', difficulty: { min: 70, max: 90 } },
      { id: 'polynomials', name: 'Polynomials', difficulty: { min: 70, max: 90 } },
      { id: 'factoring', name: 'Factoring', difficulty: { min: 70, max: 90 } },
    ],
  },
  {
    id: 'geometry',
    name: 'Geometry',
    stage: 'Geometry',
    grades: [10],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'angles', name: 'Angles', difficulty: { min: 65, max: 85 } },
      { id: 'triangles', name: 'Triangles', difficulty: { min: 65, max: 90 } },
      { id: 'circles', name: 'Circles', difficulty: { min: 70, max: 90 } },
      { id: 'area-volume', name: 'Area/Volume', difficulty: { min: 70, max: 90 } },
      { id: 'transformations', name: 'Transformations', difficulty: { min: 70, max: 90 } },
      { id: 'proofs', name: 'Proofs', difficulty: { min: 75, max: 95 } },
    ],
  },
  {
    id: 'algebra-ii',
    name: 'Algebra II',
    stage: 'Algebra II',
    grades: [11],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'complex-numbers', name: 'Complex Numbers', difficulty: { min: 75, max: 95 } },
      { id: 'exponential-functions', name: 'Exponential Functions', difficulty: { min: 75, max: 95 } },
      { id: 'logarithmic-functions', name: 'Logarithmic Functions', difficulty: { min: 75, max: 95 } },
      { id: 'rational-expressions', name: 'Rational Expressions', difficulty: { min: 75, max: 95 } },
    ],
  },
  {
    id: 'trigonometry',
    name: 'Trigonometry',
    stage: 'Trigonometry',
    grades: [12],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'unit-circle', name: 'Unit Circle', difficulty: { min: 78, max: 96 } },
      { id: 'sine-cosine-tangent', name: 'Sine/Cosine/Tangent', difficulty: { min: 78, max: 96 } },
      { id: 'identities', name: 'Identities', difficulty: { min: 80, max: 98 } },
      { id: 'trig-graphs', name: 'Trig Graphs', difficulty: { min: 80, max: 98 } },
    ],
  },
  {
    id: 'pre-calculus',
    name: 'Pre-Calculus',
    stage: 'Pre-Calculus',
    grades: [12],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'limits-intro', name: 'Limits (Intro)', difficulty: { min: 82, max: 98 } },
      { id: 'advanced-functions', name: 'Advanced Functions', difficulty: { min: 82, max: 99 } },
      { id: 'vectors', name: 'Vectors', difficulty: { min: 82, max: 99 } },
      { id: 'matrices', name: 'Matrices', difficulty: { min: 82, max: 99 } },
    ],
  },
  {
    id: 'calculus',
    name: 'Calculus',
    stage: 'Calculus',
    grades: [12],
    supportsAiWorksheet: true,
    subtopics: [
      { id: 'limits', name: 'Limits', difficulty: { min: 85, max: 100 } },
      { id: 'derivatives', name: 'Derivatives', difficulty: { min: 85, max: 100 } },
      { id: 'integrals', name: 'Integrals', difficulty: { min: 88, max: 100 } },
      { id: 'optimization', name: 'Optimization', difficulty: { min: 88, max: 100 } },
      { id: 'differential-equations-intro', name: 'Differential Equations (Intro)', difficulty: { min: 90, max: 100 } },
    ],
  },
];

export const getTopicTaxonomy = (): Topic[] => TOPIC_TAXONOMY;

export const getTopicsByGrade = (grade: GradeLevel): Topic[] =>
  TOPIC_TAXONOMY.filter((topic) => topic.grades.includes(grade));

export const getTopicDifficultyMapping = (): TopicDifficultyMapping[] =>
  TOPIC_TAXONOMY.flatMap((topic) =>
    topic.subtopics.map((subtopic) => ({
      topicId: topic.id,
      subtopicId: subtopic.id,
      minDifficulty: subtopic.difficulty.min,
      maxDifficulty: subtopic.difficulty.max,
    })),
  );

export const findTopicById = (topicId: string): Topic | undefined =>
  TOPIC_TAXONOMY.find((topic) => topic.id === topicId);

