import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SyllabusService, type RITBandSkills } from '../../services/syllabus.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';

@Component({
  selector: 'app-rit-lookup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LanguageToggleComponent],
  templateUrl: './rit-lookup.page.html',
  styleUrl: './rit-lookup.page.css',
})
export class RitLookupPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly selectedBand = signal(220);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly ritSkills = signal<RITBandSkills | null>(null);

  readonly bands = [180, 190, 200, 210, 220, 230, 240, 250, 260, 270];

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
    this.loadBand();
  }

  loadBand(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.syllabusService.getSkillsByRIT(this.selectedBand()).subscribe({
      next: (response) => {
        this.ritSkills.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load RIT lookup data.');
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
}

