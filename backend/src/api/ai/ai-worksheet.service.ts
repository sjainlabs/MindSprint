import {
  type AIWorksheet,
  type AIWorksheetQuestion,
  type AIWorksheetRequest,
  type AdvancedQuestionType,
} from '../../models/types';
import { findTopicById } from '../topics/topic.service';

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 100;
const DEFAULT_QUESTION_COUNT = 8;
const MAX_QUESTION_COUNT = 20;

const SUPPORTED_ADVANCED_TOPICS = new Set([
  'algebra-i',
  'geometry',
  'algebra-ii',
  'trigonometry',
  'pre-calculus',
  'calculus',
]);

const DEFAULT_TYPES: AdvancedQuestionType[] = [
  'numeric',
  'symbolic',
  'multi-step',
  'graph-interpretation',
  'word-problem',
  'proof-style',
  'function-analysis',
  'trig-identity',
];

const QUESTION_TEMPLATES: Record<AdvancedQuestionType, (subtopic: string, difficulty: number) => Omit<AIWorksheetQuestion, 'id' | 'topic'>> =
  {
    numeric: (subtopic, difficulty) => ({
      type: 'numeric',
      subtopic,
      difficulty,
      prompt: `Solve the ${subtopic} numeric exercise calibrated at difficulty ${difficulty}.`,
      answer: `${Math.max(1, Math.round(difficulty * 1.5))}`,
      hints: ['Set up the equation before calculating.', 'Check arithmetic carefully.'],
    }),
    symbolic: (subtopic, difficulty) => ({
      type: 'symbolic',
      subtopic,
      difficulty,
      prompt: `Simplify the symbolic ${subtopic} expression at difficulty ${difficulty}.`,
      answer: 'Equivalent symbolic form',
      hints: ['Apply identities step-by-step.', 'Preserve domain constraints.'],
    }),
    'multi-step': (subtopic, difficulty) => ({
      type: 'multi-step',
      subtopic,
      difficulty,
      prompt: `Complete a multi-step ${subtopic} derivation at difficulty ${difficulty}.`,
      answer: 'Final simplified result with major intermediate steps',
      hints: ['Break into smaller subproblems.', 'Verify each transformation before continuing.'],
    }),
    'graph-interpretation': (subtopic, difficulty) => ({
      type: 'graph-interpretation',
      subtopic,
      difficulty,
      prompt: `Interpret the graph for the ${subtopic} scenario and identify key features.`,
      answer: 'Key graph feature summary (intercepts, slope/shape, extrema as relevant)',
      hints: ['Identify axes and scales first.', 'Read trend changes before calculating.'],
    }),
    'word-problem': (subtopic, difficulty) => ({
      type: 'word-problem',
      subtopic,
      difficulty,
      prompt: `Model and solve a real-world ${subtopic} word problem at difficulty ${difficulty}.`,
      answer: 'Model equation + final interpreted solution',
      hints: ['Define variables with units.', 'Translate each sentence into math relations.'],
    }),
    'proof-style': (subtopic, difficulty) => ({
      type: 'proof-style',
      subtopic,
      difficulty,
      prompt: `Write a proof-style response validating a ${subtopic} claim.`,
      answer: 'Structured argument with statements and justifications',
      hints: ['State givens and goal.', 'Use clear logical sequencing.'],
    }),
    'function-analysis': (subtopic, difficulty) => ({
      type: 'function-analysis',
      subtopic,
      difficulty,
      prompt: `Analyze a function in ${subtopic}: domain, behavior, and critical characteristics.`,
      answer: 'Domain/range and behavior analysis summary',
      hints: ['Start with restrictions.', 'Then inspect growth, turning points, and asymptotes.'],
    }),
    'trig-identity': (subtopic, difficulty) => ({
      type: 'trig-identity',
      subtopic,
      difficulty,
      prompt: `Prove or simplify a trigonometric identity tied to ${subtopic}.`,
      answer: 'Equivalent identity form after valid transformations',
      hints: ['Rewrite in sine/cosine first.', 'Use identities one at a time.'],
    }),
  };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sanitizeQuestionTypes = (questionTypes?: AdvancedQuestionType[]): AdvancedQuestionType[] => {
  if (!questionTypes || questionTypes.length === 0) {
    return DEFAULT_TYPES;
  }
  const deduped = [...new Set(questionTypes)];
  return deduped.filter((type) => DEFAULT_TYPES.includes(type));
};

export const generateAiWorksheet = (request: AIWorksheetRequest): AIWorksheet => {
  const topicId = request.topic.trim().toLowerCase();
  const topic = findTopicById(topicId);
  const difficulty = clamp(Math.round(request.difficulty), MIN_DIFFICULTY, MAX_DIFFICULTY);
  const questionCount = clamp(Math.round(request.questionCount ?? DEFAULT_QUESTION_COUNT), 1, MAX_QUESTION_COUNT);
  const questionTypes = sanitizeQuestionTypes(request.questionTypes);

  if (!topic || !SUPPORTED_ADVANCED_TOPICS.has(topic.id)) {
    throw new Error('AI worksheet supports advanced topics from Algebra I through Calculus.');
  }

  if (questionTypes.length === 0) {
    throw new Error('No supported question types were provided.');
  }

  const questions: AIWorksheetQuestion[] = Array.from({ length: questionCount }, (_, index) => {
    const type = questionTypes[index % questionTypes.length];
    const subtopic = topic.subtopics[index % topic.subtopics.length];
    const payload = QUESTION_TEMPLATES[type](subtopic.name, difficulty);
    return {
      id: `aiq-${index + 1}`,
      topic: topic.id,
      ...payload,
    };
  });

  return {
    worksheetId: `ai-ws-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
    topic: topic.id,
    difficulty,
    generatedAt: new Date().toISOString(),
    questionTypes,
    questions,
    validation: {
      allQuestionsHaveAnswers: questions.every((question) => question.answer.trim().length > 0),
      hasSupportedQuestionTypes: questions.every((question) => DEFAULT_TYPES.includes(question.type)),
      topicSupported: SUPPORTED_ADVANCED_TOPICS.has(topic.id),
    },
  };
};

