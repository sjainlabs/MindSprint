import {
  MAP_STEP_COOLDOWN_MS,
  applyMapStepSubmission,
  createInitialMapChallengeState,
  deserializeMapChallengeState,
  evaluateMapStep,
  serializeMapChallengeState,
  validateMapMove,
} from './map-challenge.engine';
import { type MapChallenge } from '../../../services/game.service';

const mapChallengeFixture: MapChallenge = {
  challengeId: 'map-engine-1',
  studentId: 'student-demo',
  gradeLevel: 4,
  domain: 'Data & Graphs',
  difficulty: 65,
  prompt: 'Read the graph and answer.',
  steps: [
    {
      id: 's1',
      prompt: 'How many apples?',
      options: [2, 3, 4],
      answerType: 'single',
      correctAnswers: [4],
    },
    {
      id: 's2',
      prompt: 'Choose all correct statements.',
      options: ['A', 'B', 'C'],
      answerType: 'multi',
      correctAnswers: ['A', 'C'],
    },
    {
      id: 's3',
      prompt: 'Type final total.',
      answerType: 'single',
      correctAnswers: ['7'],
    },
  ],
  options: [2, 3, 4],
  answerType: 'single',
  correctAnswers: [4],
  hints: ['Count bars carefully.'],
  explanation: 'Use the chart labels.',
  rewards: { xp: 20, streakBonus: 5, badge: '📊 MAP Achiever' },
  mode: 'map',
};

describe('map-challenge.engine', () => {
  it('builds initial map state with tiles, nodes, and regions', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);

    expect(state.tiles).toHaveLength(3);
    expect(state.nodes).toHaveLength(3);
    expect(state.regions.length).toBeGreaterThan(0);
    expect(state.nodes[0].unlocked).toBe(true);
    expect(state.nodes[1].unlocked).toBe(false);
    expect(state.outcome).toBe('in_progress');
  });

  it('evaluates single-select step as success', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const withSelection = {
      ...state,
      selectionsByStep: { 0: [4] },
    };

    const evaluation = evaluateMapStep(mapChallengeFixture, withSelection, 0);
    expect(evaluation.outcome).toBe('success');
    expect(evaluation.credit).toBe(1);
  });

  it('evaluates multi-select partial credit with extra options', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const withSelection = {
      ...state,
      selectionsByStep: { 1: ['A', 'B'] },
    };

    const evaluation = evaluateMapStep(mapChallengeFixture, withSelection, 1);
    expect(evaluation.outcome).toBe('partial');
    expect(evaluation.credit).toBe(0.25);
  });

  it('applies successful step submission and unlocks next node', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const withSelection = {
      ...state,
      selectionsByStep: { 0: [4] },
    };

    const result = applyMapStepSubmission(mapChallengeFixture, withSelection, 0, 1000);

    expect(result.valid).toBe(true);
    expect(result.state.nodes[0].completed).toBe(true);
    expect(result.state.nodes[1].unlocked).toBe(true);
    expect(result.state.score).toBe(100);
    expect(result.events.some((event) => event.type === 'audio:play')).toBe(true);
  });

  it('applies failed step submission with penalty and cooldown', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const withSelection = {
      ...state,
      selectionsByStep: { 0: [2] },
    };

    const result = applyMapStepSubmission(mapChallengeFixture, withSelection, 0, 500);

    expect(result.valid).toBe(true);
    expect(result.state.penalties).toBe(20);
    expect(result.state.nodes[0].cooldownUntilMs).toBe(500 + MAP_STEP_COOLDOWN_MS);
    expect(result.state.score).toBe(-20);
    expect(result.evaluation?.outcome).toBe('fail');
  });

  it('rejects submission while node cooldown is active', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const cooldownState = {
      ...state,
      nodes: state.nodes.map((node, index) =>
        index === 0 ? { ...node, cooldownUntilMs: 10_000 } : node,
      ),
      selectionsByStep: { 0: [4] },
    };

    const result = applyMapStepSubmission(mapChallengeFixture, cooldownState, 0, 1000);

    expect(result.valid).toBe(false);
    expect(result.events[0].type).toBe('map:invalid-move');
  });

  it('validates illegal and blocked moves at boundaries', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);

    expect(validateMapMove(state, -1, 0)).toEqual({
      valid: false,
      reason: 'Illegal move: step out of bounds.',
    });

    expect(validateMapMove(state, 2, 0)).toEqual({
      valid: false,
      reason: 'Blocked path: node is locked or blocked.',
    });
  });

  it('serializes and deserializes state deterministically', () => {
    const state = createInitialMapChallengeState(mapChallengeFixture);
    const serialized = serializeMapChallengeState(state);
    const deserialized = deserializeMapChallengeState(serialized, mapChallengeFixture.challengeId);

    expect(deserialized).toEqual(state);
    expect(deserializeMapChallengeState(serialized, 'other-challenge')).toBeNull();
  });

  it('produces success outcome after all steps are completed', () => {
    let state = createInitialMapChallengeState(mapChallengeFixture);

    state = {
      ...state,
      selectionsByStep: { ...state.selectionsByStep, 0: [4] },
    };
    state = applyMapStepSubmission(mapChallengeFixture, state, 0, 0).state;

    state = {
      ...state,
      selectionsByStep: { ...state.selectionsByStep, 1: ['A', 'C'] },
    };
    state = applyMapStepSubmission(mapChallengeFixture, state, 1, 3000).state;

    state = {
      ...state,
      textAnswersByStep: { ...state.textAnswersByStep, 2: '7' },
    };
    state = applyMapStepSubmission(mapChallengeFixture, state, 2, 6000).state;

    expect(state.outcome).toBe('success');
    expect(state.progressPercent).toBe(100);
  });
});
