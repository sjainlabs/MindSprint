import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type StudentProfile,
} from '../../services/student-intelligence.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

export interface SuperSyllabusScores {
  fluencyScore: number;
  conceptualMasteryScore: number;
  reasoningScore: number;
  mapRITEstimate: number;
  competitionLevel: 'None' | 'AMC-8' | 'AMC-10' | 'MATHCOUNTS' | 'AIME';
}

function deriveScores(profile: StudentProfile): SuperSyllabusScores {
  const ops = profile.masteryLevels;
  const avg = (ops.addition + ops.subtraction + ops.multiplication + ops.division) / 4;
  const fluencyScore = Math.round((ops.addition + ops.subtraction) / 2);
  const conceptualMasteryScore = Math.round((ops.multiplication + ops.division) / 2);
  const reasoningScore = Math.min(100, Math.round(avg * 1.1));
  const mapRITEstimate = Math.round(180 + avg * 0.9);
  let competitionLevel: SuperSyllabusScores['competitionLevel'] = 'None';
  if (avg >= 90) competitionLevel = 'AIME';
  else if (avg >= 80) competitionLevel = 'MATHCOUNTS';
  else if (avg >= 65) competitionLevel = 'AMC-10';
  else if (avg >= 50) competitionLevel = 'AMC-8';
  return { fluencyScore, conceptualMasteryScore, reasoningScore, mapRITEstimate, competitionLevel };
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfileComponent implements OnInit {
  readonly t = inject(TranslationService);
  studentId = signal(DEFAULT_STUDENT_ID);
  profile = signal<StudentProfile | null>(null);
  scores = signal<SuperSyllabusScores | null>(null);
  loading = signal(false);
  errorMessage = signal('');

  constructor(private readonly studentIntelligenceService: StudentIntelligenceService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.studentIntelligenceService.getStudentProfile(this.studentId()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.scores.set(deriveScores(profile));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load student profile.');
        this.loading.set(false);
      },
    });
  }

  scoreColor(value: number): string {
    if (value >= 80) return 'text-emerald-600';
    if (value >= 55) return 'text-amber-600';
    return 'text-red-500';
  }

  barColor(value: number): string {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 55) return 'bg-amber-500';
    return 'bg-red-400';
  }

  operationKeys(): Array<'addition' | 'subtraction' | 'multiplication' | 'division'> {
    return ['addition', 'subtraction', 'multiplication', 'division'];
  }
}
