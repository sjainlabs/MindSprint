import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type ChallengeOption,
  GameService,
  type AbacusFlashPayload,
  type BossBattlePayload,
  type CompetitionBossPayload,
  type FallingNumbersPayload,
  type FluencyPayload,
  type GameChallenge,
  type LegacyChallenge,
  type MapAnswerType,
  type MapChallenge,
  type MapStep,
} from '../../services/game.service';
import { FallingNumbersComponent } from './falling-numbers/falling-numbers.component';
import { FallingNumbersEngine } from './falling-numbers/falling-numbers.engine';
import { type FallingPowerUpType } from './falling-numbers/falling-numbers.types';
import { BossBattleComponent } from './boss-battle/boss-battle.component';
import { BossBattleEngine } from './boss-battle/boss-battle.engine';
import { CompetitionBossModeComponent } from './competition-boss/competition-boss';
import { CompetitionBossEngine } from './competition-boss/competition-boss.engine';
import { AiPuzzleComponent } from './ai-puzzle/ai-puzzle.component';
import { AiPuzzleEngine } from './ai-puzzle/ai-puzzle.engine';
import { FluencyModeComponent } from './fluency/fluency.component';
import { FluencyEngine, type FluencyOperation } from './fluency/fluency.engine';
import { ReasoningPuzzleModeComponent } from './reasoning-puzzle/reasoning-puzzle.component';
import { ReasoningPuzzleEngine } from './reasoning-puzzle/reasoning-puzzle.engine';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type GameMode,
} from '../../services/student-intelligence.service';
import { MapGraphComponent } from '../../components/map-graph/map-graph';
import { MapTableComponent } from '../../components/map-table/map-table';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import {
  MAP_AUTO_ADVANCE_DELAY_MS,
  MAP_DIFFICULTY_ADVANCED_THRESHOLD,
  MAP_DIFFICULTY_READY_THRESHOLD,
} from '../../constants/ui.constants';
import {
  applyMapStepSubmission,
  createInitialMapChallengeState,
  deserializeMapChallengeState,
  serializeMapChallengeState,
  validateMapMove,
  type MapChallengeState,
  type MapEngineEvent,
} from './map-challenge/map-challenge.engine';

const DAILY_QUEST_TARGET = 3;
/** Fallback speed (ms per number) used when the payload omits speedMs. */
const DEFAULT_FLASH_SPEED_MS = 600;
const MAP_CHALLENGE_STORAGE_KEY_PREFIX = 'mindsprint.map.challenge';
const GAME_STATE = {
  START: 'START',
  NEXT: 'NEXT',
  ROUND: 'ROUND',
} as const;
type AbacusGameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];
type FallingEnginePayload = Omit<FallingNumbersPayload, 'powerUps'> & {
  powerUps: FallingPowerUpType[];
};
type AiPuzzlePayload = {
  puzzleId: string;
  prompt: string;
  options?: string[];
  answer: string;
  difficulty: number;
};
type ReasoningPuzzlePayload = {
  puzzleId: string;
  prompt: string;
  options?: string[];
  answer: string;
  difficulty: number;
};

export type SuperGameMode =
  | 'abacus-flash'
  | 'falling-numbers'
  | 'boss-battle'
  | 'ai-puzzle'
  | 'fluency'
  | 'map'
  | 'reasoning-puzzle'
  | 'competition-boss';

@Component({
  selector: 'app-game-mode',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MapGraphComponent,
    MapTableComponent,
    LanguageToggleComponent,
    TranslatePipe,
    FallingNumbersComponent,
    BossBattleComponent,
    CompetitionBossModeComponent,
    AiPuzzleComponent,
    FluencyModeComponent,
    ReasoningPuzzleModeComponent,
  ],
  templateUrl: './game-mode.html',
  styleUrl: './game-mode.css',
})
export class GameModeComponent implements OnDestroy {
  readonly t = inject(TranslationService);
  readonly GAME_STATE = GAME_STATE;
  studentId = signal(DEFAULT_STUDENT_ID);
  challenge = signal<GameChallenge | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  selectedAnswer = signal<ChallengeOption | null>(null);
  selectedAnswers = signal<ChallengeOption[]>([]);
  challengeSubmitted = signal(false);
  completedQuests = signal(0);
  adaptiveDifficulty = signal<number | null>(null);
  localXp = signal(0);
  localStreak = signal(0);
  unlockedBadges = signal<string[]>([]);
  selectedMode = signal<SuperGameMode>('abacus-flash');
  currentStepIndex = signal(0);
  stepDirection = signal<'left' | 'right'>('left');
  mapHintsOpen = signal(false);
  mapState = signal<MapChallengeState | null>(null);
  mapEvents = signal<MapEngineEvent[]>([]);
  mapAudioCue = signal('');
  mapFxCue = signal('');
  mapLastValidationError = signal('');
  mapPartialCredit = signal(0);
  /** The API-compatible mode used for the currently loaded challenge */
  private activeChallengeApiMode: GameMode = 'abacus-flash';

  // ── Abacus Flash state ─────────────────────────────────────────────────────
  currentFlashNumber = signal<number | null>(null);
  flashSequence = signal<number[]>([]);
  flashCurrentIndex = signal(0);
  flashState = signal<AbacusGameState>(GAME_STATE.START);
  showQuestion = signal(false);
  isFlashing = signal(false);
  private flashTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private flashSequenceToken = 0;
  private mapAutoAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly fallingEngine = new FallingNumbersEngine();
  readonly bossBattleEngine = new BossBattleEngine();
  readonly competitionBossEngine = new CompetitionBossEngine();
  readonly aiPuzzleEngine = new AiPuzzleEngine();
  readonly fluencyEngine = new FluencyEngine();
  readonly reasoningPuzzleEngine = new ReasoningPuzzleEngine();

  gameModeOptions: Array<{ value: SuperGameMode; label: string; description: string; icon: string }> = [
    { value: 'abacus-flash', label: 'Abacus Flash', description: 'Flash-card speed drills with adaptive pacing.', icon: '🔢' },
    { value: 'falling-numbers', label: 'Falling Numbers', description: 'Catch target sums, build combos, use power-ups.', icon: '🎮' },
    { value: 'boss-battle', label: 'Boss Battle', description: 'Timed HP-bar battle with special attacks.', icon: '⚔️' },
    { value: 'ai-puzzle', label: 'AI Puzzle', description: 'Logic, pattern and geometry puzzles.', icon: '🤖' },
    { value: 'fluency', label: 'Fluency', description: 'Rapid-fire arithmetic drills against the clock.', icon: '⚡' },
    { value: 'reasoning-puzzle', label: 'Reasoning Puzzle', description: 'Multi-step reasoning and logical deduction.', icon: '🔍' },
    { value: 'map', label: 'MAP Challenge', description: 'Graph interpretation and MAP-style word problems.', icon: '📊' },
    { value: 'competition-boss', label: 'Competition Boss', description: 'AMC/MATHCOUNTS-level boss battle problems.', icon: '🏆' },
  ];

  // Grouped for UI display
  coreModes = this.gameModeOptions.slice(0, 4);
  superModes = this.gameModeOptions.slice(4);

  xpTotal = computed(() => (this.legacyChallenge()?.playerState.xp ?? 0) + this.localXp());
  streakTotal = computed(() => Math.max(this.legacyChallenge()?.playerState.streak ?? 0, this.localStreak()));
  currentBadges = computed(() => {
    const base = this.legacyChallenge()?.playerState.badges ?? [];
    return [...new Set([...base, ...this.unlockedBadges()])];
  });
  isCorrect = computed(() => {
    if (!this.challengeSubmitted()) {
      return null;
    }
    if (this.isMapActive()) {
      return this.mapPartialCredit() === 1;
    }
    const challenge = this.challenge();
    if (!challenge || !this.hasAnswerOptions(challenge) || this.selectedAnswer() === null) {
      return null;
    }
    return this.selectedAnswer() === challenge.answer;
  });

  isSuperMode = computed(() => {
    const mode = this.selectedMode();
    return ['fluency', 'reasoning-puzzle', 'map', 'competition-boss'].includes(mode);
  });

  superModeInfo = computed(() => {
    const mode = this.selectedMode();
    const info: Record<string, { badge: string; tip: string }> = {
      fluency: { badge: '⚡ Fluency Champion', tip: 'Answer as fast as possible! Speed builds automaticity.' },
      'reasoning-puzzle': { badge: '🔍 Logic Master', tip: 'Take your time. Read carefully and think step by step.' },
      map: { badge: '📊 MAP Achiever', tip: 'These questions mirror real MAP test items. Pace yourself.' },
      'competition-boss': { badge: '🏆 Competition Pro', tip: 'Hard problems. Show all work mentally before answering.' },
    };
    return info[mode] ?? null;
  });

  constructor(
    private readonly gameService: GameService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
  ) {
    effect(() => {
      const isCompetitionBoss = this.selectedMode() === 'competition-boss';
      const challenge = this.challenge();
      const outcome = this.competitionBossEngine.outcome();

      if (
        !isCompetitionBoss
        || this.loading()
        || !challenge
        || !this.isLegacyChallenge(challenge)
        || outcome === 'in-progress'
        || this.challengeSubmitted()
      ) {
        return;
      }

      queueMicrotask(() => {
        if (this.selectedMode() === 'competition-boss' && !this.challengeSubmitted()) {
          this.submitChallenge();
        }
      });
    });
  }

  ngOnInit(): void {
    this.refreshAdaptiveDifficulty();
    this.loadChallenge();
  }

  /** Map super-syllabus game modes to a backend-compatible mode for the API call */
  private toApiMode(mode: SuperGameMode): GameMode {
    const mapping: Record<SuperGameMode, GameMode> = {
      'abacus-flash': 'abacus-flash',
      'falling-numbers': 'falling-numbers',
      'boss-battle': 'boss-battle',
      'ai-puzzle': 'ai-puzzle',
      'fluency': 'ai-puzzle',
      'reasoning-puzzle': 'ai-puzzle',
      map: 'map',
      'competition-boss': 'competition-boss',
    };
    return mapping[mode] ?? 'ai-puzzle';
  }

  isLegacyChallenge(challenge: GameChallenge): challenge is LegacyChallenge {
    return !this.isMapChallenge(challenge);
  }

  isMapChallenge(challenge: GameChallenge): challenge is MapChallenge {
    return 'answerType' in challenge && 'correctAnswers' in challenge;
  }

  legacyChallenge(): LegacyChallenge | null {
    const challenge = this.challenge();
    if (!challenge || !this.isLegacyChallenge(challenge)) {
      return null;
    }
    return challenge;
  }

  hasAnswerOptions(challenge: GameChallenge | null): challenge is LegacyChallenge & {
    answer: ChallengeOption;
    options: ChallengeOption[];
  } {
    if (!challenge || !this.isLegacyChallenge(challenge)) {
      return false;
    }
    return (
      'answer' in challenge &&
      challenge.answer !== undefined &&
      'options' in challenge &&
      Array.isArray(challenge.options) &&
      challenge.options.length > 0
    );
  }

  isMapActive(): boolean {
    const challenge = this.challenge();
    return this.selectedMode() === 'map' && !!challenge && this.isMapChallenge(challenge);
  }

  isAiPuzzleSelectedMode(): boolean {
    return this.selectedMode() === 'ai-puzzle';
  }

  isReasoningPuzzleSelectedMode(): boolean {
    return this.selectedMode() === 'reasoning-puzzle';
  }

  shouldShowGenericNextChallenge(): boolean {
    const mode = this.selectedMode();
    return (
      mode !== 'abacus-flash'
      && !this.isAiPuzzleSelectedMode()
      && !this.isReasoningPuzzleSelectedMode()
      && mode !== 'fluency'
      && mode !== 'competition-boss'
    );
  }

  getMapChallenge(): MapChallenge | null {
    const challenge = this.challenge();
    if (!challenge || !this.isMapChallenge(challenge)) {
      return null;
    }
    return challenge;
  }

  mapSteps(): MapStep[] {
    const challenge = this.getMapChallenge();
    if (!challenge) return [];
    if (challenge.steps.length > 0) return challenge.steps;
    return [
      {
        prompt: challenge.prompt,
        options: challenge.options,
        answerType: challenge.answerType,
        correctAnswers: challenge.correctAnswers,
      },
    ];
  }

  currentMapStep(): MapStep | null {
    const steps = this.mapSteps();
    if (steps.length === 0) return null;
    return steps[this.currentStepIndex()] ?? null;
  }

  totalMapSteps(): number {
    return this.mapSteps().length;
  }

  mapStepStateClass(): string {
    return this.stepDirection() === 'left' ? 'animate-slide-left' : 'animate-slide-right';
  }

  mapGradeLabel(): string {
    const grade = this.getMapChallenge()?.gradeLevel;
    return grade ? `Grade ${grade}` : 'Grade 1-3';
  }

  mapDomainBadge(): string {
    const challenge = this.getMapChallenge();
    if (!challenge) return '📘 MAP Domain';
    return `${this.domainIcon(challenge.domain)} ${challenge.domain}`;
  }

  domainIcon(domain: string): string {
    const key = domain.toLowerCase();
    if (key.includes('data') || key.includes('graph')) return '📊';
    if (key.includes('operation') || key.includes('algebra')) return '➗';
    if (key.includes('geometry') || key.includes('shape')) return '📐';
    if (key.includes('number')) return '🔢';
    return '📘';
  }

  mapDifficultyLabel(): string {
    const difficulty = this.getMapChallenge()?.difficulty ?? 0;
    if (difficulty < MAP_DIFFICULTY_READY_THRESHOLD) return 'MAP Level: Developing';
    if (difficulty < MAP_DIFFICULTY_ADVANCED_THRESHOLD) return 'MAP Level: Ready';
    return 'MAP Level: Advanced';
  }

  isMapStepFinal(): boolean {
    return this.currentStepIndex() >= this.totalMapSteps() - 1;
  }

  mapAnswerType(step?: MapStep | null): MapAnswerType {
    const current = step ?? this.currentMapStep();
    const challenge = this.getMapChallenge();
    return current?.answerType ?? challenge?.answerType ?? 'single';
  }

  mapOptionsForStep(step?: MapStep | null): ChallengeOption[] {
    const current = step ?? this.currentMapStep();
    const challenge = this.getMapChallenge();
    return current?.options?.length ? current.options : challenge?.options ?? [];
  }

  mapSelectionForStep(index: number): ChallengeOption[] {
    return this.mapState()?.selectionsByStep[index] ?? [];
  }

  mapTextAnswerForStep(index: number): string {
    return this.mapState()?.textAnswersByStep[index] ?? '';
  }

  isMapStepAnswered(index = this.currentStepIndex()): boolean {
    const step = this.mapSteps()[index];
    if (!step) return false;
    const options = this.mapOptionsForStep(step);
    if (options.length > 0) {
      return this.mapSelectionForStep(index).length > 0;
    }
    return this.mapTextAnswerForStep(index).trim().length > 0;
  }

  updateMapTextAnswer(value: string): void {
    const stepIndex = this.currentStepIndex();
    this.mapState.update((state) =>
      state
        ? {
          ...state,
          textAnswersByStep: { ...state.textAnswersByStep, [stepIndex]: value },
        }
        : state,
    );
    this.persistMapState();
    if (value.trim().length > 0) {
      this.queueAutoAdvance();
    }
  }

  toggleMapOption(option: ChallengeOption): void {
    if (this.challengeSubmitted()) return;
    const stepIndex = this.currentStepIndex();
    const answerType = this.mapAnswerType();
    const current = this.mapSelectionForStep(stepIndex);
    let next: ChallengeOption[];
    if (answerType === 'multi') {
      next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    } else {
      next = [option];
      this.selectedAnswer.set(option);
    }
    this.mapState.update((state) =>
      state
        ? {
          ...state,
          selectionsByStep: { ...state.selectionsByStep, [stepIndex]: next },
        }
        : state,
    );
    this.persistMapState();
    this.selectedAnswers.set(next);
    if (answerType === 'single') {
      this.queueAutoAdvance();
    }
  }

  nextMapStep(): void {
    this.clearMapAutoAdvanceTimeout();
    if (!this.isMapStepAnswered()) return;
    if (this.isMapStepFinal()) {
      this.submitChallenge();
      return;
    }
    if (!this.applyMapProgressForCurrentStep()) {
      return;
    }
    const nextIndex = Math.min(this.currentStepIndex() + 1, this.totalMapSteps() - 1);
    this.selectMapNode(nextIndex);
    this.persistMapState();
  }

  previousMapStep(): void {
    this.clearMapAutoAdvanceTimeout();
    const previousIndex = Math.max(this.currentStepIndex() - 1, 0);
    this.selectMapNode(previousIndex);
    this.persistMapState();
  }

  private queueAutoAdvance(): void {
    this.clearMapAutoAdvanceTimeout();
    const timeoutId = setTimeout(() => {
      if (this.mapAutoAdvanceTimeoutId !== timeoutId) {
        return;
      }
      if (!this.challengeSubmitted() && this.isMapStepAnswered(this.currentStepIndex())) {
        this.nextMapStep();
      }
      this.mapAutoAdvanceTimeoutId = null;
    }, MAP_AUTO_ADVANCE_DELAY_MS);
    this.mapAutoAdvanceTimeoutId = timeoutId;
  }

  private clearMapAutoAdvanceTimeout(): void {
    if (this.mapAutoAdvanceTimeoutId !== null) {
      clearTimeout(this.mapAutoAdvanceTimeoutId);
      this.mapAutoAdvanceTimeoutId = null;
    }
  }

  mapIsOptionSelected(option: ChallengeOption, index = this.currentStepIndex()): boolean {
    return this.mapSelectionForStep(index).includes(option);
  }

  mapCorrectAnswers(): ChallengeOption[] {
    const step = this.currentMapStep();
    const challenge = this.getMapChallenge();
    return step?.correctAnswers?.length ? step.correctAnswers : challenge?.correctAnswers ?? [];
  }

  mapFeedbackClass(option: ChallengeOption): string {
    if (!this.challengeSubmitted()) return '';
    const selected = this.mapSelectionForStep(this.currentStepIndex());
    const correctAnswers = this.mapCorrectAnswers();
    const isSelected = selected.includes(option);
    const isCorrect = correctAnswers.includes(option);
    if (isSelected && isCorrect) {
      return 'animate-pulse-strong border-emerald-500 bg-emerald-100';
    }
    if (isSelected && !isCorrect) {
      return 'animate-shake border-rose-400 bg-rose-100';
    }
    if (!isSelected && isCorrect) {
      return 'border-emerald-300 bg-emerald-50';
    }
    return '';
  }

  mapOptionAriaLabel(option: ChallengeOption): string {
    const selectionType = this.mapAnswerType() === 'multi' ? 'multi-select' : 'single-select';
    const selectionState = this.mapIsOptionSelected(option) ? 'selected' : 'not selected';
    const stepNumber = this.currentStepIndex() + 1;
    return `Step ${stepNumber}, ${selectionType} option ${option}, ${selectionState}`;
  }

  mapNodes() {
    return this.mapState()?.nodes ?? [];
  }

  mapRegions() {
    return this.mapState()?.regions ?? [];
  }

  mapProgressPercent(): number {
    return this.mapState()?.progressPercent ?? 0;
  }

  mapScore(): number {
    return this.mapState()?.score ?? 0;
  }

  mapPenaltyTotal(): number {
    return this.mapState()?.penalties ?? 0;
  }

  mapOutcomeLabel(): string {
    const outcome = this.mapState()?.outcome ?? 'in_progress';
    if (outcome === 'success') return 'Success';
    if (outcome === 'partial') return 'Partial Progress';
    if (outcome === 'fail') return 'Failed';
    return 'In Progress';
  }

  mapNodeClass(stepIndex: number): string {
    const node = this.mapNodes().find((candidate) => candidate.stepIndex === stepIndex);
    if (!node) return 'border-gray-200 bg-gray-50';
    if (node.completed) return 'border-emerald-300 bg-emerald-50';
    if (!node.unlocked) return 'border-gray-200 bg-gray-100 opacity-60';
    if (node.cooldownUntilMs > 0) return 'border-amber-300 bg-amber-50';
    return 'border-violet-300 bg-violet-50';
  }

  selectMapNode(stepIndex: number): void {
    const state = this.mapState();
    if (!state) {
      this.mapLastValidationError.set('MAP state unavailable.');
      return;
    }
    const validation = validateMapMove(state, stepIndex, Date.now());
    if (!validation.valid) {
      this.mapLastValidationError.set(validation.reason ?? 'Illegal move.');
      return;
    }
    this.mapLastValidationError.set('');
    this.stepDirection.set(stepIndex >= this.currentStepIndex() ? 'left' : 'right');
    this.currentStepIndex.set(stepIndex);
    this.mapState.update((current) =>
      current
        ? {
          ...current,
          currentStepIndex: stepIndex,
          currentNodeId: `node-${stepIndex}`,
        }
        : current,
    );
  }

  mapPartialCreditPercent(): number {
    return Math.round(this.mapPartialCredit() * 100);
  }

  private applyMapProgressForCurrentStep(): boolean {
    const challenge = this.getMapChallenge();
    const state = this.mapState();
    if (!challenge || !state) {
      this.mapLastValidationError.set('MAP state unavailable.');
      return false;
    }
    if (!this.isMapStepAnswered()) {
      const message = 'Answer required before submitting this step.';
      this.mapLastValidationError.set(message);
      this.mapEvents.update((events) => [...events, { type: 'map:invalid-move', message }]);
      return false;
    }

    const result = applyMapStepSubmission(challenge, state, this.currentStepIndex(), Date.now());
    this.mapEvents.set(result.events);
    this.mapState.set(result.state);
    this.mapAudioCue.set(
      result.events.find((event) => event.type === 'audio:play')?.message ?? '',
    );
    this.mapFxCue.set(
      result.events.find((event) => event.type === 'fx:trigger')?.message ?? '',
    );
    this.mapLastValidationError.set(
      result.valid ? '' : result.events.find((event) => event.type === 'map:invalid-move')?.message ?? 'Invalid move.',
    );
    this.mapPartialCredit.set(result.evaluation?.credit ?? 0);
    this.persistMapState();
    return result.valid;
  }

  private evaluateMapChallenge(): boolean {
    const wasApplied = this.applyMapProgressForCurrentStep();
    if (!wasApplied) {
      this.mapPartialCredit.set(0);
      return false;
    }
    return this.mapPartialCredit() >= 1;
  }

  mapShowGraph(): boolean {
    return !!this.getMapChallenge()?.graphPayload;
  }

  mapShowTable(): boolean {
    return !!this.getMapChallenge()?.tablePayload;
  }

  private mapStorageKey(challenge: MapChallenge): string {
    return `${MAP_CHALLENGE_STORAGE_KEY_PREFIX}:${this.studentId()}:${challenge.challengeId}`;
  }

  private persistMapState(): void {
    const challenge = this.getMapChallenge();
    const state = this.mapState();
    if (!challenge || !state) {
      return;
    }
    localStorage.setItem(this.mapStorageKey(challenge), serializeMapChallengeState(state));
    this.mapEvents.update((events) => [
      ...events,
      { type: 'map:state-saved', message: 'MAP challenge state saved.' },
    ]);
  }

  private restoreMapState(challenge: MapChallenge): MapChallengeState {
    const key = this.mapStorageKey(challenge);
    const serialized = localStorage.getItem(key);
    if (!serialized) {
      return createInitialMapChallengeState(challenge);
    }
    const restored = deserializeMapChallengeState(serialized, challenge.challengeId);
    if (!restored) {
      return createInitialMapChallengeState(challenge);
    }
    this.mapEvents.update((events) => [
      ...events,
      { type: 'map:state-loaded', message: 'MAP challenge state restored.' },
    ]);
    return restored;
  }

  private initializeMapState(challenge: MapChallenge): void {
    // restoreMapState always returns a valid state (restored snapshot or fresh initial state).
    const restored = this.restoreMapState(challenge);
    this.mapState.set(restored);
    this.currentStepIndex.set(restored.currentStepIndex);
    this.mapPartialCredit.set(restored.lastStepCredit);
    this.mapLastValidationError.set('');
  }

  getModeSpecificPrompt(challenge: LegacyChallenge): string {
    const basePrompt =
      'prompt' in challenge && typeof challenge.prompt === 'string' ? challenge.prompt.trim() : '';
    if (this.selectedMode() !== 'falling-numbers') {
      return basePrompt && basePrompt.length > 0 ? basePrompt : this.t.translate('game.loadingAdaptive');
    }
    const payload = challenge.gamePayload as
      | { prompt?: unknown; target?: unknown; title?: unknown }
      | undefined;
    const payloadPrompt = payload?.prompt;
    if (typeof payloadPrompt === 'string' && payloadPrompt.trim().length > 0) {
      return payloadPrompt;
    }
    const payloadTitle = payload?.title;
    if (typeof payloadTitle === 'string' && payloadTitle.trim().length > 0) {
      return payloadTitle;
    }
    const target = payload?.target;
    if (typeof target === 'number') {
      return this.t.translate('game.fallingPromptTarget', { target });
    }
    if (basePrompt && basePrompt.length > 0) {
      return basePrompt;
    }
    return this.t.translate('game.fallingPromptDefault');
  }


  private stopModeEngines(): void {
    this.fallingEngine.stop();
    this.bossBattleEngine.stop();
    this.competitionBossEngine.stop();
    this.aiPuzzleEngine.stop();
    this.fluencyEngine.stop();
    this.reasoningPuzzleEngine.stop();
  }

  private getFallingPayload(challenge: LegacyChallenge): FallingEnginePayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;

    const targetRaw = raw['target'];
    const fallbackTarget =
      this.hasAnswerOptions(challenge) && typeof challenge.answer === 'number' ? challenge.answer : 10;
    const target = typeof targetRaw === 'number' && Number.isFinite(targetRaw) ? Math.round(targetRaw) : fallbackTarget;

    const streamRaw = raw['stream'];
    const stream = Array.isArray(streamRaw)
      ? streamRaw.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    const powerUpsRaw = raw['powerUps'];
    const powerUps = Array.isArray(powerUpsRaw)
      ? powerUpsRaw.filter(
          (value): value is FallingPowerUpType => value === 'magnet' || value === 'slow-mo' || value === 'bomb',
        )
      : [];

    return {
      target,
      stream,
      combosEnabled: raw['combosEnabled'] !== false,
      powerUps,
      prompt: typeof raw['prompt'] === 'string' ? raw['prompt'] : undefined,
    };
  }

  private getBossBattlePayload(challenge: LegacyChallenge): BossBattlePayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    return {
      bossId: typeof raw['bossId'] === 'string' ? raw['bossId'] : 'boss-default',
      title: typeof raw['title'] === 'string' ? raw['title'] : 'The Math Overlord',
      maxHp: typeof raw['maxHp'] === 'number' && raw['maxHp'] > 0 ? Math.round(raw['maxHp']) : 100,
      difficulty: typeof raw['difficulty'] === 'number' ? Math.round(raw['difficulty']) : challenge.difficulty ?? 50,
      phaseCount: typeof raw['phaseCount'] === 'number' && raw['phaseCount'] >= 1 ? Math.round(raw['phaseCount']) : 3,
      specialAttackIntervalMs:
        typeof raw['specialAttackIntervalMs'] === 'number' && raw['specialAttackIntervalMs'] > 0
          ? raw['specialAttackIntervalMs']
          : 8000,
    };
  }

  private getCompetitionBossPayload(challenge: LegacyChallenge): CompetitionBossPayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    return {
      bossId: typeof raw['bossId'] === 'string' ? raw['bossId'] : 'competition-boss-default',
      title: typeof raw['title'] === 'string' ? raw['title'] : 'Tournament Tyrant',
      maxHp: typeof raw['maxHp'] === 'number' && raw['maxHp'] > 0 ? Math.round(raw['maxHp']) : 140,
      difficulty:
        typeof raw['difficulty'] === 'number' && Number.isFinite(raw['difficulty'])
          ? Math.round(raw['difficulty'])
          : challenge.difficulty ?? 60,
      phaseCount: typeof raw['phaseCount'] === 'number' && raw['phaseCount'] >= 1 ? Math.round(raw['phaseCount']) : 3,
      specialAttackIntervalMs:
        typeof raw['specialAttackIntervalMs'] === 'number' && raw['specialAttackIntervalMs'] > 0
          ? raw['specialAttackIntervalMs']
          : 7000,
      competitorDps:
        typeof raw['competitorDps'] === 'number' && Number.isFinite(raw['competitorDps'])
          ? raw['competitorDps']
          : 12,
    };
  }

  private getAiPuzzlePayload(challenge: LegacyChallenge): AiPuzzlePayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    const challengeAnswer = 'answer' in challenge ? challenge.answer : '';
    const challengePrompt = 'prompt' in challenge ? challenge.prompt : '';
    const challengeOptions = 'options' in challenge ? challenge.options : [];

    const optionsRaw = Array.isArray(raw['options']) ? raw['options'] : challengeOptions;
    const options = optionsRaw
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    const promptRaw = typeof raw['prompt'] === 'string' ? raw['prompt'] : challengePrompt;
    const answerRaw =
      typeof raw['answer'] === 'string' || typeof raw['answer'] === 'number'
        ? raw['answer']
        : challengeAnswer;

    return {
      puzzleId: typeof raw['puzzleId'] === 'string' ? raw['puzzleId'] : challenge.challengeId,
      prompt: String(promptRaw ?? '').trim(),
      options,
      answer: String(answerRaw ?? '').trim(),
      difficulty:
        typeof raw['difficulty'] === 'number' && Number.isFinite(raw['difficulty'])
          ? Math.round(raw['difficulty'])
          : challenge.difficulty,
    };
  }

  private getFluencyPayload(challenge: LegacyChallenge): FluencyPayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    const timeLimitSeconds =
      typeof raw['timeLimitSeconds'] === 'number' && raw['timeLimitSeconds'] > 0
        ? raw['timeLimitSeconds']
        : challenge.timeLimitSeconds > 0
          ? challenge.timeLimitSeconds
          : 60;
    const difficulty =
      typeof raw['difficulty'] === 'number' && Number.isFinite(raw['difficulty'])
        ? Math.round(raw['difficulty'])
        : challenge.difficulty;
    const operationsRaw = raw['operations'];
    const operations = Array.isArray(operationsRaw)
      ? (operationsRaw.filter(
          (op): op is FluencyOperation =>
            op === 'addition' || op === 'subtraction' || op === 'multiplication' || op === 'division',
        ) as FluencyOperation[])
      : undefined;
    return { timeLimitSeconds, difficulty, operations };
  }

  private getReasoningPuzzlePayload(challenge: LegacyChallenge): ReasoningPuzzlePayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    const challengeAnswer = 'answer' in challenge ? challenge.answer : '';
    const challengePrompt = 'prompt' in challenge ? challenge.prompt : '';
    const challengeOptions = 'options' in challenge ? challenge.options : [];

    const optionsRaw = Array.isArray(raw['options']) ? raw['options'] : challengeOptions;
    const options = optionsRaw
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    const promptRaw = typeof raw['prompt'] === 'string' ? raw['prompt'] : challengePrompt;
    const answerRaw =
      typeof raw['answer'] === 'string' || typeof raw['answer'] === 'number'
        ? raw['answer']
        : challengeAnswer;

    return {
      puzzleId: typeof raw['puzzleId'] === 'string' ? raw['puzzleId'] : challenge.challengeId,
      prompt: String(promptRaw ?? '').trim(),
      options,
      answer: String(answerRaw ?? '').trim(),
      difficulty:
        typeof raw['difficulty'] === 'number' && Number.isFinite(raw['difficulty'])
          ? Math.round(raw['difficulty'])
          : challenge.difficulty,
    };
  }

  /** Extract the typed abacus-flash payload from a challenge's gamePayload. */
  private getFlashPayload(challenge: LegacyChallenge): AbacusFlashPayload {
    const raw = (challenge.gamePayload ?? {}) as Record<string, unknown>;
    const sequenceSource = raw['flashSequence'];
    const flashSequence = Array.isArray(sequenceSource)
      ? sequenceSource
          .map((value) => (typeof value === 'number' ? value : Number(value)))
          .filter((value) => Number.isFinite(value))
      : [];
    const speedSource = raw['speedMs'];
    const speedMs =
      typeof speedSource === 'number' && speedSource > 0
        ? speedSource
        : typeof speedSource === 'string' && Number(speedSource) > 0
          ? Number(speedSource)
        : DEFAULT_FLASH_SPEED_MS;
    return { flashSequence, speedMs };
  }

  /**
   * Animate through flashSequence, then reveal the question.
   * Clears any in-progress sequence before starting a new one.
   */
  startFlashSequence(): void {
    const challenge = this.legacyChallenge();
    if (!challenge) return;

    // Reset state
    if (this.flashTimeoutId !== null) {
      clearTimeout(this.flashTimeoutId);
      this.flashTimeoutId = null;
    }

    const token = ++this.flashSequenceToken;
    const { flashSequence, speedMs } = this.getFlashPayload(challenge);

    this.flashSequence.set(flashSequence);
    this.flashCurrentIndex.set(0);
    this.currentFlashNumber.set(null);
    this.showQuestion.set(false);
    this.isFlashing.set(true);

    if (flashSequence.length === 0) {
      this.isFlashing.set(false);
      this.showQuestion.set(true);
      return;
    }

    const runFlash = (index: number) => {
      if (token !== this.flashSequenceToken) return;

      // 🔥 CRITICAL FIX — update index so Angular re-renders
      this.flashCurrentIndex.set(index);

      // 🔥 CRITICAL FIX — set number AFTER updating index
      this.currentFlashNumber.set(flashSequence[index]);

      if (index < flashSequence.length - 1) {
        this.flashTimeoutId = setTimeout(() => runFlash(index + 1), speedMs);
      } else {
        this.flashTimeoutId = setTimeout(() => {
          this.currentFlashNumber.set(null);
          this.isFlashing.set(false);
          this.showQuestion.set(true);
        }, speedMs);
      }
    };

    runFlash(0);
  }

  setAbacusAnswer(rawValue: any): void {
    // Convert everything to string safely
    const str = String(rawValue ?? '').trim();

    if (str.length === 0) {
      this.selectedAnswer.set(null);
      return;
    }

    const numericValue = Number(str);
    this.selectedAnswer.set(Number.isFinite(numericValue) ? numericValue : null);
  }


  protected getAbacusExpectedAnswer(): number {
    return this.flashSequence().reduce((total, value) => total + value, 0);
  }

  loadChallenge(): void {
    // Reset all mode state
    this.stopModeEngines();
    this.loading.set(true);
    this.errorMessage.set('');
    this.challengeSubmitted.set(false);
    this.selectedAnswer.set(null);
    this.selectedAnswers.set([]);
    this.currentStepIndex.set(0);
    this.stepDirection.set('left');
    this.mapHintsOpen.set(false);
    this.mapState.set(null);
    this.mapEvents.set([]);
    this.mapAudioCue.set('');
    this.mapFxCue.set('');
    this.mapLastValidationError.set('');
    this.mapPartialCredit.set(0);

    // Reset Abacus Flash state
    this.currentFlashNumber.set(null);
    this.flashSequence.set([]);
    this.flashCurrentIndex.set(0);
    this.flashState.set(GAME_STATE.START);
    this.showQuestion.set(false);
    this.isFlashing.set(false);

    if (this.flashTimeoutId !== null) {
      clearTimeout(this.flashTimeoutId);
      this.flashTimeoutId = null;
    }

    this.flashSequenceToken++;
    this.clearMapAutoAdvanceTimeout();

    const apiMode = this.toApiMode(this.selectedMode());
    this.activeChallengeApiMode = apiMode;

    // ───────────────────────────────────────────────
    // ABACUS FLASH MODE
    // ───────────────────────────────────────────────
    if (apiMode === 'abacus-flash') {
      this.gameService
        .getAbacusFlashChallenge({
          studentId: this.studentId(),
          difficulty: this.adaptiveDifficulty() ?? undefined,
          streak: this.streakTotal(),
        })
        .subscribe({
          next: (challenge) => {
            this.challenge.set(challenge);
            this.completedQuests.set(
              this.isLegacyChallenge(challenge) ? challenge.dailyQuest.progress : 0,
            );
            this.loading.set(false);
            this.startFlashSequence();
          },
          error: () => {
            this.errorMessage.set('Unable to load game challenge.');
            this.loading.set(false);
          },
        });

      return;
    }

    // ───────────────────────────────────────────────
    // ALL OTHER MODES (INCLUDING FALLING NUMBERS)
    // ───────────────────────────────────────────────
    this.gameService
      .getChallenge({
        studentId: this.studentId(),
        mode: apiMode,
        difficulty: this.adaptiveDifficulty() ?? undefined,
        streak: this.streakTotal(),
        completedDailyQuestCount: this.completedQuests(),
      })
      .subscribe({
        next: (challenge) => {
          this.challenge.set(challenge);
          if (this.isMapChallenge(challenge) && this.selectedMode() === 'map') {
            this.initializeMapState(challenge);
          }
          this.completedQuests.set(
            this.isLegacyChallenge(challenge) ? challenge.dailyQuest.progress : 0,
          );

          // ⭐ FALLING NUMBERS — START ENGINE HERE ONLY
          if (this.selectedMode() === 'falling-numbers'
            && this.isLegacyChallenge(challenge)) {
            const payload = this.getFallingPayload(challenge);

            this.fallingEngine.configure({
              target: payload.target,
              stream: payload.stream,
              combosEnabled: payload.combosEnabled,
              powerUps: payload.powerUps,
              difficulty: challenge.difficulty,
            });

            this.fallingEngine.start();
          } else {
            this.fallingEngine.stop();
          }

          // ⭐ BOSS BATTLE — START ENGINE HERE ONLY
          const isBossBattle = this.selectedMode() === 'boss-battle';
          if (isBossBattle && this.isLegacyChallenge(challenge)) {
            const bbPayload = this.getBossBattlePayload(challenge);
            this.bossBattleEngine.configure(bbPayload);
            this.bossBattleEngine.start();
          } else {
            this.bossBattleEngine.stop();
          }

          const isCompetitionBoss = this.selectedMode() === 'competition-boss';
          if (isCompetitionBoss && this.isLegacyChallenge(challenge)) {
            const competitionBossPayload = this.getCompetitionBossPayload(challenge);
            this.competitionBossEngine.configure(competitionBossPayload);
            this.competitionBossEngine.start();
          } else {
            this.competitionBossEngine.stop();
          }

          const isAiPuzzle = this.isAiPuzzleSelectedMode();
          if (isAiPuzzle && this.isLegacyChallenge(challenge)) {
            const puzzlePayload = this.getAiPuzzlePayload(challenge);
            this.aiPuzzleEngine.configure(puzzlePayload);
            this.aiPuzzleEngine.start();
          } else {
            this.aiPuzzleEngine.stop();
          }

          if (this.isReasoningPuzzleSelectedMode() && this.isLegacyChallenge(challenge)) {
            const reasoningPayload = this.getReasoningPuzzlePayload(challenge);
            this.reasoningPuzzleEngine.configure(reasoningPayload);
            this.reasoningPuzzleEngine.start();
          } else {
            this.reasoningPuzzleEngine.stop();
          }

          // ⭐ FLUENCY — START ENGINE HERE ONLY
          if (this.selectedMode() === 'fluency' && this.isLegacyChallenge(challenge)) {
            const fluencyPayload = this.getFluencyPayload(challenge);
            this.fluencyEngine.configure({
              difficulty: fluencyPayload.difficulty,
              timeLimitSeconds: fluencyPayload.timeLimitSeconds,
              operations: fluencyPayload.operations,
            });
            this.fluencyEngine.start();
          } else {
            this.fluencyEngine.stop();
          }

          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Unable to load game challenge.');
          this.loading.set(false);
        },
      });
  }




  submitChallenge(): void {
    const challenge = this.challenge();
    if (!challenge || this.challengeSubmitted()) {
      return;
    }

    const isMapChallenge = this.isMapChallenge(challenge) && this.selectedMode() === 'map';
    const isAbacusFlash = this.activeChallengeApiMode === 'abacus-flash';
    const isAiPuzzle = this.activeChallengeApiMode === 'ai-puzzle';
    const isReasoningPuzzle = this.selectedMode() === 'reasoning-puzzle';
    const isCompetitionBoss = this.selectedMode() === 'competition-boss';
    const hasAnswerOptions = this.hasAnswerOptions(challenge);
    const selected = this.selectedAnswer();
    if (isAbacusFlash && typeof selected !== 'number') {
      return;
    }
    if (!isCompetitionBoss && !isMapChallenge && hasAnswerOptions && selected === null) {
      return;
    }

    this.challengeSubmitted.set(true);
    let correct = false;
    if (isMapChallenge) {
      correct = this.evaluateMapChallenge();
      if (this.mapLastValidationError().length > 0) {
        this.challengeSubmitted.set(false);
        return;
      }
    } else if (isCompetitionBoss) {
      correct = this.competitionBossEngine.isPlayerVictory();
    } else if (isReasoningPuzzle) {
      correct = this.reasoningPuzzleEngine.isCorrect() === true;
    } else if (isAiPuzzle) {
      correct = this.aiPuzzleEngine.isCorrect() === true;
    } else if (hasAnswerOptions) {
      correct = selected === challenge.answer;
    } else if (isAbacusFlash) {
      correct = selected === this.getAbacusExpectedAnswer();
    }

    if (correct) {
      const totalXp = challenge.rewards.xp + challenge.rewards.streakBonus;
      this.localXp.update((xp) => xp + totalXp);
      this.localStreak.update((streak) => streak + 1);
      if (challenge.rewards.badge) {
        this.unlockedBadges.update((badges) => [...new Set([...badges, challenge.rewards.badge!])]);
      }
      // Award super-mode badge on correct answer
      const superInfo = this.superModeInfo();
      if (superInfo) {
        this.unlockedBadges.update((badges) => [...new Set([...badges, superInfo.badge])]);
      }
      if (this.completedQuests() < DAILY_QUEST_TARGET) {
        this.completedQuests.update((count) => Math.min(DAILY_QUEST_TARGET, count + 1));
      }
    }

    if (isAbacusFlash) {
      const accuracy = correct ? 100 : 0;
      this.gameService
        .submitAbacusFlash({
          studentId: this.studentId(),
          mode: 'abacus-flash',
          score: accuracy,
          accuracy,
          streak: this.streakTotal(),
        })
        .subscribe({
          next: (result) => {
            this.adaptiveDifficulty.set(result.newDifficulty);
            this.localStreak.set(result.newStreak);
            // Update quest progress if server reports more completions
            const questProgress = result.dailyQuestProgress;
            if (typeof questProgress === 'number' && questProgress > this.completedQuests()) {
              this.completedQuests.set(questProgress);
            }
            // Auto-advance to next challenge after a short pause
            setTimeout(() => this.loadChallenge(), 1500);
          },
          error: () => {
            // Non-blocking: still auto-advance after delay
            setTimeout(() => this.loadChallenge(), 1500);
          },
        });
    } else {
      const mapScore = this.mapScore();
      const mapAccuracy = this.mapProgressPercent();
      const competitionBossScore = correct ? 100 : 0;
      const submittedScore = isMapChallenge ? Math.max(0, mapScore) : isCompetitionBoss ? competitionBossScore : 100;
      const submittedAccuracy = isMapChallenge ? mapAccuracy : isCompetitionBoss ? competitionBossScore : 100;
      this.gameService
        .submitChallenge({
          studentId: this.studentId(),
          mode: this.activeChallengeApiMode,
          score: submittedScore,
          accuracy: submittedAccuracy,
          streak: this.streakTotal(),
        })
        .subscribe({
          next: () => {
            // state already updated optimistically in UI
          },
          error: () => {
            // non-blocking
          },
        });
    }
  }

  refreshAdaptiveDifficulty(): void {
    this.studentIntelligenceService.getStudentProfile(this.studentId()).subscribe({
      next: (profile) => {
        const adaptiveDifficulty = Math.round(
          (profile.masteryLevels.addition +
            profile.masteryLevels.subtraction +
            profile.masteryLevels.multiplication +
            profile.masteryLevels.division) /
            4,
        );
        this.adaptiveDifficulty.set(adaptiveDifficulty);
      },
      error: () => {
        this.adaptiveDifficulty.set(null);
      },
    });
  }

  onAiPuzzleSubmit(answer: string): void {
    this.selectedAnswer.set(answer);
    const wasEvaluated = this.aiPuzzleEngine.submitAnswer(answer);
    if (!wasEvaluated) {
      return;
    }
    this.submitChallenge();
  }

  onReasoningPuzzleSubmit(answer: string): void {
    const wasEvaluated = this.reasoningPuzzleEngine.submitAnswer(answer);
    if (!wasEvaluated || !this.reasoningPuzzleEngine.isCompleted()) {
      return;
    }
    this.selectedAnswer.set(answer);
    this.submitChallenge();
  }

  isAbacusFlashActive(): boolean {
    return this.activeChallengeApiMode === 'abacus-flash';
  }

  ngOnDestroy(): void {
    this.stopModeEngines();
    if (this.flashTimeoutId !== null) {
      clearTimeout(this.flashTimeoutId);
      this.flashTimeoutId = null;
    }
    this.flashSequenceToken++;
    this.clearMapAutoAdvanceTimeout();
  }
}
