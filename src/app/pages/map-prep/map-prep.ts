import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  SyllabusService,
  type MAPGrowthProjection,
  type RITBandSkills,
  type SyllabusSkill,
} from '../../services/syllabus.service';

const RIT_BANDS = [
  { value: 180, label: 'RIT 180 (Grade K–1)' },
  { value: 190, label: 'RIT 190 (Grade 1–2)' },
  { value: 200, label: 'RIT 200 (Grade 2–3)' },
  { value: 210, label: 'RIT 210 (Grade 3–4)' },
  { value: 220, label: 'RIT 220 (Grade 4–5)' },
  { value: 230, label: 'RIT 230 (Grade 5–6)' },
  { value: 240, label: 'RIT 240 (Grade 6–7)' },
  { value: 250, label: 'RIT 250 (Grade 7–8)' },
  { value: 260, label: 'RIT 260 (Grade 8–9)' },
  { value: 270, label: 'RIT 270 (Grade 9–10)' },
];

const MOCK_MAP_SKILLS: Record<number, RITBandSkills> = {
  180: {
    band: 180,
    bandLabel: 'RIT 180',
    gradeEquivalent: 'Kindergarten – Grade 1',
    growthTargets: { currentBand: 180, targetBand: 190, monthsToTarget: 10 },
    skills: [
      {
        skillId: 'map-count-10',
        name: 'Count to 10',
        description: 'Count objects up to 10',
        difficulty: 10,
        ritBand: { min: 175, max: 185 },
        recommendedNextSteps: ['Count to 20', 'Number bonds to 5'],
        domain: 'map-skills',
        gradeRange: { min: 0, max: 1 },
        tags: ['counting', 'number-sense'],
      },
      {
        skillId: 'map-add-single',
        name: 'Single-Digit Addition',
        description: 'Add single-digit numbers within 10',
        difficulty: 15,
        ritBand: { min: 178, max: 188 },
        recommendedNextSteps: ['Add within 20', 'Subtract within 10'],
        domain: 'map-skills',
        gradeRange: { min: 0, max: 1 },
        tags: ['addition', 'fluency'],
      },
    ],
  },
  210: {
    band: 210,
    bandLabel: 'RIT 210',
    gradeEquivalent: 'Grade 3 – Grade 4',
    growthTargets: { currentBand: 210, targetBand: 220, monthsToTarget: 9 },
    skills: [
      {
        skillId: 'map-multiply-basic',
        name: 'Multiplication Fluency',
        description: 'Multiply within 100 with fluency',
        difficulty: 40,
        ritBand: { min: 205, max: 215 },
        recommendedNextSteps: ['Long multiplication', 'Division facts'],
        domain: 'map-skills',
        gradeRange: { min: 3, max: 4 },
        tags: ['multiplication', 'fluency'],
      },
      {
        skillId: 'map-fractions-intro',
        name: 'Fraction Concepts',
        description: 'Understand fractions as parts of a whole',
        difficulty: 45,
        ritBand: { min: 207, max: 217 },
        recommendedNextSteps: ['Equivalent fractions', 'Comparing fractions'],
        domain: 'map-skills',
        gradeRange: { min: 3, max: 4 },
        tags: ['fractions', 'number-sense'],
      },
    ],
  },
  230: {
    band: 230,
    bandLabel: 'RIT 230',
    gradeEquivalent: 'Grade 5 – Grade 6',
    growthTargets: { currentBand: 230, targetBand: 240, monthsToTarget: 10 },
    skills: [
      {
        skillId: 'map-ratios',
        name: 'Ratios & Proportions',
        description: 'Understand and use ratios and proportional relationships',
        difficulty: 60,
        ritBand: { min: 225, max: 235 },
        recommendedNextSteps: ['Percent problems', 'Rate problems'],
        domain: 'map-skills',
        gradeRange: { min: 5, max: 6 },
        tags: ['ratios', 'proportions'],
      },
      {
        skillId: 'map-integers',
        name: 'Integer Operations',
        description: 'Add, subtract, multiply and divide integers',
        difficulty: 62,
        ritBand: { min: 228, max: 238 },
        recommendedNextSteps: ['Order of operations', 'Absolute value'],
        domain: 'map-skills',
        gradeRange: { min: 5, max: 6 },
        tags: ['integers', 'operations'],
      },
    ],
  },
  250: {
    band: 250,
    bandLabel: 'RIT 250',
    gradeEquivalent: 'Grade 7 – Grade 8',
    growthTargets: { currentBand: 250, targetBand: 260, monthsToTarget: 11 },
    skills: [
      {
        skillId: 'map-linear-eq',
        name: 'Linear Equations',
        description: 'Solve one and two-step linear equations',
        difficulty: 75,
        ritBand: { min: 245, max: 255 },
        recommendedNextSteps: ['Systems of equations', 'Inequalities'],
        domain: 'map-skills',
        gradeRange: { min: 7, max: 8 },
        tags: ['algebra', 'equations'],
      },
      {
        skillId: 'map-geometry-mid',
        name: 'Geometric Reasoning',
        description: 'Angle relationships, transformations, and coordinate geometry',
        difficulty: 78,
        ritBand: { min: 247, max: 257 },
        recommendedNextSteps: ['Pythagorean theorem', 'Circles'],
        domain: 'map-skills',
        gradeRange: { min: 7, max: 8 },
        tags: ['geometry', 'reasoning'],
      },
    ],
  },
};

const MOCK_PROJECTION: MAPGrowthProjection = {
  studentId: 'student-demo',
  currentRIT: 220,
  projectedRIT: 228,
  projectedGrowth: 8,
  confidenceLevel: 'medium',
  recommendedSkills: [],
  practiceSessionsNeeded: 12,
};

@Component({
  selector: 'app-map-prep',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './map-prep.html',
  styleUrl: './map-prep.css',
})
export class MapPrepComponent implements OnInit {
  studentId = signal('student-demo');
  selectedRIT = signal(220);
  ritBands = RIT_BANDS;

  ritSkills = signal<RITBandSkills | null>(null);
  projection = signal<MAPGrowthProjection | null>(null);
  loadingSkills = signal(false);
  loadingProjection = signal(false);
  errorMessage = signal('');

  practiceQuestion = signal<SyllabusSkill | null>(null);
  practiceIndex = signal(0);
  practiceCorrect = signal(0);
  practiceTotal = signal(0);
  sessionComplete = signal(false);

  growthPercent = computed(() => {
    const p = this.projection();
    if (!p) return 0;
    return Math.min(100, Math.round((p.projectedGrowth / 15) * 100));
  });

  constructor(private readonly syllabusService: SyllabusService) {}

  ngOnInit(): void {
    this.loadRITSkills();
    this.loadProjection();
  }

  loadRITSkills(): void {
    this.loadingSkills.set(true);
    this.errorMessage.set('');

    this.syllabusService.getSkillsByRIT(this.selectedRIT()).subscribe({
      next: (data) => {
        this.ritSkills.set(data);
        this.loadingSkills.set(false);
        this.startPractice();
      },
      error: () => {
        // Fall back to mock data so the UI is usable even without backend
        const mock = MOCK_MAP_SKILLS[this.selectedRIT()] ?? MOCK_MAP_SKILLS[210];
        this.ritSkills.set(mock);
        this.loadingSkills.set(false);
        this.startPractice();
      },
    });
  }

  loadProjection(): void {
    this.loadingProjection.set(true);
    this.syllabusService.getMAPGrowthProjection(this.studentId(), this.selectedRIT()).subscribe({
      next: (data) => {
        this.projection.set(data);
        this.loadingProjection.set(false);
      },
      error: () => {
        const mock = { ...MOCK_PROJECTION, currentRIT: this.selectedRIT() };
        this.projection.set(mock);
        this.loadingProjection.set(false);
      },
    });
  }

  onRITChange(): void {
    this.sessionComplete.set(false);
    this.practiceCorrect.set(0);
    this.practiceTotal.set(0);
    this.practiceIndex.set(0);
    this.loadRITSkills();
    this.loadProjection();
  }

  startPractice(): void {
    const skills = this.ritSkills()?.skills ?? [];
    this.practiceIndex.set(0);
    this.practiceCorrect.set(0);
    this.practiceTotal.set(0);
    this.sessionComplete.set(false);
    this.practiceQuestion.set(skills[0] ?? null);
  }

  markCorrect(): void {
    this.practiceCorrect.update((n) => n + 1);
    this.nextQuestion();
  }

  markIncorrect(): void {
    this.nextQuestion();
  }

  private nextQuestion(): void {
    this.practiceTotal.update((n) => n + 1);
    const skills = this.ritSkills()?.skills ?? [];
    const next = this.practiceIndex() + 1;
    if (next >= skills.length) {
      this.sessionComplete.set(true);
      this.practiceQuestion.set(null);
    } else {
      this.practiceIndex.set(next);
      this.practiceQuestion.set(skills[next]);
    }
  }

  get accuracyPercent(): number {
    const total = this.practiceTotal();
    if (total === 0) return 0;
    return Math.round((this.practiceCorrect() / total) * 100);
  }
}
