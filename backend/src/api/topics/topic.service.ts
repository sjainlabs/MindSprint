import {
  type ExplorationRecommendation,
  type GradeLevel,
  type StudentProfile,
  type Topic,
  type TopicDifficultyMapping,
} from '../../models/types';

const FOUNDATION_GRADES: GradeLevel[] = [0, 1];
const ELEMENTARY_GRADES: GradeLevel[] = [2, 3, 4, 5];
const MIDDLE_GRADES: GradeLevel[] = [6, 7, 8];

const subtopic = (input: {
  id: string;
  name: string;
  min: number;
  max: number;
  conceptualTags: string[];
  cognitiveComplexity: 'low' | 'medium' | 'high' | 'expert';
  integrationSkills: string[];
  realWorldCategories: string[];
  stemCategories: string[];
  aiDifficultyScore: number;
}) => ({
  id: input.id,
  name: input.name,
  difficulty: { min: input.min, max: input.max },
  conceptualTags: input.conceptualTags,
  cognitiveComplexity: input.cognitiveComplexity,
  integrationSkills: input.integrationSkills,
  realWorldCategories: input.realWorldCategories,
  stemCategories: input.stemCategories,
  aiDifficultyScore: input.aiDifficultyScore,
});

export const TOPIC_TAXONOMY: Topic[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    stage: 'Foundation',
    grades: FOUNDATION_GRADES,
    supportsAiWorksheet: false,
    conceptualFocus: ['number sense', 'spatial reasoning', 'early operations'],
    masteryDecayRatePerWeek: 1,
    subtopics: [
      subtopic({
        id: 'counting',
        name: 'Counting',
        min: 5,
        max: 20,
        conceptualTags: ['quantity', 'sequencing'],
        cognitiveComplexity: 'low',
        integrationSkills: ['verbal reasoning'],
        realWorldCategories: ['shopping', 'classroom objects'],
        stemCategories: ['foundations'],
        aiDifficultyScore: 15,
      }),
      subtopic({
        id: 'number-sense',
        name: 'Number Sense',
        min: 10,
        max: 25,
        conceptualTags: ['decomposition', 'comparison'],
        cognitiveComplexity: 'low',
        integrationSkills: ['mental math'],
        realWorldCategories: ['daily routines'],
        stemCategories: ['foundations'],
        aiDifficultyScore: 20,
      }),
      subtopic({
        id: 'shapes',
        name: 'Shapes',
        min: 10,
        max: 30,
        conceptualTags: ['geometry basics', 'visual classification'],
        cognitiveComplexity: 'low',
        integrationSkills: ['spatial visualization'],
        realWorldCategories: ['design', 'architecture'],
        stemCategories: ['engineering'],
        aiDifficultyScore: 22,
      }),
      subtopic({
        id: 'early-operations',
        name: 'Early Operations',
        min: 15,
        max: 35,
        conceptualTags: ['combining', 'taking away'],
        cognitiveComplexity: 'medium',
        integrationSkills: ['word problem translation'],
        realWorldCategories: ['games', 'story problems'],
        stemCategories: ['foundations'],
        aiDifficultyScore: 28,
      }),
    ],
  },
  {
    id: 'elementary',
    name: 'Elementary',
    stage: 'Elementary',
    grades: ELEMENTARY_GRADES,
    supportsAiWorksheet: false,
    conceptualFocus: ['fluency', 'multi-step reasoning', 'measurement'],
    masteryDecayRatePerWeek: 1.25,
    subtopics: [
      subtopic({ id: 'addition-subtraction', name: 'Addition/Subtraction', min: 25, max: 45, conceptualTags: ['place value'], cognitiveComplexity: 'medium', integrationSkills: ['error checking'], realWorldCategories: ['finance basics'], stemCategories: ['data'], aiDifficultyScore: 35 }),
      subtopic({ id: 'multiplication-division', name: 'Multiplication/Division', min: 25, max: 50, conceptualTags: ['inverse operations'], cognitiveComplexity: 'medium', integrationSkills: ['factor reasoning'], realWorldCategories: ['arrays', 'grouping'], stemCategories: ['engineering'], aiDifficultyScore: 42 }),
      subtopic({ id: 'fractions-decimals', name: 'Fractions/Decimals', min: 30, max: 55, conceptualTags: ['equivalence'], cognitiveComplexity: 'medium', integrationSkills: ['ratio foundations'], realWorldCategories: ['measurement', 'recipes'], stemCategories: ['science'], aiDifficultyScore: 46 }),
      subtopic({ id: 'measurement', name: 'Measurement', min: 30, max: 50, conceptualTags: ['unit conversion'], cognitiveComplexity: 'medium', integrationSkills: ['modeling'], realWorldCategories: ['experiments'], stemCategories: ['science'], aiDifficultyScore: 45 }),
      subtopic({ id: 'geometry-basics', name: 'Geometry Basics', min: 25, max: 45, conceptualTags: ['properties'], cognitiveComplexity: 'medium', integrationSkills: ['visual proof'], realWorldCategories: ['maps', 'design'], stemCategories: ['engineering'], aiDifficultyScore: 43 }),
      subtopic({ id: 'word-problems', name: 'Word Problems', min: 30, max: 55, conceptualTags: ['translation', 'reasoning'], cognitiveComplexity: 'high', integrationSkills: ['multi-skill integration'], realWorldCategories: ['everyday planning'], stemCategories: ['cross-disciplinary'], aiDifficultyScore: 52 }),
    ],
  },
  {
    id: 'middle-school',
    name: 'Middle School',
    stage: 'Middle School',
    grades: MIDDLE_GRADES,
    supportsAiWorksheet: false,
    conceptualFocus: ['proportional reasoning', 'algebraic transition', 'data literacy'],
    masteryDecayRatePerWeek: 1.5,
    subtopics: [
      subtopic({ id: 'ratios-percentages', name: 'Ratios/Percentages', min: 45, max: 65, conceptualTags: ['proportionality'], cognitiveComplexity: 'high', integrationSkills: ['comparison modeling'], realWorldCategories: ['discounts', 'rates'], stemCategories: ['economics'], aiDifficultyScore: 58 }),
      subtopic({ id: 'negative-numbers', name: 'Negative Numbers', min: 40, max: 60, conceptualTags: ['signed values'], cognitiveComplexity: 'medium', integrationSkills: ['coordinate reasoning'], realWorldCategories: ['temperature'], stemCategories: ['science'], aiDifficultyScore: 54 }),
      subtopic({ id: 'expressions-equations', name: 'Expressions/Equations', min: 50, max: 70, conceptualTags: ['algebraic structure'], cognitiveComplexity: 'high', integrationSkills: ['symbolic manipulation'], realWorldCategories: ['problem modeling'], stemCategories: ['computer science'], aiDifficultyScore: 64 }),
      subtopic({ id: 'graphing', name: 'Graphing', min: 50, max: 70, conceptualTags: ['function behavior'], cognitiveComplexity: 'high', integrationSkills: ['visual analysis'], realWorldCategories: ['motion graphs'], stemCategories: ['physics'], aiDifficultyScore: 66 }),
      subtopic({ id: 'probability-statistics-intro', name: 'Intro Probability & Statistics', min: 52, max: 72, conceptualTags: ['uncertainty', 'distribution'], cognitiveComplexity: 'high', integrationSkills: ['data interpretation'], realWorldCategories: ['sports analytics'], stemCategories: ['data science'], aiDifficultyScore: 68 }),
    ],
  },
  {
    id: 'pre-algebra',
    name: 'Pre-Algebra',
    stage: 'Pre-Algebra',
    grades: [8, 9],
    supportsAiWorksheet: true,
    conceptualFocus: ['symbolic fluency', 'abstraction'],
    masteryDecayRatePerWeek: 1.75,
    subtopics: [
      subtopic({ id: 'variables', name: 'Variables', min: 55, max: 75, conceptualTags: ['abstraction'], cognitiveComplexity: 'high', integrationSkills: ['symbol translation'], realWorldCategories: ['modeling'], stemCategories: ['computer science'], aiDifficultyScore: 72 }),
      subtopic({ id: 'multi-step-equations', name: 'Multi-step Equations', min: 60, max: 80, conceptualTags: ['inverse reasoning'], cognitiveComplexity: 'high', integrationSkills: ['sequencing'], realWorldCategories: ['cost models'], stemCategories: ['engineering'], aiDifficultyScore: 74 }),
      subtopic({ id: 'inequalities', name: 'Inequalities', min: 60, max: 80, conceptualTags: ['constraint reasoning'], cognitiveComplexity: 'high', integrationSkills: ['region interpretation'], realWorldCategories: ['optimization constraints'], stemCategories: ['operations research'], aiDifficultyScore: 76 }),
      subtopic({ id: 'exponents-square-roots', name: 'Exponents/Square Roots', min: 60, max: 80, conceptualTags: ['power relationships'], cognitiveComplexity: 'high', integrationSkills: ['number system extension'], realWorldCategories: ['growth models'], stemCategories: ['biology'], aiDifficultyScore: 77 }),
      subtopic({ id: 'coordinate-plane', name: 'Coordinate Plane', min: 60, max: 82, conceptualTags: ['spatial algebra'], cognitiveComplexity: 'high', integrationSkills: ['graph reasoning'], realWorldCategories: ['navigation'], stemCategories: ['robotics'], aiDifficultyScore: 78 }),
    ],
  },
  {
    id: 'algebra-i',
    name: 'Algebra I',
    stage: 'Algebra I',
    grades: [9],
    supportsAiWorksheet: true,
    conceptualFocus: ['functional thinking', 'equation solving'],
    masteryDecayRatePerWeek: 2,
    subtopics: [
      subtopic({ id: 'linear-equations', name: 'Linear Equations', min: 65, max: 85, conceptualTags: ['linearity'], cognitiveComplexity: 'high', integrationSkills: ['graph + algebra'], realWorldCategories: ['budgeting'], stemCategories: ['data science'], aiDifficultyScore: 82 }),
      subtopic({ id: 'systems', name: 'Systems', min: 65, max: 85, conceptualTags: ['simultaneous constraints'], cognitiveComplexity: 'high', integrationSkills: ['elimination/graphing'], realWorldCategories: ['resource allocation'], stemCategories: ['operations research'], aiDifficultyScore: 84 }),
      subtopic({ id: 'quadratics', name: 'Quadratics', min: 70, max: 90, conceptualTags: ['nonlinear behavior'], cognitiveComplexity: 'expert', integrationSkills: ['factoring + graphing'], realWorldCategories: ['projectile motion'], stemCategories: ['physics'], aiDifficultyScore: 88 }),
      subtopic({ id: 'polynomials-factoring', name: 'Polynomials/Factoring', min: 70, max: 90, conceptualTags: ['algebraic structure'], cognitiveComplexity: 'expert', integrationSkills: ['pattern recognition'], realWorldCategories: ['signal modeling'], stemCategories: ['engineering'], aiDifficultyScore: 87 }),
      subtopic({ id: 'functions', name: 'Functions', min: 70, max: 90, conceptualTags: ['mapping', 'composition'], cognitiveComplexity: 'expert', integrationSkills: ['function transformations'], realWorldCategories: ['input-output systems'], stemCategories: ['computer science'], aiDifficultyScore: 89 }),
    ],
  },
  {
    id: 'geometry',
    name: 'Geometry',
    stage: 'Geometry',
    grades: [10],
    supportsAiWorksheet: true,
    conceptualFocus: ['proof', 'spatial logic'],
    masteryDecayRatePerWeek: 2,
    subtopics: [
      subtopic({ id: 'angles-triangles', name: 'Angles/Triangles', min: 65, max: 90, conceptualTags: ['congruence'], cognitiveComplexity: 'high', integrationSkills: ['diagram reasoning'], realWorldCategories: ['construction'], stemCategories: ['engineering'], aiDifficultyScore: 86 }),
      subtopic({ id: 'circles', name: 'Circles', min: 70, max: 90, conceptualTags: ['arc relations'], cognitiveComplexity: 'high', integrationSkills: ['equation + geometry'], realWorldCategories: ['rotation systems'], stemCategories: ['physics'], aiDifficultyScore: 88 }),
      subtopic({ id: 'area-volume', name: 'Area/Volume', min: 70, max: 90, conceptualTags: ['dimensional analysis'], cognitiveComplexity: 'high', integrationSkills: ['unit conversion'], realWorldCategories: ['architecture'], stemCategories: ['engineering'], aiDifficultyScore: 87 }),
      subtopic({ id: 'transformations', name: 'Transformations', min: 70, max: 90, conceptualTags: ['symmetry'], cognitiveComplexity: 'high', integrationSkills: ['coordinate + geometry'], realWorldCategories: ['computer graphics'], stemCategories: ['computer science'], aiDifficultyScore: 89 }),
      subtopic({ id: 'proofs', name: 'Proofs', min: 75, max: 95, conceptualTags: ['logical rigor'], cognitiveComplexity: 'expert', integrationSkills: ['axiomatic reasoning'], realWorldCategories: ['legal/scientific argumentation'], stemCategories: ['mathematics'], aiDifficultyScore: 94 }),
    ],
  },
  {
    id: 'algebra-ii',
    name: 'Algebra II',
    stage: 'Algebra II',
    grades: [11],
    supportsAiWorksheet: true,
    conceptualFocus: ['advanced functions', 'sequence modeling'],
    masteryDecayRatePerWeek: 2.2,
    subtopics: [
      subtopic({ id: 'complex-numbers', name: 'Complex Numbers', min: 75, max: 95, conceptualTags: ['number system extension'], cognitiveComplexity: 'expert', integrationSkills: ['symbolic fluency'], realWorldCategories: ['signal processing'], stemCategories: ['electrical engineering'], aiDifficultyScore: 91 }),
      subtopic({ id: 'exponential-logarithmic-functions', name: 'Exponential/Logarithmic Functions', min: 75, max: 95, conceptualTags: ['inverse functions'], cognitiveComplexity: 'expert', integrationSkills: ['graph + equation analysis'], realWorldCategories: ['population models'], stemCategories: ['biology'], aiDifficultyScore: 93 }),
      subtopic({ id: 'rational-expressions', name: 'Rational Expressions', min: 75, max: 95, conceptualTags: ['domain restrictions'], cognitiveComplexity: 'expert', integrationSkills: ['fractional algebra'], realWorldCategories: ['rate models'], stemCategories: ['chemistry'], aiDifficultyScore: 92 }),
      subtopic({ id: 'sequences-series', name: 'Sequences & Series', min: 76, max: 96, conceptualTags: ['recursive thinking'], cognitiveComplexity: 'expert', integrationSkills: ['pattern modeling'], realWorldCategories: ['finance growth'], stemCategories: ['computer science'], aiDifficultyScore: 92 }),
    ],
  },
  {
    id: 'trigonometry',
    name: 'Trigonometry',
    stage: 'Trigonometry',
    grades: [12],
    supportsAiWorksheet: true,
    conceptualFocus: ['periodicity', 'identity reasoning'],
    masteryDecayRatePerWeek: 2.2,
    subtopics: [
      subtopic({ id: 'unit-circle', name: 'Unit Circle', min: 78, max: 96, conceptualTags: ['angle measure'], cognitiveComplexity: 'high', integrationSkills: ['coordinate geometry'], realWorldCategories: ['navigation'], stemCategories: ['physics'], aiDifficultyScore: 91 }),
      subtopic({ id: 'identities', name: 'Identities', min: 80, max: 98, conceptualTags: ['equivalence transformations'], cognitiveComplexity: 'expert', integrationSkills: ['symbolic proof'], realWorldCategories: ['wave analysis'], stemCategories: ['engineering'], aiDifficultyScore: 95 }),
      subtopic({ id: 'trig-graphs', name: 'Trig Graphs', min: 80, max: 98, conceptualTags: ['periodic behavior'], cognitiveComplexity: 'expert', integrationSkills: ['graph interpretation'], realWorldCategories: ['signal models'], stemCategories: ['data science'], aiDifficultyScore: 94 }),
    ],
  },
  {
    id: 'pre-calculus',
    name: 'Pre-Calculus',
    stage: 'Pre-Calculus',
    grades: [12],
    supportsAiWorksheet: true,
    conceptualFocus: ['limits intuition', 'multi-representation fluency'],
    masteryDecayRatePerWeek: 2.3,
    subtopics: [
      subtopic({ id: 'limits-intro', name: 'Limits', min: 82, max: 98, conceptualTags: ['approach behavior'], cognitiveComplexity: 'expert', integrationSkills: ['graph + symbolic limits'], realWorldCategories: ['change models'], stemCategories: ['physics'], aiDifficultyScore: 95 }),
      subtopic({ id: 'advanced-functions', name: 'Advanced Functions', min: 82, max: 99, conceptualTags: ['composition/inverses'], cognitiveComplexity: 'expert', integrationSkills: ['function families'], realWorldCategories: ['systems modeling'], stemCategories: ['engineering'], aiDifficultyScore: 96 }),
      subtopic({ id: 'vectors-matrices', name: 'Vectors/Matrices', min: 82, max: 99, conceptualTags: ['linear algebra intro'], cognitiveComplexity: 'expert', integrationSkills: ['geometry + algebra'], realWorldCategories: ['graphics/ML'], stemCategories: ['computer science'], aiDifficultyScore: 97 }),
    ],
  },
  {
    id: 'calculus',
    name: 'Calculus',
    stage: 'Calculus',
    grades: [12],
    supportsAiWorksheet: true,
    conceptualFocus: ['change', 'accumulation', 'optimization'],
    masteryDecayRatePerWeek: 2.5,
    subtopics: [
      subtopic({ id: 'derivatives', name: 'Derivatives', min: 85, max: 100, conceptualTags: ['instantaneous rate'], cognitiveComplexity: 'expert', integrationSkills: ['symbolic + graphical reasoning'], realWorldCategories: ['motion'], stemCategories: ['physics'], aiDifficultyScore: 98 }),
      subtopic({ id: 'integrals', name: 'Integrals', min: 88, max: 100, conceptualTags: ['accumulation'], cognitiveComplexity: 'expert', integrationSkills: ['area + antiderivatives'], realWorldCategories: ['volume and accumulation'], stemCategories: ['engineering'], aiDifficultyScore: 99 }),
      subtopic({ id: 'optimization', name: 'Optimization', min: 88, max: 100, conceptualTags: ['constraint optimization'], cognitiveComplexity: 'expert', integrationSkills: ['modeling + calculus'], realWorldCategories: ['economics/engineering tradeoffs'], stemCategories: ['operations research'], aiDifficultyScore: 99 }),
      subtopic({ id: 'differential-equations-intro', name: 'Differential Equations (Intro)', min: 90, max: 100, conceptualTags: ['dynamic systems'], cognitiveComplexity: 'expert', integrationSkills: ['model formulation'], realWorldCategories: ['population dynamics'], stemCategories: ['biology/physics'], aiDifficultyScore: 100 }),
    ],
  },
];

export const getTopicTaxonomy = (): Topic[] => TOPIC_TAXONOMY;

export const getTopicsByGrade = (grade: GradeLevel): Topic[] =>
  TOPIC_TAXONOMY.filter((topic) => topic.grades.includes(grade));

export const getTopicDifficultyMapping = (): TopicDifficultyMapping[] =>
  TOPIC_TAXONOMY.flatMap((topic) =>
    topic.subtopics.map((s) => ({
      topicId: topic.id,
      subtopicId: s.id,
      minDifficulty: s.difficulty.min,
      maxDifficulty: s.difficulty.max,
    })),
  );

export const findTopicById = (topicId: string): Topic | undefined =>
  TOPIC_TAXONOMY.find((topic) => topic.id === topicId);

export const buildPersonalizedLearningPath = (profile: StudentProfile): Topic[] => {
  const scored = TOPIC_TAXONOMY.map((topic) => {
    const mastery = profile.topicMastery[topic.id] ?? 0;
    const gradeDistance = Math.abs((topic.grades[0] ?? profile.grade) - profile.grade);
    const score = mastery * 0.7 - gradeDistance * 4 + (topic.supportsAiWorksheet ? 5 : 0);
    return { topic, score };
  });

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((entry) => entry.topic);
};

type BrowserTopic = {
  id: string;
  title: string;
  sourceTopicId: string;
  subtopics: string[];
  difficultyTiers: Array<{ name: string; min: number; max: number }>;
  prerequisites: string[];
  masteryPercentage: number;
  recommendedNextSteps: string[];
};

const BROWSER_DEFINITIONS: Array<{
  id: string;
  title: string;
  sourceTopicId: string;
  prerequisites: string[];
}> = [
  { id: 'foundation', title: 'FOUNDATION', sourceTopicId: 'foundation', prerequisites: [] },
  { id: 'arithmetic', title: 'ARITHMETIC', sourceTopicId: 'elementary', prerequisites: ['foundation'] },
  { id: 'fractions', title: 'FRACTIONS', sourceTopicId: 'elementary', prerequisites: ['arithmetic'] },
  { id: 'decimals', title: 'DECIMALS', sourceTopicId: 'elementary', prerequisites: ['fractions'] },
  { id: 'pre-algebra', title: 'PRE-ALGEBRA', sourceTopicId: 'pre-algebra', prerequisites: ['arithmetic'] },
  { id: 'algebra-i', title: 'ALGEBRA I', sourceTopicId: 'algebra-i', prerequisites: ['pre-algebra'] },
  { id: 'geometry', title: 'GEOMETRY', sourceTopicId: 'geometry', prerequisites: ['algebra-i'] },
  { id: 'algebra-ii', title: 'ALGEBRA II', sourceTopicId: 'algebra-ii', prerequisites: ['algebra-i', 'geometry'] },
  { id: 'trigonometry', title: 'TRIGONOMETRY', sourceTopicId: 'trigonometry', prerequisites: ['geometry', 'algebra-ii'] },
  { id: 'pre-calculus', title: 'PRE-CALCULUS', sourceTopicId: 'pre-calculus', prerequisites: ['trigonometry'] },
  { id: 'calculus', title: 'CALCULUS', sourceTopicId: 'calculus', prerequisites: ['pre-calculus'] },
  { id: 'statistics', title: 'STATISTICS', sourceTopicId: 'middle-school', prerequisites: ['arithmetic'] },
  { id: 'word-problems', title: 'WORD PROBLEMS', sourceTopicId: 'elementary', prerequisites: ['foundation'] },
  { id: 'logic-puzzles', title: 'LOGIC & PUZZLES', sourceTopicId: 'geometry', prerequisites: ['foundation'] },
];

const toDifficultyTiers = (topic: Topic): BrowserTopic['difficultyTiers'] => {
  const min = Math.min(...topic.subtopics.map((subtopic) => subtopic.difficulty.min));
  const max = Math.max(...topic.subtopics.map((subtopic) => subtopic.difficulty.max));
  const spread = Math.max(6, Math.round((max - min) / 3));
  return [
    { name: 'Tier 1', min, max: Math.min(max, min + spread) },
    { name: 'Tier 2', min: Math.min(max, min + spread + 1), max: Math.min(max, min + spread * 2) },
    { name: 'Tier 3', min: Math.min(max, min + spread * 2 + 1), max },
  ];
};

const safeMastery = (mastery: number | undefined): number => Math.max(0, Math.min(100, Math.round(mastery ?? 0)));

const pickRecommendation = (mastery: number, title: string): string[] => {
  if (mastery >= 90) {
    return [`Mastery is high in ${title}; move to the next prerequisite chain topic.`];
  }
  if (mastery >= 70) {
    return [`Strengthen advanced subtopics in ${title} with mixed difficulty practice.`];
  }
  return [`Reinforce core subtopics in ${title} and complete a checkpoint worksheet.`];
};

export const buildTopicBrowser = (profile: StudentProfile): BrowserTopic[] => {
  return BROWSER_DEFINITIONS.map((definition) => {
    const topic = findTopicById(definition.sourceTopicId) ?? TOPIC_TAXONOMY[0];
    const masteryPercentage = safeMastery(profile.topicMastery[definition.sourceTopicId]);
    return {
      id: definition.id,
      title: definition.title,
      sourceTopicId: definition.sourceTopicId,
      subtopics: topic.subtopics.map((subtopic) => subtopic.name),
      difficultyTiers: toDifficultyTiers(topic),
      prerequisites: definition.prerequisites,
      masteryPercentage,
      recommendedNextSteps: pickRecommendation(masteryPercentage, definition.title),
    };
  });
};

export const buildExplorationRecommendation = (
  profile: StudentProfile,
  requestedTopicId: string,
): ExplorationRecommendation => {
  const normalizedRequested = requestedTopicId.trim().toLowerCase();
  const requested = findTopicById(normalizedRequested)
    ?? findTopicById(BROWSER_DEFINITIONS.find((topic) => topic.id === normalizedRequested)?.sourceTopicId ?? '')
    ?? TOPIC_TAXONOMY[0];
  const personalized = buildPersonalizedLearningPath(profile);
  const recommendedTopic = personalized[0] ?? requested;
  const recommendedDifficulty = Math.round(
    (recommendedTopic.subtopics.reduce((sum, subtopic) => sum + subtopic.aiDifficultyScore, 0) /
      Math.max(recommendedTopic.subtopics.length, 1)) * 0.7 +
      (profile.learningPathLevel * 2),
  );

  return {
    studentId: profile.studentId,
    requestedTopicId: requested.id,
    recommendedTopicId: recommendedTopic.id,
    recommendedTopicName: recommendedTopic.name,
    recommendedDifficulty: Math.max(0, Math.min(100, recommendedDifficulty)),
    message:
      requested.id === recommendedTopic.id
        ? `Great choice—${requested.name} aligns with your mastery progression.`
        : `You can explore ${requested.name} anytime, but we recommend ${recommendedTopic.name} based on your mastery.`,
  };
};
