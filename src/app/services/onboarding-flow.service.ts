import { Injectable, signal } from '@angular/core';

export interface OnboardingState {
  grade: string;
  topics: string[];
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnboardingFlowService {
  private readonly key = 'onboarding-state';
  private readonly state = signal<OnboardingState>(this.readInitialState());

  private createDefaultState(): OnboardingState {
    return {
      grade: '',
      topics: [],
      completed: false,
    };
  }

  private readInitialState(): OnboardingState {
    if (typeof window === 'undefined') {
      return this.createDefaultState();
    }

    const raw = window.localStorage.getItem(this.key);
    if (!raw) {
      return this.createDefaultState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<OnboardingState>;
      return {
        grade: typeof parsed.grade === 'string' ? parsed.grade : '',
        topics: Array.isArray(parsed.topics) ? parsed.topics.map(String).filter(Boolean) : [],
        completed: parsed.completed === true,
      };
    } catch {
      return this.createDefaultState();
    }
  }

  getState(): OnboardingState {
    return this.state();
  }

  setState(state: Partial<OnboardingState>): void {
    const current = this.state();
    const nextState: OnboardingState = {
      grade: typeof state.grade === 'string' ? state.grade : current.grade,
      topics: Array.isArray(state.topics) ? state.topics.map(String).filter(Boolean) : current.topics,
      completed: typeof state.completed === 'boolean' ? state.completed : current.completed,
    };

    this.state.set(nextState);
    this.save(nextState);
  }


  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.state.set(this.createDefaultState());
    window.localStorage.removeItem(this.key);
  }

  private save(state: OnboardingState): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.key, JSON.stringify(state));
  }
}
