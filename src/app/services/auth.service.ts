import { Injectable } from '@angular/core';
import {
  User,
  getRedirectResult,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/firebase.config';

export interface ParentProfile {
  id: string;
  uid: string;
  email: string;
  createdAt: string | null;
  subscriptionStatus: string;
  students: string[];
}

export interface StudentProfile {
  id: string;
  parentId: string;
  name: string;
  grade: string;
  avatar: string;
  loginCode: string;
  masteryMap: Record<string, number>;
  createdAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly studentStorageKey = 'studentId';
  private readonly minStudentCode = 100000;
  private readonly maxStudentCode = 999999;
  private readonly authStateRestorationTimeoutMs = 2000;
  private redirectHandled = false;
  private sessionRestorePromise: Promise<User | null> | null = null;

  async startGoogleRedirectLogin(): Promise<void> {
    await signInWithRedirect(auth, googleProvider);
  }

  async handleRedirectLogin(): Promise<User | null> {
    if (this.sessionRestorePromise) {
      return this.sessionRestorePromise;
    }

    this.sessionRestorePromise = this.restoreSession().finally(() => {
      this.sessionRestorePromise = null;
    });

    return this.sessionRestorePromise;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  onAuthStateChanged(nextOrObserver: Parameters<typeof firebaseOnAuthStateChanged>[1]): () => void {
    return firebaseOnAuthStateChanged(auth, nextOrObserver);
  }

  async loginStudentWithCode(code: string): Promise<StudentProfile> {
    const loginCode = code.trim();
    if (!/^\d{6}$/.test(loginCode)) {
      throw new Error('Please enter a valid 6-digit code.');
    }

    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(query(studentsRef, where('loginCode', '==', loginCode), limit(1)));
    if (snapshot.empty) {
      throw new Error('Invalid student login code.');
    }

    const studentDoc = snapshot.docs[0];
    const student = this.mapStudent(studentDoc.id, studentDoc.data());
    this.setStudentId(student.id);
    return student;
  }

  logoutStudent(): void {
    this.clearStudentId();
  }

  isParentLoggedIn(): boolean {
    return !!auth.currentUser;
  }

  isStudentLoggedIn(): boolean {
    return !!this.getStoredStudentId();
  }

  getStoredStudentId(): string | null {
    return this.hasStorage() ? window.localStorage.getItem(this.studentStorageKey) : null;
  }

  async getParentProfile(parentId?: string): Promise<ParentProfile | null> {
    const uid = parentId ?? auth.currentUser?.uid;
    if (!uid) {
      return null;
    }

    const parentDoc = await getDoc(doc(db, 'parents', uid));
    if (!parentDoc.exists()) {
      return null;
    }

    return this.mapParent(parentDoc.id, parentDoc.data());
  }

  async getStudentProfile(studentId: string): Promise<StudentProfile | null> {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (!studentDoc.exists()) {
      return null;
    }

    return this.mapStudent(studentDoc.id, studentDoc.data());
  }

  async getStudentsForParent(parentId?: string): Promise<StudentProfile[]> {
    const parentProfile = await this.getParentProfile(parentId);
    if (!parentProfile) {
      return [];
    }

    const mapped = await this.getStudentsByIds(parentProfile.students);
    if (parentProfile.students.length > 0 && mapped.length === parentProfile.students.length) {
      return mapped;
    }

    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(query(studentsRef, where('parentId', '==', parentProfile.id)));
    const queried = snapshot.docs.map((studentDoc) => this.mapStudent(studentDoc.id, studentDoc.data()));
    if (mapped.length === 0) {
      return queried;
    }

    const merged = new Map<string, StudentProfile>(mapped.map((student) => [student.id, student]));
    for (const student of queried) {
      merged.set(student.id, student);
    }
    return Array.from(merged.values());
  }

  async addStudentForParent(payload: { name: string; grade: string; avatar?: string }): Promise<StudentProfile> {
    const parent = auth.currentUser;
    if (!parent) {
      throw new Error('Parent is not logged in.');
    }

    const loginCode = await this.generateUniqueLoginCode();
    const studentPayload = {
      parentId: parent.uid,
      name: payload.name.trim(),
      grade: payload.grade.trim(),
      avatar: payload.avatar?.trim() || '🧠',
      loginCode,
      masteryMap: {},
      createdAt: serverTimestamp(),
    };

    const studentRef = await addDoc(collection(db, 'students'), studentPayload);
    await updateDoc(doc(db, 'parents', parent.uid), {
      students: arrayUnion(studentRef.id),
    });

    const saved = await this.getStudentProfile(studentRef.id);
    if (!saved) {
      throw new Error('Unable to create student profile.');
    }
    return saved;
  }

  private async ensureParentProfile(user: User): Promise<void> {
    const parentRef = doc(db, 'parents', user.uid);
    const existing = await getDoc(parentRef);
    if (existing.exists()) {
      return;
    }

    await setDoc(parentRef, {
      uid: user.uid,
      email: user.email ?? '',
      createdAt: serverTimestamp(),
      subscriptionStatus: 'free',
      students: [],
    });
  }

  private setStudentId(studentId: string): void {
    if (!this.hasStorage()) {
      return;
    }
    window.localStorage.setItem(this.studentStorageKey, studentId);
  }

  private clearStudentId(): void {
    if (!this.hasStorage()) {
      return;
    }
    window.localStorage.removeItem(this.studentStorageKey);
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private mapParent(id: string, data: Record<string, unknown>): ParentProfile {
    const createdAt = data['createdAt'] as { toDate?: () => Date } | string | undefined;
    return {
      id,
      uid: String(data['uid'] ?? id),
      email: String(data['email'] ?? ''),
      createdAt: typeof createdAt === 'string' ? createdAt : createdAt?.toDate?.().toISOString() ?? null,
      subscriptionStatus: String(data['subscriptionStatus'] ?? 'free'),
      students: Array.isArray(data['students']) ? data['students'].map(String) : [],
    };
  }

  private mapStudent(id: string, data: Record<string, unknown>): StudentProfile {
    const createdAt = data['createdAt'] as { toDate?: () => Date } | string | undefined;
    return {
      id,
      parentId: String(data['parentId'] ?? ''),
      name: String(data['name'] ?? 'Student'),
      grade: String(data['grade'] ?? ''),
      avatar: String(data['avatar'] ?? '🧠'),
      loginCode: String(data['loginCode'] ?? ''),
      masteryMap: (data['masteryMap'] as Record<string, number> | undefined) ?? {},
      createdAt: typeof createdAt === 'string' ? createdAt : createdAt?.toDate?.().toISOString() ?? null,
    };
  }

  private generateLoginCode(): string {
    if (typeof globalThis === 'undefined' || !globalThis.crypto?.getRandomValues) {
      throw new Error('Secure random generator is not available for login code generation.');
    }

    const randomArray = new Uint32Array(1);
    const codeSpace = this.maxStudentCode - this.minStudentCode + 1;
    const maxUnbiased = Math.floor(0x100000000 / codeSpace) * codeSpace;

    let randomValue = 0;
    do {
      globalThis.crypto.getRandomValues(randomArray);
      randomValue = randomArray[0];
    } while (randomValue >= maxUnbiased);

    return String(this.minStudentCode + (randomValue % codeSpace));
  }

  private async generateUniqueLoginCode(maxAttempts = 10): Promise<string> {
    const studentsRef = collection(db, 'students');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = this.generateLoginCode();
      const snapshot = await getDocs(query(studentsRef, where('loginCode', '==', candidate), limit(1)));
      if (snapshot.empty) {
        return candidate;
      }
    }

    throw new Error('Unable to generate a unique login code. Please try again.');
  }

  private async getStudentsByIds(studentIds: string[]): Promise<StudentProfile[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const studentsRef = collection(db, 'students');
    const chunks = this.chunk(studentIds, 30);
    const fetched = new Map<string, StudentProfile>();

    for (const idsChunk of chunks) {
      const snapshot = await getDocs(query(studentsRef, where(documentId(), 'in', idsChunk)));
      for (const studentDoc of snapshot.docs) {
        const student = this.mapStudent(studentDoc.id, studentDoc.data());
        fetched.set(student.id, student);
      }
    }

    return studentIds.flatMap((studentId) => {
      const student = fetched.get(studentId);
      return student ? [student] : [];
    });
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  private async restoreSession(): Promise<User | null> {
    if (!this.redirectHandled) {
      this.redirectHandled = true;
      const redirectResult = await getRedirectResult(auth);
      const redirectUser = redirectResult?.user ?? null;
      if (redirectUser) {
        await this.ensureParentProfile(redirectUser);
        return redirectUser;
      }
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      await this.ensureParentProfile(currentUser);
      return currentUser;
    }

    const restoredUser = await this.waitForRestoredUser();
    if (restoredUser) {
      await this.ensureParentProfile(restoredUser);
    }
    return restoredUser;
  }

  private waitForRestoredUser(): Promise<User | null> {
    return new Promise<User | null>((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let unsubscribe: () => void = () => {};
      const finalize = (user: User | null) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribe();
        resolve(user);
      };

      unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
        if (user) {
          finalize(user);
        }
      });

      timeoutId = setTimeout(() => {
        finalize(auth.currentUser);
      }, this.authStateRestorationTimeoutMs);
    });
  }
}
