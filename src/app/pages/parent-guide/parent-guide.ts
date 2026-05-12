import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ParentGuideSection {
  title: string;
  icon: string;
  points: string[];
}

@Component({
  selector: 'app-parent-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './parent-guide.html',
  styleUrl: './parent-guide.css',
})
export class ParentGuideComponent {
  readonly sections: ParentGuideSection[] = [
    {
      title: 'What is MindSprint?',
      icon: '🧭',
      points: [
        'MindSprint is a personalized math practice platform for grades K–8.',
        'It supports MAP-aligned skill development with adaptive learning and daily mastery practice.',
      ],
    },
    {
      title: 'MAP Prep Mode',
      icon: '📊',
      points: [
        'Students practice with RIT-aligned recommendations and MAP-style sessions.',
        'Parents can use growth projections and skill suggestions to focus practice time.',
      ],
    },
    {
      title: 'Foundational Math Mastery',
      icon: '📝',
      points: [
        'Daily practice sheets build fluency, accuracy, and confidence through short, consistent sessions.',
        'Students move forward after showing mastery, creating steady incremental growth.',
      ],
    },
    {
      title: 'Skill Practice',
      icon: '🧩',
      points: [
        'Domain-based learning includes Number Sense, Operations, Fractions, Geometry, and more.',
        'Step-by-step explanations and adaptive difficulty keep learning at the right challenge level.',
      ],
    },
    {
      title: 'AI Tutor',
      icon: '🤖',
      points: [
        'The AI Tutor provides homework help and clear concept explanations on demand.',
        'It can generate personalized questions for extra targeted practice.',
      ],
    },
    {
      title: 'Progress Tracking',
      icon: '📈',
      points: [
        'Track accuracy, difficulty level, and time spent to understand learning habits.',
        'Use RIT growth insights and skill mastery dashboards to monitor outcomes.',
      ],
    },
    {
      title: 'How Parents Can Support',
      icon: '💙',
      points: [
        'Encourage short daily sessions, review progress weekly, and use practice sheets for reinforcement.',
        'Celebrate small wins consistently to strengthen confidence and momentum.',
      ],
    },
  ];

  readonly expanded = signal<Set<number>>(new Set([0]));

  toggle(index: number): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  isExpanded(index: number): boolean {
    return this.expanded().has(index);
  }
}
