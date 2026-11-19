import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/teachers) ---------------- */

export interface TeacherProfile {
  uid: string;
  name: string;
  email: string;
  /** TCH-XXXXXX, given to parents */
  code: string;
  createdAt: string;
}

/** A teacher on one child, as the parent sees them */
export interface LinkedTeacher {
  teacherUid: string;
  name: string;
  email: string;
  linkedAt: string;
}

/** A child on the teacher's list */
export interface TeacherStudent {
  studentId: string;
  name: string;
  grade: string | null;
  linkedAt: string;
}

export type TeacherErrorCode = 'INVALID_TEACHER_CODE' | 'INVALID_REQUEST' | 'NOT_FOUND' | 'UNAUTHORIZED';
export type TeacherError = TestApiError<TeacherErrorCode>;

/**
 * Teachers and the children they can see. A teacher signs in like a parent and shares their code;
 * a parent enters it on each child they want the teacher to see. Every call needs the Firebase ID token.
 */
@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/teachers`;

  /* ---------------- Teacher ---------------- */

  /** The signed-in teacher's profile and code, made on first visit. */
  async me(): Promise<TeacherProfile> {
    return (await this.call(this.http.get<{ teacher: TeacherProfile }>(`${this.apiBase}/me`, { headers: await authHeaders() }))).teacher;
  }

  async myStudents(): Promise<TeacherStudent[]> {
    return (await this.call(this.http.get<{ students: TeacherStudent[] }>(`${this.apiBase}/me/students`, { headers: await authHeaders() }))).students;
  }

  /** The teacher takes a child off their own list. */
  async leave(studentId: string): Promise<void> {
    await this.call(this.http.delete(`${this.apiBase}/me/students/${encodeURIComponent(studentId)}`, { headers: await authHeaders() }));
  }

  /* ---------------- Parent ---------------- */

  async teachersFor(studentId: string): Promise<LinkedTeacher[]> {
    const url = `${this.apiBase}/students/${encodeURIComponent(studentId)}`;
    return (await this.call(this.http.get<{ teachers: LinkedTeacher[] }>(url, { headers: await authHeaders() }))).teachers;
  }

  async add(studentId: string, code: string): Promise<LinkedTeacher> {
    const url = `${this.apiBase}/students/${encodeURIComponent(studentId)}`;
    return (await this.call(this.http.post<{ teacher: LinkedTeacher }>(url, { code }, { headers: await authHeaders() }))).teacher;
  }

  async remove(studentId: string, teacherUid: string): Promise<void> {
    const url = `${this.apiBase}/students/${encodeURIComponent(studentId)}/${encodeURIComponent(teacherUid)}`;
    await this.call(this.http.delete(url, { headers: await authHeaders() }));
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<TeacherErrorCode>(err);
    }
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
