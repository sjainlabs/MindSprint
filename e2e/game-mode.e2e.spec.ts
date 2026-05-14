import { expect, type Page, test } from '@playwright/test';

const mockProfile = {
  studentId: 'student-demo',
  age: 10,
  grade: 5,
  masteryLevels: { addition: 80, subtraction: 70, multiplication: 65, division: 60 },
  topicMastery: {},
  xp: 300,
  level: 4,
  streak: 3,
  badges: [],
  learningPathLevel: 5,
  updatedAt: new Date().toISOString(),
};

const mockAbacusChallenge = {
  challengeId: 'abacus-1',
  studentId: 'student-demo',
  timeLimitSeconds: 30,
  difficulty: 65,
  recommendedLevel: 'Intermediate',
  rewards: { xp: 10, streakBonus: 5, badge: '⚡ Fluency Champion' },
  dailyQuest: { id: 'q-1', description: 'Complete 3 challenges', target: 3, progress: 1, rewardXp: 50, completed: false },
  bossBattle: { id: 'b-1', title: 'Math Dragon', hp: 100, phase: 1, unlocked: false },
  playerState: { xp: 300, streak: 3, badges: [], level: 4 },
  mode: 'abacus-flash',
  prompt: 'Add all flashed numbers.',
  gamePayload: { flashSequence: [3, 7, 2], speedMs: 100 },
};

const mockMapChallenge = {
  challengeId: 'map-1',
  studentId: 'student-demo',
  gradeLevel: 3,
  domain: 'Data & Graphs',
  difficulty: 62,
  prompt: 'Use the graph and table to answer each step.',
  steps: [
    {
      id: 's1',
      prompt: 'How many apples are shown?',
      options: [2, 3, 4, 5],
      answerType: 'single',
      correctAnswers: [4],
    },
    {
      id: 's2',
      prompt: 'Select all true statements.',
      options: ['A', 'B', 'C', 'D'],
      answerType: 'multi',
      correctAnswers: ['A', 'C'],
    },
  ],
  options: ['A', 'B', 'C', 'D'],
  answerType: 'multi',
  correctAnswers: ['A', 'C'],
  graphPayload: {
    type: 'bar',
    labels: ['Mon', 'Tue'],
    values: [3, 4],
  },
  tablePayload: {
    headers: ['Day', 'Value'],
    rows: [['Mon', 3], ['Tue', 4]],
  },
  hints: ['Look at each bar carefully.'],
  explanation: 'A and C are true based on the data.',
  rewards: { xp: 12, streakBonus: 3, badge: '📊 MAP Achiever' },
  mode: 'map',
};

async function mockGameApi(page: Page): Promise<Array<Record<string, unknown>>> {
  const submitPayloads: Array<Record<string, unknown>> = [];

  await page.route('**/api/students/*/profile', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', json: mockProfile }),
  );

  await page.route('**/api/game/challenge**', (route) => {
    const requestUrl = new URL(route.request().url());
    const mode = requestUrl.searchParams.get('mode');
    const body = mode === 'map' ? mockMapChallenge : mockAbacusChallenge;
    return route.fulfill({ status: 200, contentType: 'application/json', json: body });
  });

  await page.route('**/api/game/submit', async (route) => {
    const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    submitPayloads.push(payload);
    const body =
      payload.mode === 'abacus-flash'
        ? {
            correct: true,
            xpEarned: 15,
            newDifficulty: 70,
            newStreak: 4,
            dailyQuestProgress: 2,
          }
        : { saved: true, xpEarned: 12 };
    return route.fulfill({ status: 200, contentType: 'application/json', json: body });
  });

  return submitPayloads;
}

test('switches between Abacus Flash and MAP modes', async ({ page }) => {
  await mockGameApi(page);
  await page.goto('/#/game');

  await expect(page.getByText('⚡ Abacus Flash')).toBeVisible();

  await page.getByRole('button', { name: /MAP Challenge/i }).click();
  await expect(page.getByText('Use the graph and table to answer each step.')).toBeVisible();

  await page.getByRole('button', { name: /Abacus Flash/i }).click();
  await expect(page.getByText('⚡ Abacus Flash')).toBeVisible();
});

test('completes MAP multi-step flow and submits', async ({ page }) => {
  const submitPayloads = await mockGameApi(page);
  await page.goto('/#/game');
  await page.getByRole('button', { name: /MAP Challenge/i }).click();

  await page.getByRole('button', { name: /Step 1, single-select option 4/i }).click();
  await expect(page.getByText('Select all true statements.')).toBeVisible();

  await page.getByRole('button', { name: /Step 2, multi-select option A/i }).click();
  await page.getByRole('button', { name: /Step 2, multi-select option C/i }).click();
  await page.getByRole('button', { name: /Submit MAP Answers/i }).click();

  await expect.poll(() => submitPayloads.length).toBe(1);
  expect(submitPayloads[0]['mode']).toBe('map');
});

test('plays full Abacus Flash sequence before showing answer input', async ({ page }) => {
  await mockGameApi(page);
  await page.goto('/#/game');

  const flashNumber = page.locator('.flash-number').first();
  await expect(flashNumber).toContainText('3');
  await expect(page.locator('#abacus-answer')).toBeHidden();

  await expect(flashNumber).toContainText('7');
  await expect(flashNumber).toContainText('2');

  await expect(page.locator('#abacus-answer')).toBeVisible();
});

test('submits Abacus Flash answer after sequence playback', async ({ page }) => {
  const submitPayloads = await mockGameApi(page);
  await page.goto('/#/game');

  await expect(page.locator('#abacus-answer')).toBeVisible();
  await page.locator('#abacus-answer').fill('12');
  await page.getByRole('button', { name: /Submit Challenge/i }).click();

  await expect.poll(() => submitPayloads.length).toBe(1);
  expect(submitPayloads[0]['mode']).toBe('abacus-flash');
  expect(submitPayloads[0]['score']).toBe(100);
  expect(submitPayloads[0]['accuracy']).toBe(100);
});
