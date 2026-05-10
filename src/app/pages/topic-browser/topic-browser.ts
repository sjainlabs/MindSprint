import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TopicService,
  type ExplorationRecommendation,
  type TopicBrowserResponse,
} from '../../services/topic.service';

@Component({
  selector: 'app-topic-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topic-browser.html',
  styleUrl: './topic-browser.css',
})
export class TopicBrowserComponent implements OnInit {
  studentId = signal('student-demo');
  selectedTopicId = signal('foundation');
  browser = signal<TopicBrowserResponse | null>(null);
  exploration = signal<ExplorationRecommendation | null>(null);
  loading = signal(false);
  explorationLoading = signal(false);
  errorMessage = signal('');

  constructor(private readonly topicService: TopicService) {}

  ngOnInit(): void {
    this.loadBrowser();
  }

  loadBrowser(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.topicService.getTopicBrowser(this.studentId()).subscribe({
      next: (response) => {
        this.browser.set(response);
        if (response.browseTopics.length > 0) {
          this.selectedTopicId.set(response.browseTopics[0].id);
        }
        this.loading.set(false);
        this.loadExplorationRecommendation();
      },
      error: () => {
        this.errorMessage.set('Unable to load topic browser.');
        this.loading.set(false);
      },
    });
  }

  loadExplorationRecommendation(): void {
    this.explorationLoading.set(true);
    this.topicService
      .getExplorationRecommendation(this.studentId(), this.selectedTopicId())
      .subscribe({
        next: (response) => {
          this.exploration.set(response);
          this.explorationLoading.set(false);
        },
        error: () => {
          this.explorationLoading.set(false);
        },
      });
  }
}
