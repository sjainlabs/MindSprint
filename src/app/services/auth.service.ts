import { Injectable } from '@angular/core';
import {
  User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
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

  async loginWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    await this.ensureParentProfile(result.user);
    return result.user;
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

    const studentsByIds = await Promise.all(parentProfile.students.map((id) => this.getStudentProfile(id)));
    const mapped = studentsByIds.filter((student): student is StudentProfile => !!student);
    if (mapped.length > 0 || parentProfile.students.length > 0) {
      return mapped;
    }

    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(query(studentsRef, where('parentId', '==', parentProfile.id)));
    return snapshot.docs.map((studentDoc) => this.mapStudent(studentDoc.id, studentDoc.data()));
  }

  async addStudentForParent(payload: { name: string; grade: string; avatar?: string }): Promise<StudentProfile> {
    const parent = auth.currentUser;
    if (!parent) {
      throw new Error('Parent is not logged in.');
    }

    const studentPayload = {
      parentId: parent.uid,
      name: payload.name.trim(),
      grade: payload.grade.trim(),
      avatar: payload.avatar?.trim() || '🧠',
      loginCode: this.generateLoginCode(),
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
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
