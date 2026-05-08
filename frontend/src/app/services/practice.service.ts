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
  private readonly apiRoot =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api'
      : '/api';
  private readonly baseUrl = `${this.apiRoot}/practice`;

  constructor(private readonly http: HttpClient) {}

  generateWorksheet(level: LearningLevel): Observable<Worksheet> {
    return this.http.post<Worksheet>(`${this.baseUrl}/worksheet`, { level });
  }
}
