import {
  PRACTICE_TOPIC_CATALOG,
  PRACTICE_TOPIC_GROUPS,
  PRACTICE_TOPIC_MAP,
  createPracticeTopicTaxonomy,
  generatePracticeWorksheetPreview,
} from './practice-topic-catalog';

describe('practice topic catalog', () => {
  it('uses the full K-12 + Kumon source map as the topic catalog', () => {
    const sourceTopicCount =
      Object.values(PRACTICE_TOPIC_MAP.mathTopics).reduce((sum, topics) => sum + topics.length, 0) +
      Object.values(PRACTICE_TOPIC_MAP.kumonLevels).reduce((sum, topics) => sum + topics.length, 0);

    expect(PRACTICE_TOPIC_CATALOG.length).toBe(sourceTopicCount);
    expect(createPracticeTopicTaxonomy().topics.length).toBe(sourceTopicCount);
  });

  it('groups topics by grade and Kumon level', () => {
    expect(PRACTICE_TOPIC_GROUPS.some((group) => group.label === 'Kindergarten')).toBe(true);
    expect(PRACTICE_TOPIC_GROUPS.some((group) => group.label === 'Kumon Level A')).toBe(true);
  });

  it('maps every topic to a valid worksheet generator', () => {
    for (const topic of PRACTICE_TOPIC_CATALOG) {
      const worksheet = generatePracticeWorksheetPreview({
        topic: topic.id,
        difficulty: 55,
        questionCount: 3,
        questionTypes: topic.questionTypes,
      });

      expect(worksheet.validation.topicSupported).toBe(true);
      expect(worksheet.validation.allQuestionsHaveAnswers).toBe(true);
      expect(worksheet.questions).toHaveLength(3);
      expect(worksheet.questions.every((question) => question.prompt.length > 0)).toBe(true);
      expect(worksheet.questions.every((question) => question.answer.length > 0)).toBe(true);
    }
  });
});
