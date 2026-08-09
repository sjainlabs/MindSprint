import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SyllabusService, type SyllabusSkill, type SuperSyllabus } from '../../services/syllabus.service';
import { PracticeConfigService, type EnhancedTopic } from '../../services/practice-config.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import {PracticeTopicCatalogService} from '../../services/practice-topic-catalog.service';

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
  readonly enhancedTopics = signal<EnhancedTopic[]>([]);

  /** ⭐ Merge syllabus domains + enhanced topics */
  readonly filteredDomains = computed(() => {
    const library = this.syllabus();
    const enhanced = this.enhancedTopics();

    if (!library || !enhanced.length) return [];

    const term = this.search().trim().toLowerCase();

    return library.domains
      .map((domain) => {
        const enrichedSkills = domain.skills.map((skill) => {
          const skillId = this.resolveSkillId(skill);

          const meta = enhanced.find((t) =>
            t.skills.some((s) =>
              s.id.toLowerCase().includes(skillId.toLowerCase())
            )
          );

          return {
            ...skill,
            enhanced: meta ?? null,
          };
        });

        const filteredSkills = term
          ? enrichedSkills.filter((s) =>
            [
              s.name,
              s.description,
              s.skillId,
              ...(s.tags ?? []),
              ...(s.enhanced?.skills.map((x) => x.id) ?? []),
            ]
              .join(' ')
              .toLowerCase()
              .includes(term)
          )
          : enrichedSkills;

        return {
          ...domain,
          skills: filteredSkills,
        };
      })
      .filter((domain) => domain.skills.length > 0);
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly practiceConfig: PracticeConfigService,
    private readonly catalogService: PracticeTopicCatalogService
  ) {}

  ngOnInit(): void {
    const studentId =
      this.route.snapshot.queryParamMap.get('studentId')?.trim() ||
      this.authService.getStoredStudentId()?.trim() ||
      '';

    if (studentId) {
      this.studentId.set(studentId);
      this.authService.setActiveStudentId(studentId);
    }

    this.loadLibrary();
  }

  /** ⭐ Load syllabus + enhanced metadata */
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

        this.loadEnhancedTopics();
        this.loading.set(false);
      },

      error: () => {
        this.errorMessage.set('Unable to load topic library.');
        this.loading.set(false);
      },
    });
  }

  /** ⭐ Load EnhancedTopic metadata */
  private loadEnhancedTopics(): void {
    // this.practiceConfig.getTopics().subscribe({
    //   next: (topics) => this.enhancedTopics.set(topics),
    //   error: () => {},
    // });
    this.catalogService.loadMergedCatalog();
    const topics = this.catalogService.getCatalog();

  }

  /** ⭐ Navigation */
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

  /** ⭐ Resolve skillId */
  resolveSkillId(skill: SyllabusSkill): string {
    const dynamicSkill = skill as SyllabusSkill & { id?: string; topicId?: string };
    return (skill.skillId || dynamicSkill.id || dynamicSkill.topicId || '').trim();
  }

  /** ⭐ Helper for template */
  getSkillIds(meta: EnhancedTopic): string {
    return (meta.skills ?? []).map((s) => s.id).join(', ');
  }
}
