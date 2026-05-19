import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ParentAccessStudentProfile {
  id: string;
  name: string;
  grade: string;
  avatar: string;
}

export interface ParentUnlockedMaterial {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
}

interface ValidateAccessCodeResponse {
  valid?: boolean;
  message?: string;
  student?: Partial<ParentAccessStudentProfile>;
}

interface MaterialsResponse {
  materials?: Array<Partial<ParentUnlockedMaterial>>;
}

@Injectable({ providedIn: 'root' })
export class ParentAccessService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = environment.apiUrl;

  private readonly studentStorageKey = 'parentValidatedStudent';
  private readonly materialsStorageKey = 'parentUnlockedMaterials';

  private readonly validatedStudentState = signal<ParentAccessStudentProfile | null>(
    this.getStoredStudent(),
  );
  private readonly unlockedMaterialsState = signal<ParentUnlockedMaterial[]>(this.getStoredMaterials());

  readonly validatedStudent = this.validatedStudentState.asReadonly();
  readonly unlockedMaterials = this.unlockedMaterialsState.asReadonly();

  async validateAccessCode(accessCode: string): Promise<ParentAccessStudentProfile> {
    const trimmedCode = accessCode.trim();
    if (!trimmedCode) {
      throw new Error('Please enter a student access code.');
    }

    const response = await firstValueFrom(
      this.http.post<ValidateAccessCodeResponse>(`${this.apiRoot}/parent/access-code/validate`, {
        accessCode: trimmedCode,
      }),
    );

    if (response.valid === false || !response.student?.id) {
      throw new Error(response.message ?? 'Invalid student access code.');
    }

    const student: ParentAccessStudentProfile = {
      id: response.student.id,
      name: response.student.name ?? 'Student',
      grade: response.student.grade ?? '',
      avatar: response.student.avatar ?? '🧠',
    };

    this.validatedStudentState.set(student);
    this.persistStudent(student);
    return student;
  }

  async loadUnlockedMaterials(): Promise<ParentUnlockedMaterial[]> {
    const student = this.validatedStudentState();
    if (!student) {
      throw new Error('Please validate a student access code first.');
    }

    const response = await firstValueFrom(
      this.http.post<MaterialsResponse>(`${this.apiRoot}/parent/materials`, {
        studentId: student.id,
      }),
    );

    const materials = (response.materials ?? []).map((material, index) => ({
      id: material.id ?? this.createFallbackMaterialId(material, index),
      title: material.title ?? 'Untitled Material',
      description: material.description ?? '',
      type: material.type ?? 'material',
      url: material.url ?? '',
    }));

    this.unlockedMaterialsState.set(materials);
    this.persistMaterials(materials);
    return materials;
  }

  hasValidatedAccess(): boolean {
    return !!this.validatedStudentState();
  }

  clearAccess(): void {
    this.validatedStudentState.set(null);
    this.unlockedMaterialsState.set([]);
    if (!this.hasStorage()) {
      return;
    }
    window.sessionStorage.removeItem(this.studentStorageKey);
    window.sessionStorage.removeItem(this.materialsStorageKey);
  }

  private persistStudent(student: ParentAccessStudentProfile): void {
    if (!this.hasStorage()) {
      return;
    }
    window.sessionStorage.setItem(this.studentStorageKey, JSON.stringify(student));
  }

  private persistMaterials(materials: ParentUnlockedMaterial[]): void {
    if (!this.hasStorage()) {
      return;
    }
    window.sessionStorage.setItem(this.materialsStorageKey, JSON.stringify(materials));
  }

  private getStoredStudent(): ParentAccessStudentProfile | null {
    if (!this.hasStorage()) {
      return null;
    }
    const raw = window.sessionStorage.getItem(this.studentStorageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ParentAccessStudentProfile>;
      if (!parsed.id) {
        return null;
      }
      return {
        id: parsed.id,
        name: parsed.name ?? 'Student',
        grade: parsed.grade ?? '',
        avatar: parsed.avatar ?? '🧠',
      };
    } catch {
      return null;
    }
  }

  private getStoredMaterials(): ParentUnlockedMaterial[] {
    if (!this.hasStorage()) {
      return [];
    }
    const raw = window.sessionStorage.getItem(this.materialsStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Array<Partial<ParentUnlockedMaterial>>;
      return parsed.map((material, index) => ({
        id: material.id ?? this.createFallbackMaterialId(material, index),
        title: material.title ?? 'Untitled Material',
        description: material.description ?? '',
        type: material.type ?? 'material',
        url: material.url ?? '',
      }));
    } catch {
      return [];
    }
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  }

  private createFallbackMaterialId(material: Partial<ParentUnlockedMaterial>, index: number): string {
    const seed = `${material.title ?? 'material'}|${material.type ?? 'material'}|${material.url ?? ''}`;
    const normalized = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (normalized) {
      return `material-${normalized}`;
    }
    return `material-${index + 1}`;
  }
}
