import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Mirrors the backend's free-trial status (/api/access/:studentId) */
export interface AccessStatus {
  plan: 'trial' | 'unlimited';
  /** active, or warning from 80% of either limit; ended = no new work, reports open; closed = reports closed too */
  state: 'unlimited' | 'active' | 'warning' | 'ended' | 'closed';
  usedHours: number;
  hourLimit: number;
  usedSheets: number;
  sheetLimit: number;
  trialEndedAt: string | null;
  reportsUntil: string | null;
  contactEmail: string;
}

/** Error codes the backend sends when the free trial stops a request */
export const TRIAL_ENDED = 'TRIAL_ENDED';
export const REPORTS_CLOSED = 'REPORTS_CLOSED';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly http = inject(HttpClient);

  /** The child's free-trial status; null if it can't be loaded (the app then behaves as before) */
  async status(studentId: string): Promise<AccessStatus | null> {
    try {
      return await firstValueFrom(this.http.get<AccessStatus>(`${environment.apiUrl}/access/${encodeURIComponent(studentId)}`));
    } catch {
      return null;
    }
  }
}
