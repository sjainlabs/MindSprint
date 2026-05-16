import { type ChallengeOption, type MapChallenge, type MapStep } from '../../../services/game.service';

/** Static cooldown (in ms) applied after a failed step attempt. */
export const MAP_STEP_COOLDOWN_MS = 2_000;
/** Region size used for deterministic node-region grouping. */
export const MAP_REGION_SIZE = 2;

export type MapStepOutcome = 'success' | 'fail' | 'partial';
export type MapChallengeOutcome = 'in_progress' | 'success' | 'fail' | 'partial';
export type MapEventType =
  | 'map:state-updated'
  | 'map:step-unlocked'
  | 'map:invalid-move'
  | 'map:step-result'
  | 'audio:play'
  | 'fx:trigger'
  | 'map:state-saved'
  | 'map:state-loaded';

export interface MapTileState {
  id: string;
  nodeId: string;
  type: 'start' | 'path' | 'goal';
  regionId: string;
  blocked: boolean;
}

export interface MapNodeState {
  id: string;
  stepIndex: number;
  regionId: string;
  tileId: string;
  unlocked: boolean;
  completed: boolean;
  blocked: boolean;
  attempts: number;
  cooldownUntilMs: number;
  scoreValue: number;
  penaltyOnFail: number;
}

export interface MapRegionState {
  id: string;
  label: string;
  nodeIds: string[];
  unlocked: boolean;
  completed: boolean;
  unlockRequirement: number;
}

export interface MapChallengeState {
  challengeId: string;
  currentStepIndex: number;
  currentNodeId: string;
  outcome: MapChallengeOutcome;
  progressPercent: number;
  score: number;
  penalties: number;
  totalAttempts: number;
  lastStepCredit: number;
  selectionsByStep: Record<number, ChallengeOption[]>;
  textAnswersByStep: Record<number, string>;
  stepCredits: Record<number, number>;
  tiles: MapTileState[];
  nodes: MapNodeState[];
  regions: MapRegionState[];
}

export interface MapStepEvaluation {
  correctAnswers: ChallengeOption[];
  selectedAnswers: ChallengeOption[];
  textAnswer: string;
  credit: number;
  outcome: MapStepOutcome;
}

export interface MapEngineEvent {
  type: MapEventType;
  message: string;
  payload?: Record<string, unknown>;
}

export interface ApplyMapActionResult {
  state: MapChallengeState;
  events: MapEngineEvent[];
  evaluation?: MapStepEvaluation;
  valid: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function getStep(challenge: MapChallenge, stepIndex: number): MapStep | null {
  const steps = challenge.steps.length > 0
    ? challenge.steps
    : [{
      prompt: challenge.prompt,
      options: challenge.options,
      answerType: challenge.answerType,
      correctAnswers: challenge.correctAnswers,
    }];
  return steps[stepIndex] ?? null;
}

function getCorrectAnswers(challenge: MapChallenge, stepIndex: number): ChallengeOption[] {
  const step = getStep(challenge, stepIndex);
  const answers = step?.correctAnswers?.length ? step.correctAnswers : challenge.correctAnswers;
  return unique(answers ?? []);
}

function evaluateSelectionCredit(
  selectedAnswers: ChallengeOption[],
  correctAnswers: ChallengeOption[],
): number {
  if (correctAnswers.length === 0) {
    return 0;
  }

  const selectedSet = new Set(unique(selectedAnswers));
  const correctSet = new Set(correctAnswers);
  const matched = [...selectedSet].filter((answer) => correctSet.has(answer)).length;
  const extras = [...selectedSet].filter((answer) => !correctSet.has(answer)).length;
  const rawCredit = (matched - extras * 0.5) / correctAnswers.length;
  return clamp(rawCredit, 0, 1);
}

function evaluateTextCredit(textAnswer: string, correctAnswers: ChallengeOption[]): number {
  const normalized = normalizeText(textAnswer);
  if (!normalized.length || correctAnswers.length === 0) {
    return 0;
  }

  const matched = correctAnswers.some((answer) => normalizeText(String(answer)) === normalized);
  return matched ? 1 : 0;
}

function toOutcome(credit: number): MapStepOutcome {
  if (credit >= 1) return 'success';
  if (credit <= 0) return 'fail';
  return 'partial';
}

function computeProgress(state: MapChallengeState): number {
  const total = state.nodes.length;
  if (total === 0) return 0;
  const creditTotal = state.nodes.reduce((sum, node) => sum + (state.stepCredits[node.stepIndex] ?? 0), 0);
  return clamp(Math.round((creditTotal / total) * 100), 0, 100);
}

function regionForIndex(index: number): number {
  return Math.floor(index / MAP_REGION_SIZE) + 1;
}

function markRegionCompletion(state: MapChallengeState): MapRegionState[] {
  return state.regions.map((region) => {
    const allCompleted = region.nodeIds.every((nodeId) => {
      const node = state.nodes.find((candidate) => candidate.id === nodeId);
      return !!node?.completed;
    });
    return { ...region, completed: allCompleted };
  });
}

function unlockNextRegionIfEligible(state: MapChallengeState): MapRegionState[] {
  return state.regions.map((region) => {
    if (region.unlocked) {
      return region;
    }
    const previousRegionIndex = Number(region.id.replace('region-', '')) - 1;
    if (previousRegionIndex <= 0) {
      return region;
    }
    const previousRegion = state.regions.find((item) => item.id === `region-${previousRegionIndex}`);
    const completedInPrevious = previousRegion?.nodeIds.filter((nodeId) => {
      const node = state.nodes.find((candidate) => candidate.id === nodeId);
      return !!node?.completed;
    }).length ?? 0;
    const shouldUnlock = completedInPrevious >= (previousRegion?.unlockRequirement ?? 1);
    return shouldUnlock ? { ...region, unlocked: true } : region;
  });
}

/**
 * Creates a deterministic state model for MAP Challenge gameplay.
 * The model includes tiles, nodes, and regions and is pure/testable.
 */
export function createInitialMapChallengeState(challenge: MapChallenge): MapChallengeState {
  const stepCount = Math.max(challenge.steps.length, 1);
  const nodes: MapNodeState[] = [];
  const tiles: MapTileState[] = [];

  for (let i = 0; i < stepCount; i += 1) {
    const nodeId = `node-${i}`;
    const tileId = `tile-${i}`;
    const regionId = `region-${regionForIndex(i)}`;
    const isFinalNode = i === stepCount - 1;

    nodes.push({
      id: nodeId,
      stepIndex: i,
      regionId,
      tileId,
      unlocked: i === 0,
      completed: false,
      blocked: false,
      attempts: 0,
      cooldownUntilMs: 0,
      scoreValue: 100,
      penaltyOnFail: 20,
    });

    tiles.push({
      id: tileId,
      nodeId,
      regionId,
      type: i === 0 ? 'start' : isFinalNode ? 'goal' : 'path',
      blocked: false,
    });
  }

  const regionCount = Math.max(1, Math.ceil(stepCount / MAP_REGION_SIZE));
  const regions: MapRegionState[] = [];
  for (let regionIndex = 1; regionIndex <= regionCount; regionIndex += 1) {
    const regionId = `region-${regionIndex}`;
    const nodeIds = nodes.filter((node) => node.regionId === regionId).map((node) => node.id);
    regions.push({
      id: regionId,
      label: `Region ${regionIndex}`,
      nodeIds,
      unlocked: regionIndex === 1,
      completed: false,
      unlockRequirement: 1,
    });
  }

  return {
    challengeId: challenge.challengeId,
    currentStepIndex: 0,
    currentNodeId: 'node-0',
    outcome: 'in_progress',
    progressPercent: 0,
    score: 0,
    penalties: 0,
    totalAttempts: 0,
    lastStepCredit: 0,
    selectionsByStep: {},
    textAnswersByStep: {},
    stepCredits: {},
    tiles,
    nodes,
    regions,
  };
}

/** Evaluates one map step from immutable input state and challenge payload. */
export function evaluateMapStep(
  challenge: MapChallenge,
  state: MapChallengeState,
  stepIndex: number,
): MapStepEvaluation {
  const correctAnswers = getCorrectAnswers(challenge, stepIndex);
  const step = getStep(challenge, stepIndex);
  const selectedAnswers = unique(state.selectionsByStep[stepIndex] ?? []);
  const textAnswer = state.textAnswersByStep[stepIndex] ?? '';

  const hasOptions = (step?.options?.length ?? 0) > 0 || challenge.options.length > 0;
  const credit = hasOptions
    ? evaluateSelectionCredit(selectedAnswers, correctAnswers)
    : evaluateTextCredit(textAnswer, correctAnswers);

  return {
    correctAnswers,
    selectedAnswers,
    textAnswer,
    credit,
    outcome: toOutcome(credit),
  };
}

function deriveChallengeOutcome(state: MapChallengeState): MapChallengeOutcome {
  if (state.nodes.length === 0) return 'fail';

  const allCompleted = state.nodes.every((node) => node.completed);
  if (allCompleted && state.progressPercent >= 100) {
    return 'success';
  }

  const hasAnyCredit = Object.values(state.stepCredits).some((credit) => credit > 0);
  const finalNode = state.nodes[state.nodes.length - 1];
  const finalAttempted = finalNode ? finalNode.attempts > 0 : false;

  if (finalAttempted) {
    return hasAnyCredit ? 'partial' : 'fail';
  }

  return 'in_progress';
}

/**
 * Applies a player move/interaction and returns a new immutable state plus emitted events.
 * This function has no hidden side effects and is deterministic for the same inputs.
 */
export function applyMapStepSubmission(
  challenge: MapChallenge,
  previousState: MapChallengeState,
  stepIndex: number,
  nowMs: number,
): ApplyMapActionResult {
  const node = previousState.nodes.find((candidate) => candidate.stepIndex === stepIndex);
  if (!node) {
    return {
      state: previousState,
      valid: false,
      events: [{ type: 'map:invalid-move', message: 'Illegal move: missing map node.' }],
    };
  }

  if (!node.unlocked || node.blocked) {
    return {
      state: previousState,
      valid: false,
      events: [{ type: 'map:invalid-move', message: 'Illegal move: node is locked or blocked.' }],
    };
  }

  if (nowMs < node.cooldownUntilMs) {
    return {
      state: previousState,
      valid: false,
      events: [{ type: 'map:invalid-move', message: 'Illegal move: node is on cooldown.' }],
    };
  }

  const evaluation = evaluateMapStep(challenge, previousState, stepIndex);
  const currentCredit = previousState.stepCredits[stepIndex] ?? 0;
  const creditDelta = Math.max(0, evaluation.credit - currentCredit);

  const nextNodes = previousState.nodes.map((candidate) => {
    if (candidate.stepIndex !== stepIndex) {
      return candidate;
    }

    if (evaluation.outcome === 'success') {
      return {
        ...candidate,
        attempts: candidate.attempts + 1,
        completed: true,
        blocked: false,
        cooldownUntilMs: 0,
      };
    }

    if (evaluation.outcome === 'partial') {
      return {
        ...candidate,
        attempts: candidate.attempts + 1,
        blocked: false,
        cooldownUntilMs: 0,
      };
    }

    return {
      ...candidate,
      attempts: candidate.attempts + 1,
      blocked: false,
      cooldownUntilMs: nowMs + MAP_STEP_COOLDOWN_MS,
    };
  });

  const unlockableStep = stepIndex + 1;
  const unlockedNodes = nextNodes.map((candidate) => {
    if (candidate.stepIndex !== unlockableStep) {
      return candidate;
    }

    const region = previousState.regions.find((item) => item.id === candidate.regionId);
    const regionUnlocked = region?.unlocked ?? false;
    return regionUnlocked ? { ...candidate, unlocked: true } : candidate;
  });

  const provisionalState: MapChallengeState = {
    ...previousState,
    nodes: unlockedNodes,
    currentStepIndex: stepIndex,
    currentNodeId: node.id,
    totalAttempts: previousState.totalAttempts + 1,
    score:
      previousState.score
      + Math.round(node.scoreValue * creditDelta)
      - (evaluation.outcome === 'fail' ? node.penaltyOnFail : 0),
    penalties:
      previousState.penalties + (evaluation.outcome === 'fail' ? node.penaltyOnFail : 0),
    lastStepCredit: evaluation.credit,
    stepCredits: { ...previousState.stepCredits, [stepIndex]: Math.max(currentCredit, evaluation.credit) },
  };

  const regionsWithCompletion = markRegionCompletion(provisionalState);
  const regionsWithUnlocking = unlockNextRegionIfEligible({ ...provisionalState, regions: regionsWithCompletion });

  const nodesWithRegionUnlock = provisionalState.nodes.map((candidate) => {
    const region = regionsWithUnlocking.find((item) => item.id === candidate.regionId);
    if (!region?.unlocked) {
      return candidate;
    }
    return { ...candidate, unlocked: true };
  });

  const progressPercent = computeProgress({ ...provisionalState, nodes: nodesWithRegionUnlock });
  const stateWithOutcomeBase: MapChallengeState = {
    ...provisionalState,
    nodes: nodesWithRegionUnlock,
    regions: regionsWithUnlocking,
    progressPercent,
  };

  const nextState: MapChallengeState = {
    ...stateWithOutcomeBase,
    outcome: deriveChallengeOutcome(stateWithOutcomeBase),
  };

  const events: MapEngineEvent[] = [
    {
      type: 'map:step-result',
      message: `Step ${stepIndex + 1} ${evaluation.outcome}`,
      payload: { stepIndex, outcome: evaluation.outcome, credit: evaluation.credit },
    },
    {
      type: 'map:state-updated',
      message: 'Map state updated.',
      payload: { progressPercent: nextState.progressPercent, score: nextState.score },
    },
  ];

  if (evaluation.outcome === 'success') {
    events.push({ type: 'audio:play', message: 'play:map-step-success' });
    events.push({ type: 'fx:trigger', message: 'fx:map-step-success' });
  } else if (evaluation.outcome === 'partial') {
    events.push({ type: 'audio:play', message: 'play:map-step-partial' });
    events.push({ type: 'fx:trigger', message: 'fx:map-step-partial' });
  } else {
    events.push({ type: 'audio:play', message: 'play:map-step-fail' });
    events.push({ type: 'fx:trigger', message: 'fx:map-step-fail' });
  }

  if (nextState.nodes.some((candidate) => candidate.stepIndex === unlockableStep && candidate.unlocked)) {
    events.push({ type: 'map:step-unlocked', message: `Step ${unlockableStep + 1} unlocked.` });
  }

  return { state: nextState, events, evaluation, valid: true };
}

/**
 * Validates movement/navigation between nodes by checking unlocked paths and cooldown.
 */
export function validateMapMove(
  state: MapChallengeState,
  targetStepIndex: number,
  nowMs: number,
): { valid: boolean; reason?: string } {
  if (targetStepIndex < 0 || targetStepIndex >= state.nodes.length) {
    return { valid: false, reason: 'Illegal move: step out of bounds.' };
  }

  const node = state.nodes.find((candidate) => candidate.stepIndex === targetStepIndex);
  if (!node) {
    return { valid: false, reason: 'Illegal move: node does not exist.' };
  }

  if (!node.unlocked || node.blocked) {
    return { valid: false, reason: 'Blocked path: node is locked or blocked.' };
  }

  if (nowMs < node.cooldownUntilMs) {
    return { valid: false, reason: 'Blocked path: node cooldown active.' };
  }

  return { valid: true };
}

/** Serialize state for save/load integration. */
export function serializeMapChallengeState(state: MapChallengeState): string {
  return JSON.stringify({ version: 1, state });
}

/** Deserialize state snapshot and validate challenge identity. */
export function deserializeMapChallengeState(serialized: string, challengeId: string): MapChallengeState | null {
  try {
    const parsed = JSON.parse(serialized) as { version?: number; state?: MapChallengeState };
    if (parsed.version !== 1 || !parsed.state || parsed.state.challengeId !== challengeId) {
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}
