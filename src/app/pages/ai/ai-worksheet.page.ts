import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AiWorksheetService, type AiWorksheet } from '../../services/ai-worksheet.service';
import { SyllabusService, type SyllabusSkill } from '../../services/syllabus.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-ai-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './ai-worksheet.page.html',
  styleUrl: './ai-worksheet.page.css',
})
export class AiWorksheetPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly source = signal('');
  readonly selectedSkillId = signal('');
  readonly fixedSkillId = signal('');
  readonly difficulty = signal(70);
  readonly questionCount = signal(8);
  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly errorMessage = signal('');
  readonly worksheet = signal<AiWorksheet | null>(null);
  readonly skills = signal<SyllabusSkill[]>([]);
  readonly hasGenerated = signal(false);

  readonly selectedSkill = computed(() =>
    this.skills().find((skill) => skill.skillId === this.selectedSkillId()) ?? null,
  );
  readonly isSkillLocked = computed(() => !!this.fixedSkillId());
  readonly fromTopicLibrary = computed(() => this.source() === 'topic-library');
  readonly practiceHubQueryParams = computed(() => ({ studentId: this.studentId() }));
  readonly topicLibraryQueryParams = computed(() => ({ studentId: this.studentId() }));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly aiWorksheetService: AiWorksheetService,
  ) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() || this.authService.getStoredStudentId()?.trim() || '';
    const source = this.route.snapshot.queryParamMap.get('source')?.trim() || '';
    const skillId = this.normalizeSkillId(
      this.route.snapshot.queryParamMap.get('skillId') || this.route.snapshot.queryParamMap.get('topicId'),
    );
    if (studentId) {
      this.studentId.set(studentId);
      this.authService.setActiveStudentId(studentId);
    }
    if (skillId) {
      this.selectedSkillId.set(skillId);
      this.fixedSkillId.set(skillId);
    } else {
      this.errorMessage.set('Please select a topic first from Practice Hub.');
    }
    this.source.set(source);
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.syllabusService.getSyllabus().subscribe({
      next: (response) => {
        const allSkills = response.domains
          .flatMap((domain) => domain.skills)
          .map((skill) => ({
            ...skill,
            skillId: this.resolveSkillId(skill),
          }))
          .filter((skill) => !!skill.skillId);
        this.skills.set(allSkills);
        if (allSkills.length === 0) {
          this.selectedSkillId.set('');
          this.loading.set(false);
          return;
        }

        const currentSkillId = this.normalizeSkillId(this.selectedSkillId());
        if (!currentSkillId) {
          this.selectedSkillId.set('');
          this.errorMessage.set('Please select a topic first from Practice Hub.');
        } else {
          const matchedSkill = allSkills.find((skill) => skill.skillId === currentSkillId);
          if (matchedSkill) {
            this.selectedSkillId.set(matchedSkill.skillId);
          } else {
            this.selectedSkillId.set('');
            this.errorMessage.set('Selected topic is unavailable. Please pick another topic from Practice Hub.');
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load skills for AI generation.');
        this.loading.set(false);
      },
    });
  }

  generate(): void {
    const skillId = this.normalizeSkillId(this.selectedSkillId());
    if (!skillId || this.generating() || this.hasGenerated()) {
      return;
    }
    this.selectedSkillId.set(skillId);

    const topic = this.resolveBackendTopic(this.selectedSkill(), skillId);
    if (!topic) {
      this.errorMessage.set('Selected topic is not supported for AI worksheet generation yet.');
      return;
    }

    this.generating.set(true);
    this.errorMessage.set('');
    this.worksheet.set(null);

    this.aiWorksheetService
      .generateWorksheet({
        topic,
        difficulty: this.difficulty(),
        questionCount: this.questionCount(),
        studentId: this.studentId() || undefined,
      })
      .subscribe({
        next: (worksheet) => {
          this.worksheet.set(this.normalizeWorksheet(worksheet));
          this.hasGenerated.set(true);
          this.generating.set(false);
        },
        error: () => {
          this.errorMessage.set('Unable to generate worksheet right now.');
          this.generating.set(false);
        },
      });
  }

  private normalizeSkillId(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    if (!normalized) {
      return '';
    }
    const lowered = normalized.toLowerCase();
    if (lowered === 'undefined' || lowered === 'null') {
      return '';
    }
    return normalized;
  }

  private resolveSkillId(skill: SyllabusSkill): string {
    const dynamicSkill = skill as SyllabusSkill & { id?: string; topicId?: string };
    return this.normalizeSkillId(skill.skillId || dynamicSkill.id || dynamicSkill.topicId);
  }

  private resolveBackendTopic(skill: SyllabusSkill | null, fallbackSkillId: string): string {
    const normalizedFallback = this.normalizeSkillId(fallbackSkillId).toLowerCase();
    const allowedTopics = new Set([
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'fractions',
      'decimals',
      'percentages',
      'ratios',
      'algebra',
      'geometry',
      'trigonometry',
      'calculus',
      'foundation',
      'elementary',
      'middle-school',
      'pre-algebra',
      'algebra-i',
      'algebra-ii',
      'pre-calculus',
    ]);

    if (allowedTopics.has(normalizedFallback)) {
      return normalizedFallback;
    }

    const haystack = [skill?.name, skill?.description, skill?.skillId, normalizedFallback]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (haystack.includes('calculus')) return 'calculus';
    if (haystack.includes('trigonometry') || haystack.includes('trig')) return 'trigonometry';
    if (haystack.includes('geometry')) return 'geometry';
    if (haystack.includes('algebra ii') || haystack.includes('algebra 2') || haystack.includes('algebra-ii')) {
      return 'algebra-ii';
    }
    if (haystack.includes('pre calculus') || haystack.includes('pre-calculus') || haystack.includes('precalculus')) {
      return 'pre-calculus';
    }
    if (haystack.includes('algebra i') || haystack.includes('algebra 1') || haystack.includes('algebra-i')) {
      return 'algebra-i';
    }
    if (haystack.includes('algebra')) return 'algebra';
    if (haystack.includes('ratio') || haystack.includes('proportion')) return 'ratios';
    if (haystack.includes('percent')) return 'percentages';
    if (haystack.includes('fraction')) return 'fractions';
    if (haystack.includes('decimal')) return 'decimals';
    if (haystack.includes('division')) return 'division';
    if (haystack.includes('multiplication') || haystack.includes('times') || haystack.includes('product')) {
      return 'multiplication';
    }
    if (haystack.includes('subtraction') || haystack.includes('minus') || haystack.includes('difference')) {
      return 'subtraction';
    }
    if (
      haystack.includes('addition') ||
      haystack.includes('count') ||
      haystack.includes('number sequencing') ||
      haystack.includes('sum')
    ) {
      return 'addition';
    }

    return '';
  }

  private normalizeWorksheet(worksheet: AiWorksheet): AiWorksheet {
    return {
      ...worksheet,
      questions: (worksheet.questions ?? []).map((question, index) => ({
        ...question,
        id: question.id || question.questionId || `q-${index + 1}`,
        prompt: question.prompt || question.questionText || '',
        type: question.type || question.metadata?.type || 'numeric',
        topic: question.topic || question.metadata?.topic || worksheet.topic,
        subtopic: question.subtopic || question.metadata?.subtopic || '',
        hints: question.hints ?? question.metadata?.hints ?? [],
      })),
    };
  }
}

