import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SyllabusService, type SyllabusSkill, type SuperSyllabus } from '../../services/syllabus.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';

@Component({
  selector: 'app-topic-library-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LanguageToggleComponent],
  templateUrl: './topic-library.page.html',
  styleUrl: './topic-library.page.css',
})
export class TopicLibraryPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly search = signal('');
  readonly syllabus = signal<SuperSyllabus | null>(null);

  readonly filteredDomains = computed(() => {
    const library = this.syllabus();
    if (!library) {
      return [];
    }
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return library.domains;
    }
    return library.domains
      .map((domain) => ({
        ...domain,
        skills: domain.skills.filter((skill) =>
          [skill.name, skill.description, skill.skillId, ...skill.tags].join(' ').toLowerCase().includes(term),
        ),
      }))
      .filter((domain) => domain.skills.length > 0);
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
  ) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() || this.authService.getStoredStudentId()?.trim() || '';
    if (studentId) {
      this.studentId.set(studentId);
      this.authService.setActiveStudentId(studentId);
    }
    this.loadLibrary();
  }

  loadLibrary(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.syllabusService.getSyllabus().subscribe({
      next: (response) => {
        const normalizedDomains = response.domains.map((domain) => ({
          ...domain,
          skills: domain.skills.map((skill) => ({
            ...skill,
            skillId: this.resolveSkillId(skill),
          })),
        }));
        this.syllabus.set({
          ...response,
          domains: normalizedDomains,
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load topic library.');
        this.loading.set(false);
      },
    });
  }

  openTopicDetail(skillId: string): void {
    void this.router.navigate(['/topic/detail'], {
      queryParams: {
        studentId: this.studentId(),
        skillId,
      },
    });
  }

  openAiGenerator(skillId: string): void {
    const resolvedSkillId = skillId.trim();
    if (!resolvedSkillId) {
      this.errorMessage.set('Selected topic is unavailable for AI worksheet generation.');
      return;
    }
    void this.router.navigate(['/ai/worksheet'], {
      queryParams: {
        studentId: this.studentId(),
        skillId: resolvedSkillId,
        source: 'topic-library',
      },
    });
  }

  resolveSkillId(skill: SyllabusSkill): string {
    const dynamicSkill = skill as SyllabusSkill & { id?: string; topicId?: string };
    return (skill.skillId || dynamicSkill.id || dynamicSkill.topicId || '').trim();
  }
}

