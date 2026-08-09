import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PracticeTopicCatalogService } from '../../services/practice-topic-catalog.service';
import { PracticeTopicDefinition } from '../../services/practice-topic-catalog';
import { FormsModule } from '@angular/forms';
import {EnhancedTopic} from '../../services/practice-config.service';

@Component({
  selector: 'app-topic-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topic-detail.page.html',
  styleUrls: ['./topic-detail.page.css'],
})
export class TopicDetailPageComponent implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly topic = signal<EnhancedTopic | null>(null);

  readonly studentId = signal('');
  readonly skillId = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogService: PracticeTopicCatalogService
  ) {}

  ngOnInit(): void {
    this.loading.set(true);

    const studentId =
      this.route.snapshot.queryParamMap.get('studentId')?.trim() || '';
    const skillId =
      this.route.snapshot.queryParamMap.get('skillId')?.trim() || '';

    this.studentId.set(studentId);
    this.skillId.set(skillId);

    // Ensure merged catalog is loaded
    this.catalogService.loadMergedCatalog();

    setTimeout(() => {
      const meta = this.catalogService.findBySkill(skillId);

      if (!meta) {
        this.errorMessage.set('Topic not found.');
        this.loading.set(false);
        return;
      }

      this.topic.set(meta );
      this.loading.set(false);
    }, 150);
  }

  openAiWorksheet(): void {
    const t = this.topic();
    if (!t) return;

    void this.router.navigate(['/ai/worksheet'], {
      queryParams: {
        studentId: this.studentId(),
        skillId: this.skillId(),
        topicId: t.id,
        source: 'topic-detail',
      },
    });
  }

  backToLibrary(): void {
    void this.router.navigate(['/topic/library'], {
      queryParams: { studentId: this.studentId() },
    });
  }
}
