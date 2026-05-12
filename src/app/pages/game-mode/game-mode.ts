import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type ChallengeOption,
  GameService,
  type AbacusFlashPayload,
  type GameChallenge,
  type MapAnswerType,
  type MapChallenge,
  type MapStep,
} from '../../services/game.service';
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

const DAILY_QUEST_TARGET = 3;
/** Fallback speed (ms per number) used when the payload omits speedMs. */
const DEFAULT_FLASH_SPEED_MS = 600;
const GAME_STATE = {
  START: 'START',
  NEXT: 'NEXT',
  ROUND: 'ROUND',
} as const;
type AbacusGameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];

export type SuperGameMode = GameMode | 'fluency-speed' | 'reasoning-puzzle' | 'competition-boss';

@Component({
  selector: 'app-game-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapGraphComponent, MapTableComponent, LanguageToggleComponent, TranslatePipe],
  templateUrl: './game-mode.html',
  styleUrl: './game-mode.css',
})
export class GameModeComponent implements OnDestroy {
  readonly t = inject(TranslationService);
  readonly GAME_STATE = GAME_STATE;
  studentId = signal(DEFAULT_STUDENT_ID);
  challenge = signal<GameChallenge | MapChallenge | null>(null);
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
  mapStepAnswers = signal<Record<number, ChallengeOption[]>>({});
  mapStepTextAnswers = signal<Record<number, string>>({});
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
  private flashIntervalId: ReturnType<typeof setInterval> | null = null;
  private mapAutoAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private flashStartTime: number | null = null;

  gameModeOptions: Array<{ value: SuperGameMode; label: string; description: string; icon: string }> = [
    { value: 'abacus-flash', label: 'Abacus Flash', description: 'Flash-card speed drills with adaptive pacing.', icon: '🔢' },
    { value: 'falling-numbers', label: 'Falling Numbers', description: 'Catch target sums, build combos, use power-ups.', icon: '🎮' },
    { value: 'boss-battle', label: 'Boss Battle', description: 'Timed HP-bar battle with special attacks.', icon: '⚔️' },
    { value: 'ai-puzzle', label: 'AI Puzzle', description: 'Logic, pattern and geometry puzzles.', icon: '🤖' },
    { value: 'fluency-speed', label: 'Fluency Speed', description: 'Race the clock on arithmetic fluency drills.', icon: '⚡' },
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
    if (!challenge || !this.isLegacyChallenge(challenge) || this.selectedAnswer() === null) {
      return null;
    }
    return this.selectedAnswer() === challenge.answer;
  });

  isSuperMode = computed(() => {
    const mode = this.selectedMode();
    return ['fluency-speed', 'reasoning-puzzle', 'map', 'competition-boss'].includes(mode);
  });

  superModeInfo = computed(() => {
    const mode = this.selectedMode();
    const info: Record<string, { badge: string; tip: string }> = {
      'fluency-speed': { badge: '⚡ Fluency Champion', tip: 'Answer as fast as possible! Speed builds automaticity.' },
      'reasoning-puzzle': { badge: '🔍 Logic Master', tip: 'Take your time. Read carefully and think step by step.' },
      map: { badge: '📊 MAP Achiever', tip: 'These questions mirror real MAP test items. Pace yourself.' },
      'competition-boss': { badge: '🏆 Competition Pro', tip: 'Hard problems. Show all work mentally before answering.' },
    };
    return info[mode] ?? null;
  });

  constructor(
    private readonly gameService: GameService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
  ) {}

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
      'fluency-speed': 'abacus-flash',
      'reasoning-puzzle': 'ai-puzzle',
      map: 'map-challenge',
      'competition-boss': 'boss-battle',
    };
    return mapping[mode] ?? 'ai-puzzle';
  }

  isLegacyChallenge(challenge: GameChallenge | MapChallenge): challenge is GameChallenge {
    return 'dailyQuest' in challenge && 'bossBattle' in challenge && 'playerState' in challenge;
  }

  isMapChallenge(challenge: GameChallenge | MapChallenge): challenge is MapChallenge {
    return 'answerType' in challenge && 'correctAnswers' in challenge;
  }

  legacyChallenge(): GameChallenge | null {
    const challenge = this.challenge();
    if (!challenge || !this.isLegacyChallenge(challenge)) {
      return null;
    }
    return challenge;
  }

  hasAnswerOptions(challenge: GameChallenge | MapChallenge | null): challenge is GameChallenge & {
    answer: ChallengeOption;
    options: ChallengeOption[];
  } {
    if (!challenge || !this.isLegacyChallenge(challenge)) {
      return false;
    }
    return (
      challenge.answer !== undefined &&
      Array.isArray(challenge.options) &&
      challenge.options.length > 0
    );
  }

  isMapActive(): boolean {
    const challenge = this.challenge();
    return this.selectedMode() === 'map' && !!challenge && this.isMapChallenge(challenge);
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
    return this.mapStepAnswers()[index] ?? [];
  }

  mapTextAnswerForStep(index: number): string {
    return this.mapStepTextAnswers()[index] ?? '';
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
    this.mapStepTextAnswers.update((state) => ({ ...state, [stepIndex]: value }));
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
    this.mapStepAnswers.update((state) => ({ ...state, [stepIndex]: next }));
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
    this.stepDirection.set('left');
    this.currentStepIndex.update((index) => Math.min(index + 1, this.totalMapSteps() - 1));
  }

  previousMapStep(): void {
    this.clearMapAutoAdvanceTimeout();
    this.stepDirection.set('right');
    this.currentStepIndex.update((index) => Math.max(index - 1, 0));
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

  mapPartialCreditPercent(): number {
    return Math.round(this.mapPartialCredit() * 100);
  }

  private evaluateMapChallenge(): boolean {
    const correctAnswers = this.mapCorrectAnswers();
    if (correctAnswers.length === 0) {
      this.mapPartialCredit.set(0);
      return false;
    }
    const step = this.currentMapStep();
    const stepSelections = this.mapSelectionForStep(this.currentStepIndex());
    let selectedAnswers = stepSelections;
    if (selectedAnswers.length === 0 && this.selectedAnswers().length > 0) {
      selectedAnswers = this.selectedAnswers();
    }
    if (selectedAnswers.length === 0 && step && this.mapOptionsForStep(step).length === 0) {
      const textAnswer = this.mapTextAnswerForStep(this.currentStepIndex()).trim().toLowerCase();
      const matched = correctAnswers.some((answer) => String(answer).trim().toLowerCase() === textAnswer);
      this.mapPartialCredit.set(matched ? 1 : 0);
      return matched;
    }

    const selectedSet = new Set(selectedAnswers);
    const correctSet = new Set(correctAnswers);
    const matchedCount = [...selectedSet].filter((answer) => correctSet.has(answer)).length;
    const partialCredit = matchedCount / correctAnswers.length;
    this.mapPartialCredit.set(Math.max(0, Math.min(1, partialCredit)));
    const noExtras = [...selectedSet].every((answer) => correctSet.has(answer));
    const allCorrectSelected = matchedCount === correctSet.size;
    return allCorrectSelected && noExtras;
  }

  mapShowGraph(): boolean {
    return !!this.getMapChallenge()?.graphPayload;
  }

  mapShowTable(): boolean {
    return !!this.getMapChallenge()?.tablePayload;
  }

  getModeSpecificPrompt(challenge: GameChallenge): string {
    const basePrompt = challenge.prompt?.trim();
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

  /** Extract the typed abacus-flash payload from a challenge's gamePayload. */
  private getFlashPayload(challenge: GameChallenge): AbacusFlashPayload {
    const raw = challenge.gamePayload ?? {};
    const sequenceSource =
      raw['flashSequence'] ??
      raw['sequence'] ??
      raw['numbers'] ??
      raw['flashNumbers'];
    const flashSequence = Array.isArray(sequenceSource)
      ? sequenceSource
          .map((value) => (typeof value === 'number' ? value : Number(value)))
          .filter((value) => Number.isFinite(value))
      : [];
    const speedSource = raw['speedMs'] ?? raw['flashSpeedMs'] ?? raw['intervalMs'] ?? raw['speed'];
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
    if (!challenge) {
      return;
    }
    // Clear any existing sequence
    if (this.flashIntervalId !== null) {
      clearInterval(this.flashIntervalId);
      this.flashIntervalId = null;
    }

    const { flashSequence, speedMs } = this.getFlashPayload(challenge);
    this.flashSequence.set(flashSequence);
    this.flashCurrentIndex.set(0);
    this.flashState.set(GAME_STATE.START);

    this.currentFlashNumber.set(null);
    this.showQuestion.set(false);
    this.isFlashing.set(true);
    this.flashStartTime = Date.now();

    if (flashSequence.length === 0) {
      // No sequence to flash — show the question immediately.
      this.isFlashing.set(false);
      this.flashState.set(GAME_STATE.ROUND);
      this.showQuestion.set(true);
      return;
    }

    this.currentFlashNumber.set(this.flashSequence()[0] ?? null);
    this.flashState.set(GAME_STATE.ROUND);

    this.flashIntervalId = setInterval(() => {
      this.flashState.set(GAME_STATE.NEXT);
      const nextIndex = this.flashCurrentIndex() + 1;
      if (nextIndex < this.flashSequence().length) {
        this.flashCurrentIndex.set(nextIndex);
        this.currentFlashNumber.set(this.flashSequence()[nextIndex] ?? null);
        this.flashState.set(GAME_STATE.ROUND);
      } else {
        const id = this.flashIntervalId;
        if (id !== null) {
          clearInterval(id);
        }
        this.flashIntervalId = null;
        this.flashCurrentIndex.set(this.flashSequence().length);
        this.currentFlashNumber.set(null);
        this.isFlashing.set(false);
        this.flashState.set(GAME_STATE.ROUND);
        this.showQuestion.set(true);
      }
    }, speedMs);
  }

  loadChallenge(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.selectedAnswer.set(null);
    this.challengeSubmitted.set(false);
    this.selectedAnswers.set([]);
    this.currentStepIndex.set(0);
    this.stepDirection.set('left');
    this.mapHintsOpen.set(false);
    this.mapStepAnswers.set({});
    this.mapStepTextAnswers.set({});
    this.mapPartialCredit.set(0);
    this.currentFlashNumber.set(null);
    this.flashSequence.set([]);
    this.flashCurrentIndex.set(0);
    this.flashState.set(GAME_STATE.START);
    this.showQuestion.set(false);
    this.isFlashing.set(false);

    if (this.flashIntervalId !== null) {
      clearInterval(this.flashIntervalId);
      this.flashIntervalId = null;
    }
    this.clearMapAutoAdvanceTimeout();

    const apiMode = this.toApiMode(this.selectedMode());
    this.activeChallengeApiMode = apiMode;

    if (apiMode === 'abacus-flash') {
      this.gameService
        .getAbacusFlashChallenge({
          studentId: this.studentId(),
          difficulty: this.adaptiveDifficulty() ?? undefined,
          streak: this.streakTotal()
        })
        .subscribe({
          next: (challenge) => {
            this.challenge.set(challenge);
            this.completedQuests.set(challenge.dailyQuest.progress);
            this.loading.set(false);
            this.startFlashSequence();
          },
          error: () => {
            this.errorMessage.set('Unable to load game challenge.');
            this.loading.set(false);
          },
        });
    } else {
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
            if (this.isLegacyChallenge(challenge)) {
              this.completedQuests.set(challenge.dailyQuest.progress);
            } else {
              this.completedQuests.set(0);
            }
            this.loading.set(false);
          },
          error: () => {
            this.errorMessage.set('Unable to load game challenge.');
            this.loading.set(false);
          },
        });
    }
  }

  submitChallenge(): void {
    const challenge = this.challenge();
    if (!challenge || this.challengeSubmitted()) {
      return;
    }

    const isMapChallenge = this.isMapChallenge(challenge) && this.selectedMode() === 'map';
    const hasAnswerOptions = this.hasAnswerOptions(challenge);
    const selected = this.selectedAnswer();
    if (!isMapChallenge && hasAnswerOptions && selected === null) {
      return;
    }

    this.challengeSubmitted.set(true);
    const correct = isMapChallenge
      ? this.evaluateMapChallenge()
      : hasAnswerOptions
        ? selected === challenge.answer
        : false;

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

    if (this.activeChallengeApiMode === 'abacus-flash') {
      if (typeof selected !== 'number') {
        return;
      }
      const timeTakenMs =
        this.flashStartTime !== null ? Date.now() - this.flashStartTime : undefined;

      this.gameService
        .submitAbacusFlash({
          studentId: this.studentId(),
          challengeId: challenge.challengeId,
          answer: selected,
          timeTakenMs,
        })
        .subscribe({
          next: (result) => {
            // Update adaptive difficulty from server response
            this.adaptiveDifficulty.set(result.newDifficulty);
            // Sync streak with authoritative server value
            this.localStreak.set(result.newStreak);
            // Update quest progress if server reports more completions
            if (result.dailyQuestProgress > this.completedQuests()) {
              this.completedQuests.set(result.dailyQuestProgress);
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
      this.gameService
        .submitChallenge({
          studentId: this.studentId(),
          mode: this.activeChallengeApiMode,
          score: 100,
          accuracy: 100,
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

  ngOnDestroy(): void {
    if (this.flashIntervalId !== null) {
      clearInterval(this.flashIntervalId);
      this.flashIntervalId = null;
    }
    this.clearMapAutoAdvanceTimeout();
  }
}
