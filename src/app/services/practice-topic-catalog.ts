  import { type GradeLevel } from './diagnostic.service';
  import {
    type AdvancedQuestionType,
    type AiWorksheet,
    type AiWorksheetRequest,
  } from './ai-worksheet.service';
  import { type TopicModel, type TopicTaxonomyResponse } from './topic.service';

  export const PRACTICE_TOPIC_MAP = {
    mathTopics: {
      Kindergarten: [
        'Counting 1-20',
        'Number Recognition',
        'Shapes and Colors',
        'Comparisons (Big/Small)',
        'Patterns (Basic)',
        'Simple Addition',
        'Simple Subtraction',
      ],
      Grade1: [
        'Counting 1-100',
        'Place Value (Ones/Tens)',
        'Addition within 20',
        'Subtraction within 20',
        'Time (Hours)',
        'Money (Coins)',
        'Basic Shapes',
        'Simple Word Problems',
      ],
      Grade2: [
        'Place Value (Hundreds)',
        'Addition within 100',
        'Subtraction within 100',
        'Introduction to Multiplication',
        'Introduction to Division',
        'Measurement (Length/Weight)',
        'Simple Fractions (1/2, 1/3, 1/4)',
        'Patterns (Growing/Repeating)',
      ],
      Grade3: [
        'Multiplication Facts',
        'Division Facts',
        'Fractions (Basic)',
        'Time (Minutes)',
        'Money (Word Problems)',
        'Area and Perimeter',
        'Bar Graphs',
        'Word Problems (2-step)',
      ],
      Grade4: [
        'Multi-digit Addition',
        'Multi-digit Subtraction',
        'Multiplication (2-digit × 2-digit)',
        'Division (Long Division)',
        'Fractions (Equivalent)',
        'Fractions (Add/Subtract)',
        'Decimals (Tenths/Hundredths)',
        'Geometry (Angles, Lines)',
        'Measurement Conversions',
      ],
      Grade5: [
        'Fractions (Multiply/Divide)',
        'Decimals (Operations)',
        'Volume',
        'Coordinate Grid',
        'Factors and Multiples',
        'Prime/Composite Numbers',
        'Ratios (Intro)',
        'Percentages (Intro)',
      ],
      Grade6: [
        'Integers',
        'Rational Numbers',
        'Algebraic Expressions',
        'One-variable Equations',
        'Ratios and Proportions',
        'Percentages',
        'Geometry (Area/Surface Area)',
        'Statistics (Mean/Median/Mode)',
      ],
      Grade7: [
        'Proportional Relationships',
        'Linear Expressions',
        'Equations and Inequalities',
        'Geometry (Angles/Triangles)',
        'Probability (Intro)',
        'Rational Number Operations',
        'Scale Drawings',
        'Circle Geometry (Intro)',
      ],
      Grade8: [
        'Linear Equations',
        'Systems of Equations',
        'Functions (Intro)',
        'Pythagorean Theorem',
        'Transformations',
        'Volume of Solids',
        'Irrational Numbers',
        'Scatter Plots',
      ],
      Grade9: [
        'Number Systems',
        'Polynomials',
        'Coordinate Geometry',
        'Linear Equations in Two Variables',
        'Triangles (Congruence/Similarity)',
        'Quadrilaterals',
        'Statistics',
        'Probability',
      ],
      Grade10: [
        'Real Numbers',
        'Polynomials (Advanced)',
        'Trigonometry (Intro)',
        'Quadratic Equations',
        'Arithmetic Progressions',
        'Circles',
        'Surface Area and Volume',
        'Statistics and Probability',
      ],
      Grade11: [
        'Sets and Relations',
        'Trigonometric Functions',
        'Complex Numbers',
        'Quadratic Functions',
        'Permutations and Combinations',
        'Binomial Theorem',
        'Coordinate Geometry (Advanced)',
        'Limits and Derivatives (Intro)',
      ],
      Grade12: [
        'Relations and Functions',
        'Inverse Trigonometric Functions',
        'Matrices and Determinants',
        'Continuity and Differentiability',
        'Integrals',
        'Differential Equations',
        'Vector Algebra',
        'Probability (Advanced)',
      ],
    },
    kumonLevels: {
      LevelA: ['Counting', 'Basic Addition', 'Basic Subtraction'],
      LevelB: ['Addition (2-digit)', 'Subtraction (2-digit)'],
      LevelC: ['Multiplication', 'Division'],
      LevelD: ['Fractions (Basic)', 'Decimals (Basic)'],
      LevelE: ['Fractions (Operations)', 'Decimals (Operations)'],
      LevelF: ['Pre-Algebra', 'Equations (Simple)'],
      LevelG: ['Algebra I', 'Linear Equations'],
      LevelH: ['Algebra II', 'Quadratics'],
      LevelI: ['Functions', 'Polynomials'],
      LevelJ: ['Geometry (Advanced)', 'Trigonometry (Intro)'],
      LevelK: ['Trigonometry', 'Pre-Calculus'],
      LevelL: ['Differential Calculus'],
      LevelM: ['Integral Calculus'],
      LevelN: ['Advanced Calculus', 'Differential Equations'],
      LevelO: ['University-Level Math', 'Vectors', 'Advanced Probability'],
    },
  } as const;

  export type PracticeTrack = 'k12' | 'kumon';
  export type PracticeTopicGeneratorKey =
    | 'number-sense'
    | 'operations'
    | 'fractions'
    | 'decimals'
    | 'ratios'
    | 'geometry-measurement'
    | 'data-handling'
    | 'algebra'
    | 'functions-coordinate'
    | 'polynomials'
    | 'trigonometry'
    | 'calculus'
    | 'advanced-math';

  export interface PracticeTopicDefinition {
    /** Modular topic ID (backend) */
    id: string;

    /** Human-friendly topic name */
    name: string;

    /** Track: k12 or kumon */
    track: PracticeTrack;

    /** Group key (Grade1, Grade2, LevelA, LevelB, etc.) */
    groupKey: string;

    /** Group label (Grade 1, Grade 2, Kumon Level A, etc.) */
    groupLabel: string;

    /** Generator key (operations, fractions, algebra, etc.) */
    generatorKey: PracticeTopicGeneratorKey;

    /** Display ordering for UI */
    displayOrder: number;

    /** Grade levels (K12 only) */
    grades: GradeLevel[];

    /** Stage label (same as groupLabel) */
    stage: string;

    /** Whether topic supports AI worksheet generation */
    supportsAiWorksheet: boolean;

    /** Static subtopics (FE-defined) */
    subtopics: Array<{
      id: string;
      name: string;
      difficulty: { min: number; max: number };
      conceptualTags: string[];
    }>;

    /** ⭐ Allowed question types for this topic */
    questionTypes: AdvancedQuestionType[];

    /** ⭐ Dynamic metadata (merged from backend EnhancedTopic) */
    cbseGrade: number;
    kumonBand: string;
    practiceLevel: string;

    /** ⭐ Dynamic modular skills (op-division-facts, op-long-division, etc.) */
    skills: string[];

    /** ⭐ Optional: dynamic study material */
    studyMaterial?: Array<{
      type: string;
      title: string;
      url?: string;
    }>;
  }

  export interface PracticeTopicGroup {
    id: string;
    label: string;
    track: PracticeTrack;
    topics: PracticeTopicDefinition[];
  }

  const DEFAULT_QUESTION_TYPES: AdvancedQuestionType[] = ['numeric', 'word-problem'];

  const GENERATOR_QUESTION_TYPES: Record<PracticeTopicGeneratorKey, AdvancedQuestionType[]> = {
    'number-sense': ['numeric', 'word-problem'],
    operations: ['numeric', 'multi-step', 'word-problem'],
    fractions: ['numeric', 'multi-step', 'word-problem'],
    decimals: ['numeric', 'multi-step', 'word-problem'],
    ratios: ['numeric', 'multi-step', 'word-problem'],
    'geometry-measurement': ['numeric', 'graph-interpretation', 'word-problem'],
    'data-handling': ['numeric', 'graph-interpretation', 'word-problem'],
    algebra: ['numeric', 'symbolic', 'multi-step'],
    'functions-coordinate': ['numeric', 'symbolic', 'graph-interpretation', 'function-analysis'],
    polynomials: ['numeric', 'symbolic', 'multi-step'],
    trigonometry: ['numeric', 'symbolic', 'trig-identity'],
    calculus: ['numeric', 'symbolic', 'function-analysis', 'proof-style'],
    'advanced-math': ['numeric', 'symbolic', 'multi-step'],
  };

  const K12_GROUP_LABELS: Record<keyof typeof PRACTICE_TOPIC_MAP.mathTopics, string> = {
    Kindergarten: 'Kindergarten',
    Grade1: 'Grade 1',
    Grade2: 'Grade 2',
    Grade3: 'Grade 3',
    Grade4: 'Grade 4',
    Grade5: 'Grade 5',
    Grade6: 'Grade 6',
    Grade7: 'Grade 7',
    Grade8: 'Grade 8',
    Grade9: 'Grade 9',
    Grade10: 'Grade 10',
    Grade11: 'Grade 11',
    Grade12: 'Grade 12',
  };

  function slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  /**
   * Map human-friendly topic names to new modular topic IDs used by the backend.
   * Falls back to `topic-<slug>` when no explicit mapping exists.
   */
  function mapTopicNameToModularId(topicName: string): string {
    const normalized = topicName.trim().toLowerCase();
    if (/(division|long division)/.test(normalized)) return 'topic-division';
    if (/(addition|add)/.test(normalized)) return 'topic-addition';
    if (/(subtraction|subtract|difference)/.test(normalized)) return 'topic-subtraction';
    if (/(multiplication|multiply|times)/.test(normalized)) return 'topic-multiplication';
    if (/(fraction|fractions)/.test(normalized)) return 'topic-fraction-operations';
    if (/(decimal|decimals)/.test(normalized)) return 'topic-decimals';
    if (/(ratio|proportion|percent)/.test(normalized)) return 'topic-ratios-and-percentages';
    if (/(geometry|area|perimeter|angle|triangle|circle)/.test(normalized)) return 'topic-geometry';
    if (/(algebra|equation|expression)/.test(normalized)) return 'topic-algebra';
    if (/(number|count|place value)/.test(normalized)) return 'topic-number-sense';
    // fallback to a generic topic slug
    return `topic-${slugify(topicName)}`;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function getGradeLevel(key: keyof typeof PRACTICE_TOPIC_MAP.mathTopics): GradeLevel {
    if (key === 'Kindergarten') {
      return 0;
    }
    return Number(key.replace('Grade', '')) as GradeLevel;
  }

  function difficultyRangeForTopic(
    track: PracticeTrack,
    groupKey: string,
  ): { min: number; max: number } {
    if (track === 'k12') {
      const grade = getGradeLevel(groupKey as keyof typeof PRACTICE_TOPIC_MAP.mathTopics);
      const min = clamp(5 + grade * 7, 5, 92);
      return { min, max: clamp(min + 18, min + 8, 100) };
    }

    const levelIndex = groupKey.charCodeAt(groupKey.length - 1) - 'A'.charCodeAt(0);
    const min = clamp(8 + levelIndex * 6, 8, 94);
    return { min, max: clamp(min + 16, min + 6, 100) };
  }

  function resolveGeneratorKey(topicName: string): PracticeTopicGeneratorKey {
    const normalized = topicName.toLowerCase();

    if (/(fraction)/.test(normalized)) {
      return 'fractions';
    }
    if (/(decimal)/.test(normalized)) {
      return 'decimals';
    }
    if (/(ratio|proportion|percent)/.test(normalized)) {
      return 'ratios';
    }
    if (
      /(geometry|shape|angle|triangle|circle|quadrilateral|perimeter|area|volume|surface area|measurement|grid|transformation|pythagorean|drawing|conversion)/.test(
        normalized,
      )
    ) {
      return 'geometry-measurement';
    }
    if (/(graph|plot|statistics|probability|mean|median|mode)/.test(normalized)) {
      return 'data-handling';
    }
    if (/(polynomial|quadratic|binomial)/.test(normalized)) {
      return 'polynomials';
    }
    if (/(function|coordinate)/.test(normalized)) {
      return 'functions-coordinate';
    }
    if (/(trigonometry|trigonometric)/.test(normalized)) {
      return 'trigonometry';
    }
    if (
      /(calculus|derivative|integral|continuity|differentiability|differential equation|limits)/.test(
        normalized,
      )
    ) {
      return 'calculus';
    }
    if (
      /(matrix|vector|complex|set|relation|permutation|combination|determinant|university-level math|advanced calculus|pre-calculus)/.test(
        normalized,
      )
    ) {
      return 'advanced-math';
    }
    if (
      /(equation|expression|algebra|integer|irrational|real numbers|rational numbers|number systems)/.test(
        normalized,
      )
    ) {
      return 'algebra';
    }
    if (
      /(addition|subtraction|multiplication|division|factors|multiples|prime|composite|word problems?)/.test(
        normalized,
      )
    ) {
      return 'operations';
    }
    return 'number-sense';
  }
  function buildTopicDefinition(
    topicName: string,
    track: PracticeTrack,
    groupKey: string,
    groupLabel: string,
    displayOrder: number,
  ): PracticeTopicDefinition {
    const generatorKey = resolveGeneratorKey(topicName);
    const difficultyRange = difficultyRangeForTopic(track, groupKey);
    const topicId = mapTopicNameToModularId(topicName);

    const grade =
      track === 'k12'
        ? [getGradeLevel(groupKey as keyof typeof PRACTICE_TOPIC_MAP.mathTopics)]
        : [];

    return {
      id: topicId,
      name: topicName,
      stage: groupLabel,
      grades: grade,
      supportsAiWorksheet: true,

      subtopics: [
        {
          id: `${topicId}-core`,
          name: topicName,
          difficulty: difficultyRange,
          conceptualTags: [generatorKey, track, groupKey],
        },
      ],

      track,
      groupKey,
      groupLabel,
      generatorKey,
      questionTypes: GENERATOR_QUESTION_TYPES[generatorKey] ?? DEFAULT_QUESTION_TYPES,
      displayOrder,

      // dynamic metadata (UI fetches from backend)
      cbseGrade: 0,
      kumonBand: '',
      practiceLevel: '',
      skills: [],
    };
  }

  const K12_TOPICS = Object.entries(PRACTICE_TOPIC_MAP.mathTopics).flatMap(
    ([groupKey, topicNames], groupIndex) =>
      topicNames.map((topicName, topicIndex) =>
        buildTopicDefinition(
          topicName,
          'k12',
          groupKey,
          K12_GROUP_LABELS[groupKey as keyof typeof PRACTICE_TOPIC_MAP.mathTopics],
          groupIndex * 100 + topicIndex,
        ),
      ),
  );

  const KUMON_TOPICS = Object.entries(PRACTICE_TOPIC_MAP.kumonLevels).flatMap(
    ([groupKey, topicNames], groupIndex) =>
      topicNames.map((topicName, topicIndex) =>
        buildTopicDefinition(
          topicName,
          'kumon',
          groupKey,
          `Kumon ${groupKey.replace('Level', 'Level ')}`,
          2000 + groupIndex * 100 + topicIndex,
        ),
      ),
  );

  export const PRACTICE_TOPIC_CATALOG: PracticeTopicDefinition[] = [...K12_TOPICS, ...KUMON_TOPICS];

  export const PRACTICE_TOPIC_GROUPS: PracticeTopicGroup[] = [
    ...Object.entries(PRACTICE_TOPIC_MAP.mathTopics).map(([groupKey]) => ({
      id: `k12-${slugify(groupKey)}`,
      label: K12_GROUP_LABELS[groupKey as keyof typeof PRACTICE_TOPIC_MAP.mathTopics],
      track: 'k12' as const,
      topics: PRACTICE_TOPIC_CATALOG.filter(
        (topic) => topic.track === 'k12' && topic.groupKey === groupKey,
      ),
    })),
    ...Object.entries(PRACTICE_TOPIC_MAP.kumonLevels).map(([groupKey]) => ({
      id: `kumon-${slugify(groupKey)}`,
      label: `Kumon ${groupKey.replace('Level', 'Level ')}`,
      track: 'kumon' as const,
      topics: PRACTICE_TOPIC_CATALOG.filter(
        (topic) => topic.track === 'kumon' && topic.groupKey === groupKey,
      ),
    })),
  ];

  export function createPracticeTopicTaxonomy(): TopicTaxonomyResponse {
    return {
      topics: PRACTICE_TOPIC_CATALOG,
      difficultyMapping: PRACTICE_TOPIC_CATALOG.flatMap((topic) =>
        topic.subtopics.map((subtopic: { id: any; difficulty: { min: any; max: any; }; }) => ({
          topicId: topic.id,
          subtopicId: subtopic.id,
          minDifficulty: subtopic.difficulty.min,
          maxDifficulty: subtopic.difficulty.max,
        })),
      ),
    };
  }

  export function findPracticeTopicById(topicId: string): PracticeTopicDefinition | undefined {
    return PRACTICE_TOPIC_CATALOG.find((topic) => topic.id === topicId);
  }

  function defaultTopic(): PracticeTopicDefinition {
    return PRACTICE_TOPIC_CATALOG[0];
  }

  function formatNumber(value: number, decimals = 0): string {
    return decimals > 0 ? value.toFixed(decimals) : `${Math.round(value)}`;
  }

  function toFractionString(numerator: number, denominator: number): string {
    return denominator === 1 ? `${numerator}` : `${numerator}/${denominator}`;
  }

  function simplifyFraction(
    numerator: number,
    denominator: number,
  ): { numerator: number; denominator: number } {
    const gcd = (left: number, right: number): number =>
      right === 0 ? left : gcd(right, left % right);
    const factor = gcd(Math.abs(numerator), Math.abs(denominator));
    return { numerator: numerator / factor, denominator: denominator / factor };
  }

  function countFactors(value: number): number {
    let count = 0;
    for (let divisor = 1; divisor <= value; divisor += 1) {
      if (value % divisor === 0) {
        count += 1;
      }
    }
    return count;
  }

  function buildHints(topic: PracticeTopicDefinition, questionType: AdvancedQuestionType): string[] {
    return [
      `Review the ${topic.groupLabel} ${topic.track === 'kumon' ? 'Kumon' : 'school'} strategy for ${topic.name.toLowerCase()}.`,
      `Use a ${questionType.replace(/-/g, ' ')} approach and check units before submitting.`,
    ];
  }

  function createQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    prompt: string,
    answer: string,
    type: AdvancedQuestionType,
  ): AiWorksheet['questions'][number] {
    return {
      id: `${topic.id}-q${index + 1}`,
      type,
      topic: topic.id,
      subtopic: topic.subtopics[0]?.name ?? topic.name,
      prompt,
      answer,
      difficulty,
      hints: buildHints(topic, type),
    };
  }

  function generateNumberSenseQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    const step = index + 1;
    const base = clamp(8 + difficulty + step * 3, 10, 220);
    if (/pattern/i.test(topic.name)) {
      const start = Math.max(2, Math.round(base / 5));
      const increment = Math.max(1, Math.round(difficulty / 18) + 1);
      return createQuestion(
        topic,
        index,
        difficulty,
        `Find the next number in the pattern: ${start}, ${start + increment}, ${start + increment * 2}, ${start + increment * 3}, ?`,
        `${start + increment * 4}`,
        type,
      );
    }
    if (/time/i.test(topic.name)) {
      const startHour = (step % 9) + 1;
      const elapsed = step + Math.max(1, Math.round(difficulty / 25));
      return createQuestion(
        topic,
        index,
        difficulty,
        `A clock shows ${startHour}:00. What hour will it show after ${elapsed} hours? Write only the hour number.`,
        `${((startHour + elapsed - 1) % 12) + 1}`,
        type,
      );
    }
    if (/money/i.test(topic.name)) {
      const quarters = step;
      const dimes = Math.max(1, step - 1);
      const total = quarters * 25 + dimes * 10;
      return createQuestion(
        topic,
        index,
        difficulty,
        `How many cents are in ${quarters} quarter(s) and ${dimes} dime(s)?`,
        `${total}`,
        type,
      );
    }
    if (/shape/i.test(topic.name)) {
      const sides = [3, 4, 5, 6][index % 4];
      return createQuestion(
        topic,
        index,
        difficulty,
        `How many sides does a regular ${['triangle', 'square', 'pentagon', 'hexagon'][index % 4]} have?`,
        `${sides}`,
        type,
      );
    }
    if (/comparison/i.test(topic.name)) {
      const left = base;
      const right = base - (step + 2);
      return createQuestion(
        topic,
        index,
        difficulty,
        `Which number is larger: ${left} or ${right}?`,
        `${left}`,
        type,
      );
    }
    if (/place value/i.test(topic.name)) {
      const number = clamp(111 + step * 37 + difficulty, 120, 999);
      const placeValue = Math.floor(number / 10) % 10;
      return createQuestion(
        topic,
        index,
        difficulty,
        `What digit is in the tens place of ${number}?`,
        `${placeValue}`,
        type,
      );
    }
    const target = clamp(base + step, 5, 200);
    return createQuestion(
      topic,
      index,
      difficulty,
      `Start at ${Math.max(1, target - 1)} and count forward by 1. What number comes next?`,
      `${target}`,
      type,
    );
  }

  function generateOperationsQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    const scale = clamp(Math.round(difficulty / 10) + 2, 2, 12);
    const left = scale * (index + 3);
    const right = clamp(scale + index + 2, 2, 25);

    if (/subtraction|difference/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${left + right} - ${right}`,
        `${left}`,
        type,
      );
    }
    if (/multiplication/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${scale} × ${index + 4}`,
        `${scale * (index + 4)}`,
        type,
      );
    }
    if (/division/i.test(topic.name)) {
      const quotient = index + 3;
      const divisor = Math.max(2, Math.min(12, scale));
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${quotient * divisor} ÷ ${divisor}`,
        `${quotient}`,
        type,
      );
    }
    if (/factor|prime|composite/i.test(topic.name)) {
      const number = 12 + index * 3;
      return createQuestion(
        topic,
        index,
        difficulty,
        `How many factors does ${number} have?`,
        `${countFactors(number)}`,
        type,
      );
    }
    return createQuestion(
      topic,
      index,
      difficulty,
      `Solve: ${left} + ${right}`,
      `${left + right}`,
      type,
    );
  }

  function generateFractionsQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    const denominator = [2, 3, 4, 5, 6, 8][index % 6];
    const numerator = Math.min(denominator - 1, (index % denominator) + 1);
    if (/equivalent/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        `Write an equivalent fraction for ${numerator}/${denominator} with denominator ${denominator * 2}.`,
        `${numerator * 2}/${denominator * 2}`,
        type,
      );
    }
    if (/add|subtract|operations/i.test(topic.name)) {
      const secondNumerator = Math.min(denominator - 1, numerator + 1);
      const total = simplifyFraction(numerator + secondNumerator, denominator);
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${numerator}/${denominator} + ${secondNumerator}/${denominator}`,
        toFractionString(total.numerator, total.denominator),
        type,
      );
    }
    if (/multiply|divide/i.test(topic.name)) {
      const secondNumerator = Math.min(denominator, numerator + 1);
      const total = simplifyFraction(numerator * secondNumerator, denominator * denominator);
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${numerator}/${denominator} × ${secondNumerator}/${denominator}`,
        toFractionString(total.numerator, total.denominator),
        type,
      );
    }
    return createQuestion(
      topic,
      index,
      difficulty,
      `What fraction of a shape is shaded if ${numerator} out of ${denominator} equal parts are shaded?`,
      `${numerator}/${denominator}`,
      type,
    );
  }

  function generateDecimalsQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    const left = (index + 2) / 10 + Math.round(difficulty / 25);
    const right = (index + 3) / 10;
    if (/operations/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve: ${left.toFixed(1)} + ${right.toFixed(1)}`,
        formatNumber(left + right, 1),
        type,
      );
    }
    return createQuestion(
      topic,
      index,
      difficulty,
      `Write ${index + 1}/${(index + 2) * 2} as a decimal to the nearest hundredth.`,
      formatNumber((index + 1) / ((index + 2) * 2), 2),
      type,
    );
  }

  function generateRatiosQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/percent/i.test(topic.name)) {
      const percent = 10 + index * 5;
      const total = 40 + difficulty + index * 5;
      return createQuestion(
        topic,
        index,
        difficulty,
        `What is ${percent}% of ${total}?`,
        formatNumber((percent / 100) * total, 1),
        type,
      );
    }
    const ratioA = index + 2;
    const ratioB = index + 3;
    const scaledA = ratioA * 3;
    return createQuestion(
      topic,
      index,
      difficulty,
      `If the ratio of red to blue marbles is ${ratioA}:${ratioB} and there are ${scaledA} red marbles, how many blue marbles are there?`,
      `${ratioB * 3}`,
      type,
    );
  }

  function generateGeometryMeasurementQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/volume|solid/i.test(topic.name)) {
      const length = index + 3;
      const width = index + 2;
      const height = 2 + Math.round(difficulty / 30);
      return createQuestion(
        topic,
        index,
        difficulty,
        `Find the volume of a rectangular prism with side lengths ${length}, ${width}, and ${height}.`,
        `${length * width * height}`,
        type,
      );
    }
    if (/conversion|measurement/i.test(topic.name)) {
      const meters = index + 2;
      return createQuestion(
        topic,
        index,
        difficulty,
        `Convert ${meters} meter(s) to centimeters.`,
        `${meters * 100}`,
        type,
      );
    }
    if (/angle|triangle|circle|quadrilateral|transformation/i.test(topic.name)) {
      const first = 40 + index * 5;
      const second = 55 + index * 5;
      return createQuestion(
        topic,
        index,
        difficulty,
        `A triangle has angles ${first}° and ${second}°. What is the third angle?`,
        `${180 - first - second}`,
        type,
      );
    }
    const sideA = index + 4;
    const sideB = index + 3;
    if (/area/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        `Find the area of a rectangle with side lengths ${sideA} and ${sideB}.`,
        `${sideA * sideB}`,
        type,
      );
    }
    return createQuestion(
      topic,
      index,
      difficulty,
      `Find the perimeter of a rectangle with side lengths ${sideA} and ${sideB}.`,
      `${2 * (sideA + sideB)}`,
      type,
    );
  }

  function generateDataHandlingQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/probability/i.test(topic.name)) {
      const favorable = index + 2;
      const total = favorable + 4;
      return createQuestion(
        topic,
        index,
        difficulty,
        `A bag has ${favorable} red counters and 4 blue counters. What is the probability of drawing red?`,
        `${favorable}/${total}`,
        type,
      );
    }
    if (/graph|plot/i.test(topic.name)) {
      const count = 6 + index * 2;
      return createQuestion(
        topic,
        index,
        difficulty,
        `A bar graph shows ${count} books read in April and 3 fewer books in May. How many books were read in May?`,
        `${count - 3}`,
        type,
      );
    }
    const numbers = [index + 2, index + 4, index + 6, index + 8];
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    return createQuestion(
      topic,
      index,
      difficulty,
      `Find the mean of ${numbers.join(', ')}.`,
      `${mean}`,
      type,
    );
  }

  function generateAlgebraQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/inequalit/i.test(topic.name)) {
      const answer = index + 3;
      return createQuestion(
        topic,
        index,
        difficulty,
        `Find a value of x that makes x > ${answer - 1}. Enter the least whole number.`,
        `${answer}`,
        type,
      );
    }
    const coefficient = index + 2;
    const answer = index + 4;
    return createQuestion(
      topic,
      index,
      difficulty,
      `Solve for x: ${coefficient}x = ${coefficient * answer}`,
      `${answer}`,
      type,
    );
  }

  function generateFunctionsCoordinateQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/coordinate/i.test(topic.name)) {
      const x1 = index + 1;
      const x2 = x1 + 4;
      return createQuestion(
        topic,
        index,
        difficulty,
        `What is the distance between points (${x1}, 0) and (${x2}, 0)?`,
        `${x2 - x1}`,
        type,
      );
    }
    const x = index + 2;
    return createQuestion(
      topic,
      index,
      difficulty,
      `If f(x) = 2x + 3, what is f(${x})?`,
      `${2 * x + 3}`,
      type,
    );
  }

  function generatePolynomialsQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/quadratic/i.test(topic.name)) {
      const answer = index + 2;
      return createQuestion(
        topic,
        index,
        difficulty,
        `Solve x² = ${answer * answer}. Give the positive solution.`,
        `${answer}`,
        type,
      );
    }
    const x = index + 2;
    return createQuestion(
      topic,
      index,
      difficulty,
      `Evaluate x² + 2x + 1 when x = ${x}.`,
      `${x * x + 2 * x + 1}`,
      type,
    );
  }

  function generateTrigonometryQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    const angle = [30, 45, 60][index % 3];
    const answerByAngle: Record<number, string> = {
      30: '1/2',
      45: '√2/2',
      60: '√3/2',
    };
    return createQuestion(
      topic,
      index,
      difficulty,
      `What is sin ${angle}°?`,
      answerByAngle[angle] ?? '1/2',
      type,
    );
  }

  function generateCalculusQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/integral/i.test(topic.name)) {
      const exponent = (index + 2) * 2;
      return createQuestion(
        topic,
        index,
        difficulty,
        `Find ∫ ${exponent}x dx. Write only the coefficient of x².`,
        `${Math.trunc(exponent / 2)}`,
        type,
      );
    }
    const coefficient = index + 2;
    const exponent = 2;
    return createQuestion(
      topic,
      index,
      difficulty,
      `Find the derivative of ${coefficient}x². Write only the coefficient of x.`,
      `${coefficient * exponent}`,
      type,
    );
  }

  function generateAdvancedMathQuestion(
    topic: PracticeTopicDefinition,
    index: number,
    difficulty: number,
    type: AdvancedQuestionType,
  ) {
    if (/matrix/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        'What is the determinant of [[2, 1], [1, 2]]?',
        '3',
        type,
      );
    }
    if (/vector/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        'Find the magnitude of vector ⟨3, 4⟩.',
        '5',
        type,
      );
    }
    if (/complex/i.test(topic.name)) {
      return createQuestion(topic, index, difficulty, 'What is i²?', '-1', type);
    }
    if (/set/i.test(topic.name)) {
      return createQuestion(
        topic,
        index,
        difficulty,
        'How many elements are in the set {2, 4, 6, 8}?',
        '4',
        type,
      );
    }
    return createQuestion(
      topic,
      index,
      difficulty,
      `How many outcomes are there when choosing 2 items from 4 distinct items?`,
      '6',
      type,
    );
  }

  const GENERATORS: Record<
    PracticeTopicGeneratorKey,
    (
      topic: PracticeTopicDefinition,
      index: number,
      difficulty: number,
      type: AdvancedQuestionType,
    ) => AiWorksheet['questions'][number]
  > = {
    'number-sense': generateNumberSenseQuestion,
    operations: generateOperationsQuestion,
    fractions: generateFractionsQuestion,
    decimals: generateDecimalsQuestion,
    ratios: generateRatiosQuestion,
    'geometry-measurement': generateGeometryMeasurementQuestion,
    'data-handling': generateDataHandlingQuestion,
    algebra: generateAlgebraQuestion,
    'functions-coordinate': generateFunctionsCoordinateQuestion,
    polynomials: generatePolynomialsQuestion,
    trigonometry: generateTrigonometryQuestion,
    calculus: generateCalculusQuestion,
    'advanced-math': generateAdvancedMathQuestion,
  };

  export function generatePracticeWorksheetPreview(
    payload: AiWorksheetRequest
  ):  AiWorksheet {

    const requestedTopicId = Array.isArray(payload.topicId)
      ? payload.topicId[0]
      : payload.topicId;

    const topic = findPracticeTopicById(requestedTopicId) ?? defaultTopic();

    const generator = GENERATORS[topic.generatorKey];
    const questionCount = clamp(payload.questionCount ?? 8, 1, 20);

    const difficulty = clamp(
      Math.round(payload.difficulty ?? topic.subtopics[0]?.difficulty.min ?? 50),
      0,
      100
    );

    const questionTypes =
      payload.questionTypes?.length ? payload.questionTypes : topic.questionTypes;

    return {
      worksheetId: `local-${topic.id}-${difficulty}-${questionCount}`,
      topicId: topic.id,
      difficulty,
      questionTypes,
      generatedAt: new Date().toISOString(),
      skills: payload.skills,

      questions: Array.from({ length: questionCount }, (_, index) => {
        const type = questionTypes[index % questionTypes.length] ?? 'numeric';
        return generator(
          topic,
          index,
          clamp(difficulty + (index % 3) * 3, 0, 100),
          type
        );
      }),

      validation: {
        allQuestionsHaveAnswers: true,
        hasSupportedQuestionTypes: questionTypes.every(
          (type) =>
            topic.questionTypes.includes(type) ||
            DEFAULT_QUESTION_TYPES.includes(type)
        ),
        topicSupported: !!generator
      }
    };
  }
