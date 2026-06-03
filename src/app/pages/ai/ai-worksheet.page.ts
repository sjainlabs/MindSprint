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
  readonly selectedSkillId = signal('');
  readonly difficulty = signal(70);
  readonly questionCount = signal(8);
  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly errorMessage = signal('');
  readonly worksheet = signal<AiWorksheet | null>(null);
  readonly skills = signal<SyllabusSkill[]>([]);

  readonly selectedSkill = computed(() =>
    this.skills().find((skill) => skill.skillId === this.selectedSkillId()) ?? null,
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly aiWorksheetService: AiWorksheetService,
  ) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() || this.authService.getStoredStudentId()?.trim() || '';
    const skillId = this.route.snapshot.queryParamMap.get('skillId')?.trim() || '';
    if (studentId) {
      this.studentId.set(studentId);
      this.authService.setActiveStudentId(studentId);
    }
    if (skillId) {
      this.selectedSkillId.set(skillId);
    }
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.syllabusService.getSyllabus().subscribe({
      next: (response) => {
        const allSkills = response.domains.flatMap((domain) => domain.skills);
        this.skills.set(allSkills);
        if (!this.selectedSkillId() && allSkills.length > 0) {
          this.selectedSkillId.set(allSkills[0].skillId);
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
    const skillId = this.selectedSkillId().trim();
    if (!skillId || this.generating()) {
      return;
    }

    this.generating.set(true);
    this.errorMessage.set('');
    this.worksheet.set(null);

    this.aiWorksheetService
      .generateWorksheet({
        topic: skillId,
        difficulty: this.difficulty(),
        questionCount: this.questionCount(),
        studentId: this.studentId() || undefined,
      })
      .subscribe({
        next: (worksheet) => {
          this.worksheet.set(worksheet);
          this.generating.set(false);
        },
        error: () => {
          this.errorMessage.set('Unable to generate worksheet right now.');
          this.generating.set(false);
        },
      });
  }
}

