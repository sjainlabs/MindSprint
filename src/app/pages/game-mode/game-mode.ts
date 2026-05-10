import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameService, type GameChallenge } from '../../services/game.service';
import { DEFAULT_STUDENT_ID, StudentIntelligenceService } from '../../services/student-intelligence.service';

const DAILY_QUEST_TARGET = 3;

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

  constructor(
    private readonly gameService: GameService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
  ) {}

  ngOnInit(): void {
    this.refreshAdaptiveDifficulty();
    this.loadChallenge();
  }

  loadChallenge(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.selectedAnswer.set(null);
    this.challengeSubmitted.set(false);

    this.gameService
      .getChallenge({
        studentId: this.studentId(),
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
    if (this.completedQuests() < DAILY_QUEST_TARGET) {
      this.completedQuests.update((count) => Math.min(DAILY_QUEST_TARGET, count + 1));
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
}
