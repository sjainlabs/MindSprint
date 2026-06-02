import { Injectable } from '@angular/core';
import {
  AuthError,
  User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
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
import { auth, authPersistenceReady, db, googleProvider } from '../firebase/firebase.config';

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
  private readonly parentProfilesStorageKey = 'parentProfiles';
  private readonly studentProfilesStorageKey = 'studentProfiles';
  private readonly parentRedirectPendingStorageKey = 'parent-google-redirect-pending';
  private readonly parentRedirectPendingMaxAgeMs = 10 * 60 * 1000;
  private readonly minStudentCode = 100000;
  private readonly maxStudentCode = 999999;

  private sessionRestorePromise: Promise<User | null> | null = null;
  private cachedUser: User | null = null;

  // -------------------------------------------------------
  // GOOGLE LOGIN (REDIRECT)
  // -------------------------------------------------------

  async startGoogleRedirectLogin(): Promise<void> {
    console.log('[Auth] Starting Google redirect login...');
    await authPersistenceReady;
    this.setParentRedirectPending();
    await signInWithRedirect(auth, googleProvider);
  }

  async loginParentWithGoogle(): Promise<User | null> {
    await authPersistenceReady;

    try {
      console.log('[Auth] Trying Google popup sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user) {
        return null;
      }

      await this.ensureParentProfile(result.user);
      this.cachedUser = result.user;
      this.clearParentRedirectPending();
      return result.user;
    } catch (error) {
      if (!this.isPopupBlockedError(error)) {
        throw error;
      }

      console.warn('[Auth] Popup blocked. Falling back to redirect sign-in.');
      this.setParentRedirectPending();
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
  }

  async handleRedirectLogin(): Promise<User | null> {
    console.log('[Auth] handleRedirectLogin called');

    // If we have a cached user, return it
    if (this.cachedUser) {
      console.log('[Auth] Returning cached user:', this.cachedUser.email);
      return this.cachedUser;
    }

    if (this.sessionRestorePromise) {
      console.log('[Auth] Session restore already in progress, waiting for existing promise...');
      return this.sessionRestorePromise;
    }

    this.sessionRestorePromise = this.restoreParentSession();

    try {
      return await this.sessionRestorePromise;
    } finally {
      this.sessionRestorePromise = null;
    }
  }


  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  async logout(): Promise<void> {
    this.cachedUser = null;
    this.clearParentRedirectPending();
    await signOut(auth);
  }

  // -------------------------------------------------------
  // AUTH STATE HELPERS
  // -------------------------------------------------------

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  onAuthStateChanged(nextOrObserver: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, (user) => {
      this.cachedUser = user;
      if (user) {
        this.clearParentRedirectPending();
      }
      nextOrObserver(user);
    });
  }

  isParentLoggedIn(): boolean {
    return !!(this.cachedUser ?? auth.currentUser);
  }

  shouldRedirectParentFromLogin(): boolean {
    return this.isParentLoggedIn();
  }

  shouldAttemptParentSessionRestore(): boolean {
    return this.isParentRedirectPending() || !!auth.currentUser;
  }

  isParentRedirectPending(): boolean {
    if (!this.hasSessionStorage()) {
      return false;
    }

    const raw = window.sessionStorage.getItem(this.parentRedirectPendingStorageKey);
    if (!raw) {
      return false;
    }

    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) {
      this.clearParentRedirectPending();
      return false;
    }

    const isFresh = Date.now() - timestamp <= this.parentRedirectPendingMaxAgeMs;
    if (!isFresh) {
      console.log('[Auth] Redirect pending flag expired, clearing stale state');
      this.clearParentRedirectPending();
    }

    return isFresh;
  }

  isStudentLoggedIn(): boolean {
    return !!this.getStoredStudentId();
  }

  // -------------------------------------------------------
  // STUDENT LOGIN WITH CODE
  // -------------------------------------------------------

  async loginStudentWithCode(code: string): Promise<StudentProfile> {
    const loginCode = code.trim();
    if (!/^\d{6}$/.test(loginCode)) {
      throw new Error('Please enter a valid 6-digit code.');
    }

    try {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(query(studentsRef, where('loginCode', '==', loginCode), limit(1)));
      if (snapshot.empty) {
        throw new Error('Invalid student login code.');
      }

      const studentDoc = snapshot.docs[0];
      const student = this.mapStudent(studentDoc.id, studentDoc.data());
      this.setStudentId(student.id);
      return student;
    } catch (error) {
      console.warn('[Auth] Falling back to local student login lookup:', error);
      const student = this.getLocalStudents().find((entry) => entry.loginCode === loginCode) ?? null;
      if (!student) {
        throw new Error('Invalid student login code.');
      }
      this.setStudentId(student.id);
      return student;
    }
  }

  logoutStudent(): void {
    this.clearStudentId();
  }

  // -------------------------------------------------------
  // LOCAL STORAGE
  // -------------------------------------------------------

  private setStudentId(studentId: string): void {
    if (!this.hasStorage()) return;
    window.localStorage.setItem(this.studentStorageKey, studentId);
  }

  private clearStudentId(): void {
    if (!this.hasStorage()) return;
    window.localStorage.removeItem(this.studentStorageKey);
  }

  getStoredStudentId(): string | null {
    return this.hasStorage() ? window.localStorage.getItem(this.studentStorageKey) : null;
  }

  setActiveStudentId(studentId: string): void {
    const normalized = studentId.trim();
    if (!normalized) {
      this.clearStudentId();
      return;
    }

    this.setStudentId(normalized);
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  // -------------------------------------------------------
  // PARENT PROFILE
  // -------------------------------------------------------

  async getParentProfile(parentId?: string): Promise<ParentProfile | null> {
    const uid = parentId ?? auth.currentUser?.uid;
    console.log('[Auth] getParentProfile called - uid:', uid, 'currentUser:', auth.currentUser?.email);
    if (!uid) {
      console.warn('[Auth] No UID available, returning null');
      return null;
    }

    // Try up to 3 times with backoff if parent not found (in case Firestore is syncing)
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log('[Auth] Firestore query for parent:', uid, 'attempt:', attempt + 1);
        const parentDoc = await getDoc(doc(db, 'parents', uid));
        console.log('[Auth] Firestore query for parent:', uid, 'exists:', parentDoc.exists());

        if (parentDoc.exists()) {
          return this.mapParent(parentDoc.id, parentDoc.data());
        }

        // If not found and not last attempt, wait and retry
        if (attempt < maxRetries - 1) {
          console.log('[Auth] Parent profile not found, retrying in 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Last attempt, try local fallback
        console.warn('[Auth] Parent document does not exist after retries:', uid);
        return this.getLocalParent(uid);
      } catch (error) {
        console.error('[Auth] Error fetching parent profile (attempt', attempt + 1 + '):', error);

        // If this is the last attempt, try local fallback
        if (attempt === maxRetries - 1) {
          const localParent = this.getLocalParent(uid);
          if (localParent) {
            console.warn('[Auth] Using local parent profile fallback');
            return localParent;
          }

          // If offline, return null gracefully (will retry on next load)
          if (error instanceof Error && error.message.includes('offline')) {
            console.warn('[Auth] Offline - returning null. Will retry when online.');
            return null;
          }
          throw error;
        }

        // Not last attempt, wait and retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return null;
  }

  private async ensureParentProfile(user: User): Promise<void> {
    console.log('[Auth] Ensuring parent profile for user:', user.email, user.uid);
    this.ensureLocalParentProfile(user);
    const parentRef = doc(db, 'parents', user.uid);
    try {
      console.log('[Auth] Checking if parent profile exists in Firestore...');
      const existing = await getDoc(parentRef);
      console.log('[Auth] Firestore check completed, exists:', existing.exists());

      if (existing.exists()) {
        console.log('[Auth] Parent profile already exists');
        return;
      }

      console.log('[Auth] Creating new parent profile...');
      await setDoc(parentRef, {
        uid: user.uid,
        email: user.email ?? '',
        createdAt: serverTimestamp(),
        subscriptionStatus: 'free',
        students: [],
      });
      console.log('[Auth] Parent profile created successfully');

      // Wait a brief moment for Firestore to sync
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('[Auth] Error ensuring parent profile:', error);
      // If offline, don't throw - Firebase will sync when online
      if (error instanceof Error && error.message.includes('offline')) {
        console.warn('[Auth] Offline - profile creation will sync when online');
        return;
      }
      console.warn('[Auth] Continuing with local parent profile fallback');
    }
  }

  // -------------------------------------------------------
  // STUDENT PROFILE
  // -------------------------------------------------------

  async getStudentProfile(studentId: string): Promise<StudentProfile | null> {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (!studentDoc.exists()) {
        return this.getLocalStudent(studentId);
      }

      return this.mapStudent(studentDoc.id, studentDoc.data());
    } catch (error) {
      console.warn('[Auth] Using local student profile fallback:', error);
      return this.getLocalStudent(studentId);
    }
  }

  async getStudentsForParent(parentId?: string): Promise<StudentProfile[]> {
    const parentProfile = await this.getParentProfile(parentId);
    if (!parentProfile) return [];

    try {
      const mapped = await this.getStudentsByIds(parentProfile.students);
      if (parentProfile.students.length > 0 && mapped.length === parentProfile.students.length) {
        return mapped;
      }

      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(query(studentsRef, where('parentId', '==', parentProfile.id)));
      const queried = snapshot.docs.map((studentDoc) => this.mapStudent(studentDoc.id, studentDoc.data()));

      if (mapped.length === 0) return queried;

      const merged = new Map<string, StudentProfile>(mapped.map((s) => [s.id, s]));
      for (const s of queried) merged.set(s.id, s);

      return Array.from(merged.values());
    } catch (error) {
      console.warn('[Auth] Using local students fallback:', error);
      return this.getLocalStudents().filter((student) => student.parentId === parentProfile.id);
    }
  }

  async addStudentForParent(payload: { name: string; grade: string; avatar?: string }): Promise<StudentProfile> {
    const parent = auth.currentUser;
    if (!parent) throw new Error('Parent is not logged in.');

    const loginCode = await this.generateUniqueLoginCode();
    const localStudent: StudentProfile = {
      id: this.generateLocalId(),
      parentId: parent.uid,
      name: payload.name.trim(),
      grade: payload.grade.trim(),
      avatar: payload.avatar?.trim() || '🧠',
      loginCode,
      masteryMap: {},
      createdAt: new Date().toISOString(),
    };

    this.saveLocalStudent(localStudent);
    this.addStudentIdToLocalParent(parent.uid, localStudent.id);

    try {
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
      if (!saved) throw new Error('Unable to create student profile.');

      this.removeLocalStudent(localStudent.id);
      this.removeStudentIdFromLocalParent(parent.uid, localStudent.id);
      this.saveLocalStudent(saved);
      this.addStudentIdToLocalParent(parent.uid, saved.id);
      return saved;
    } catch (error) {
      console.warn('[Auth] Falling back to local student creation:', error);
      return localStudent;
    }
  }

  async updateStudentForParent(
    studentId: string,
    payload: { name: string; grade: string; avatar?: string },
  ): Promise<StudentProfile> {
    const parent = auth.currentUser;
    if (!parent) throw new Error('Parent is not logged in.');

    const existing = await this.getStudentProfile(studentId);
    if (!existing || existing.parentId !== parent.uid) {
      throw new Error('Student not found for this parent.');
    }

    const updatedLocal: StudentProfile = {
      ...existing,
      name: payload.name.trim(),
      grade: payload.grade.trim(),
      avatar: payload.avatar?.trim() || '🧠',
    };
    this.saveLocalStudent(updatedLocal);

    try {
      await updateDoc(doc(db, 'students', studentId), {
        name: updatedLocal.name,
        grade: updatedLocal.grade,
        avatar: updatedLocal.avatar,
      });

      const refreshed = await this.getStudentProfile(studentId);
      if (refreshed) {
        this.saveLocalStudent(refreshed);
        return refreshed;
      }
      return updatedLocal;
    } catch (error) {
      console.warn('[Auth] Falling back to local student update:', error);
      return updatedLocal;
    }
  }

  async deleteStudentForParent(studentId: string): Promise<void> {
    const parent = auth.currentUser;
    if (!parent) throw new Error('Parent is not logged in.');

    this.removeLocalStudent(studentId);
    this.removeStudentIdFromLocalParent(parent.uid, studentId);

    try {
      await deleteDoc(doc(db, 'students', studentId));
      await updateDoc(doc(db, 'parents', parent.uid), {
        students: arrayRemove(studentId),
      });
    } catch (error) {
      console.warn('[Auth] Falling back to local student deletion:', error);
    }
  }

  // -------------------------------------------------------
  // MAPPING HELPERS
  // -------------------------------------------------------

  private mapParent(id: string, data: Record<string, unknown>): ParentProfile {
    const createdAt = data['createdAt'] as any;
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
    const createdAt = data['createdAt'] as any;
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

  // -------------------------------------------------------
  // LOGIN CODE GENERATION
  // -------------------------------------------------------

  private generateLoginCode(): string {
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
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = this.generateLoginCode();
      const existsLocally = this.getLocalStudents().some((student) => student.loginCode === candidate);
      if (existsLocally) {
        continue;
      }

      try {
        const studentsRef = collection(db, 'students');
        const snapshot = await getDocs(query(studentsRef, where('loginCode', '==', candidate), limit(1)));
        if (snapshot.empty) return candidate;
      } catch {
        return candidate;
      }
    }

    throw new Error('Unable to generate a unique login code. Please try again.');
  }

  private async getStudentsByIds(studentIds: string[]): Promise<StudentProfile[]> {
    if (studentIds.length === 0) return [];

    try {
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

      return studentIds.flatMap((id) => fetched.get(id) ? [fetched.get(id)!] : []);
    } catch (error) {
      console.warn('[Auth] Using local getStudentsByIds fallback:', error);
      const localStudents = new Map(this.getLocalStudents().map((student) => [student.id, student] as const));
      return studentIds.flatMap((id) => localStudents.get(id) ? [localStudents.get(id)!] : []);
    }
  }

  private getLocalParent(parentId: string): ParentProfile | null {
    return this.readJsonRecord<ParentProfile>(this.parentProfilesStorageKey)[parentId] ?? null;
  }

  private ensureLocalParentProfile(user: User): ParentProfile {
    const parents = this.readJsonRecord<ParentProfile>(this.parentProfilesStorageKey);
    const existing = parents[user.uid];
    if (existing) {
      return existing;
    }

    const created: ParentProfile = {
      id: user.uid,
      uid: user.uid,
      email: user.email ?? '',
      createdAt: new Date().toISOString(),
      subscriptionStatus: 'free',
      students: [],
    };
    parents[user.uid] = created;
    this.writeJsonRecord(this.parentProfilesStorageKey, parents);
    return created;
  }

  private addStudentIdToLocalParent(parentId: string, studentId: string): void {
    const parents = this.readJsonRecord<ParentProfile>(this.parentProfilesStorageKey);
    const parent = parents[parentId] ?? {
      id: parentId,
      uid: parentId,
      email: auth.currentUser?.email ?? '',
      createdAt: new Date().toISOString(),
      subscriptionStatus: 'free',
      students: [],
    };
    if (!parent.students.includes(studentId)) {
      parent.students = [...parent.students, studentId];
    }
    parents[parentId] = parent;
    this.writeJsonRecord(this.parentProfilesStorageKey, parents);
  }

  private removeStudentIdFromLocalParent(parentId: string, studentId: string): void {
    const parents = this.readJsonRecord<ParentProfile>(this.parentProfilesStorageKey);
    const parent = parents[parentId];
    if (!parent) {
      return;
    }
    parent.students = parent.students.filter((id) => id !== studentId);
    parents[parentId] = parent;
    this.writeJsonRecord(this.parentProfilesStorageKey, parents);
  }

  private getLocalStudent(studentId: string): StudentProfile | null {
    return this.readJsonRecord<StudentProfile>(this.studentProfilesStorageKey)[studentId] ?? null;
  }

  private getLocalStudents(): StudentProfile[] {
    return Object.values(this.readJsonRecord<StudentProfile>(this.studentProfilesStorageKey));
  }

  private saveLocalStudent(student: StudentProfile): void {
    const students = this.readJsonRecord<StudentProfile>(this.studentProfilesStorageKey);
    students[student.id] = student;
    this.writeJsonRecord(this.studentProfilesStorageKey, students);
  }

  private removeLocalStudent(studentId: string): void {
    const students = this.readJsonRecord<StudentProfile>(this.studentProfilesStorageKey);
    delete students[studentId];
    this.writeJsonRecord(this.studentProfilesStorageKey, students);
  }

  private readJsonRecord<T>(key: string): Record<string, T> {
    if (!this.hasStorage()) {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, T>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeJsonRecord<T>(key: string, value: Record<string, T>): void {
    if (!this.hasStorage()) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  private generateLocalId(): string {
    if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  private async waitForFirebaseInit(): Promise<void> {
    await authPersistenceReady;
    console.log('[Auth] Setting up Firebase init listener...');

    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
      console.log('[Auth] authStateReady resolved');
      return;
    }

    return new Promise<void>((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout>;

      const unsub = auth.onAuthStateChanged((user) => {
        console.log('[Auth] Initial auth state received:', user?.email ?? 'no user');
        clearTimeout(timeoutId);
        unsub();
        resolve();
      });

      // Timeout safety net - resolve after 8 seconds anyway
      timeoutId = setTimeout(() => {
        console.log('[Auth] Firebase init timeout reached');
        unsub();
        resolve();
      }, 8000);
    });
  }

  private async restoreParentSession(): Promise<User | null> {
    try {
      console.log('[Auth] Waiting for Firebase auth initialization...');
      await this.waitForFirebaseInit();
      console.log('[Auth] Firebase auth initialized');

      if (auth.currentUser) {
        console.log('[Auth] User already signed in:', auth.currentUser.email);
        await this.ensureParentProfile(auth.currentUser);
        this.cachedUser = auth.currentUser;
        this.clearParentRedirectPending();
        return auth.currentUser;
      }

      const redirectWasExpected = this.isParentRedirectPending();
      if (!redirectWasExpected) {
        console.log('[Auth] No redirect pending and no current user');
        return null;
      }

      // Redirect restore can complete through auth state without a redirect result payload.
      const restoredUser = await this.waitForSignedInUser(12000);
      if (restoredUser) {
        console.log('[Auth] User restored from auth state after redirect:', restoredUser.email);
        await this.ensureParentProfile(restoredUser);
        this.cachedUser = restoredUser;
        this.clearParentRedirectPending();
        return restoredUser;
      }

      // Fallback probe for diagnosability if auth state did not produce a user.
      try {
        console.log('[Auth] Checking redirect result fallback...');
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('[Auth] Redirect result found via fallback, user:', result.user.email);
          await this.ensureParentProfile(result.user);
          this.cachedUser = result.user;
          this.clearParentRedirectPending();
          return result.user;
        }
        console.log('[Auth] No redirect result returned in fallback probe');
      } catch (redirectErr) {
        console.warn('[Auth] getRedirectResult fallback failed:', redirectErr);
      }

      console.log('[Auth] No user found after redirect restoration attempt');
      this.clearParentRedirectPending();
      return null;
    } catch (error) {
      console.error('[Auth] handleRedirectLogin failed:', error);
      this.clearParentRedirectPending();
      return null;
    }
  }

  private waitForSignedInUser(timeoutMs: number): Promise<User | null> {
    if (auth.currentUser) {
      return Promise.resolve(auth.currentUser);
    }

    return new Promise<User | null>((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser);
      }, timeoutMs);

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          return;
        }

        clearTimeout(timeoutId);
        unsubscribe();
        resolve(user);
      });
    });
  }

  private setParentRedirectPending(): void {
    if (!this.hasSessionStorage()) {
      return;
    }

    window.sessionStorage.setItem(this.parentRedirectPendingStorageKey, String(Date.now()));
  }

  private clearParentRedirectPending(): void {
    if (!this.hasSessionStorage()) {
      return;
    }

    window.sessionStorage.removeItem(this.parentRedirectPendingStorageKey);
  }

  private hasSessionStorage(): boolean {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  }

  private isPopupBlockedError(error: unknown): boolean {
    const code = (error as Partial<AuthError> | null)?.code;
    return code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported';
  }



}
