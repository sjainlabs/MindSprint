import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameService, type GameChallenge } from '../../services/game.service';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type GameMode,
} from '../../services/student-intelligence.service';

const DAILY_QUEST_TARGET = 3;

export type SuperGameMode = GameMode | 'fluency-speed' | 'reasoning-puzzle' | 'map-challenge' | 'competition-boss';

@Component({
  selector: 'app-game-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './game-mode.html',
  styleUrl: './game-mode.css',
})
export class GameModeComponent {
  studentId = signal(DEFAULT_STUDENT_ID);
  challenge = signal<GameChallenge | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  selectedAnswer = signal<number | null>(null);
  challengeSubmitted = signal(false);
  completedQuests = signal(0);
  adaptiveDifficulty = signal<number | null>(null);
  localXp = signal(0);
  localStreak = signal(0);
  unlockedBadges = signal<string[]>([]);
  selectedMode = signal<SuperGameMode>('abacus-flash');
  /** The API-compatible mode used for the currently loaded challenge */
  private activeChallengeApiMode: GameMode = 'abacus-flash';
  gameModeOptions: Array<{ value: SuperGameMode; label: string; description: string; icon: string }> = [
    { value: 'abacus-flash', label: 'Abacus Flash', description: 'Flash-card speed drills with adaptive pacing.', icon: '🔢' },
    { value: 'falling-numbers', label: 'Falling Numbers', description: 'Catch target sums, build combos, use power-ups.', icon: '🎮' },
    { value: 'boss-battle', label: 'Boss Battle', description: 'Timed HP-bar battle with special attacks.', icon: '⚔️' },
    { value: 'ai-puzzle', label: 'AI Puzzle', description: 'Logic, pattern and geometry puzzles.', icon: '🤖' },
    { value: 'fluency-speed', label: 'Fluency Speed', description: 'Race the clock on arithmetic fluency drills.', icon: '⚡' },
    { value: 'reasoning-puzzle', label: 'Reasoning Puzzle', description: 'Multi-step reasoning and logical deduction.', icon: '🔍' },
    { value: 'map-challenge', label: 'MAP Challenge', description: 'Graph interpretation and MAP-style word problems.', icon: '📊' },
    { value: 'competition-boss', label: 'Competition Boss', description: 'AMC/MATHCOUNTS-level boss battle problems.', icon: '🏆' },
  ];

  // Grouped for UI display
  coreModes = this.gameModeOptions.slice(0, 4);
  superModes = this.gameModeOptions.slice(4);

  xpTotal = computed(() => (this.challenge()?.playerState.xp ?? 0) + this.localXp());
  streakTotal = computed(() => Math.max(this.challenge()?.playerState.streak ?? 0, this.localStreak()));
  currentBadges = computed(() => {
    const base = this.challenge()?.playerState.badges ?? [];
    return [...new Set([...base, ...this.unlockedBadges()])];
  });
  isCorrect = computed(() => {
    if (!this.challengeSubmitted() || this.selectedAnswer() === null) {
      return null;
    }
    return this.selectedAnswer() === this.challenge()?.answer;
  });

  isSuperMode = computed(() => {
    const mode = this.selectedMode();
    return ['fluency-speed', 'reasoning-puzzle', 'map-challenge', 'competition-boss'].includes(mode);
  });

  superModeInfo = computed(() => {
    const mode = this.selectedMode();
    const info: Record<string, { badge: string; tip: string }> = {
      'fluency-speed': { badge: '⚡ Fluency Champion', tip: 'Answer as fast as possible! Speed builds automaticity.' },
      'reasoning-puzzle': { badge: '🔍 Logic Master', tip: 'Take your time. Read carefully and think step by step.' },
      'map-challenge': { badge: '📊 MAP Achiever', tip: 'These questions mirror real MAP test items. Pace yourself.' },
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
      'map-challenge': 'ai-puzzle',
      'competition-boss': 'boss-battle',
    };
    return mapping[mode] ?? 'ai-puzzle';
  }

  loadChallenge(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.selectedAnswer.set(null);
    this.challengeSubmitted.set(false);

    const apiMode = this.toApiMode(this.selectedMode());
    this.activeChallengeApiMode = apiMode;

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
          this.completedQuests.set(challenge.dailyQuest.progress);
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
    const selected = this.selectedAnswer();
    if (!challenge || selected === null || this.challengeSubmitted()) {
      return;
    }

    this.challengeSubmitted.set(true);
    const correct = selected === challenge.answer;
    if (!correct) {
      return;
    }

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
}
