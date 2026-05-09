import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { type LearningLevel } from './diagnostic.service';

export interface WorksheetQuestion {
  id: string;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  prompt: string;
}

export interface Worksheet {
  worksheetId: string;
  level: LearningLevel;
  title: string;
  instructions: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
}

@Injectable({
  providedIn: 'root',
})
export class PracticeService {
  private readonly isLocalhost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  private readonly apiRoot =
    this.isLocalhost ? 'http://localhost:3001/api' : '/api';
  private readonly baseUrl = `${this.apiRoot}/practice`;

  constructor(private readonly http: HttpClient) {}

  getPractice(level: LearningLevel): Observable<Worksheet> {
    return this.http.get<Worksheet>(`${this.baseUrl}/${level}`);
  }

  getWorksheet(level: LearningLevel): Observable<Worksheet> {
    return this.getPractice(level);
  }
}
