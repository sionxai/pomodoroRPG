/**
 * Firebase 통합 모듈
 * - Firebase App 초기화
 * - Google 로그인/로그아웃
 * - Firestore 동기화 (user, quests, sessions, dailyLogs)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    writeBatch,
    query,
    limit,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// ─── Firebase Config ───
const firebaseConfig = {
    projectId: "gen-lang-client-0233715929",
    appId: "1:996224847630:web:9011173993fdc30c33515f",
    storageBucket: "gen-lang-client-0233715929.firebasestorage.app",
    apiKey: "AIzaSyBnHR1MJvMcRUvEORlX0WEm05f7oV8xidw",
    authDomain: "gen-lang-client-0233715929.firebaseapp.com",
    messagingSenderId: "996224847630",
    measurementId: "G-JGSTQHCCZP",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ─── Auth ───
export function getCurrentUser() {
    return auth.currentUser;
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google 로그인 실패:", error);
        throw error;
    }
}

export async function logOut() {
    await signOut(auth);
}

// ─── Firestore CRUD ───

/**
 * 사용자 프로필 문서 저장
 * /users/{uid}
 */
export async function saveUserProfile(uid, userData) {
    try {
        const ref = doc(db, "users", uid);
        await setDoc(ref, {
            ...userData,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    } catch (error) {
        console.error("프로필 저장 실패:", error);
    }
}

/**
 * 사용자 프로필 문서 로드
 */
export async function loadUserProfile(uid) {
    try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error("프로필 로드 실패:", error);
        return null;
    }
}

/**
 * 퀘스트 목록 일괄 저장
 * /users/{uid}/quests/{questId}
 */
export async function saveQuests(uid, quests) {
    try {
        const batch = writeBatch(db);
        for (const quest of quests) {
            const ref = doc(db, "users", uid, "quests", quest.id);
            batch.set(ref, quest);
        }
        await batch.commit();
    } catch (error) {
        console.error("퀘스트 저장 실패:", error);
    }
}

/**
 * 퀘스트 목록 로드
 */
export async function loadQuests(uid) {
    try {
        const ref = collection(db, "users", uid, "quests");
        const snap = await getDocs(query(ref, limit(100)));
        return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
        console.error("퀘스트 로드 실패:", error);
        return [];
    }
}

/**
 * 세션 기록 저장 (개별)
 * /users/{uid}/sessions/{sessionId}
 */
export async function saveSession(uid, session) {
    try {
        const ref = doc(db, "users", uid, "sessions", session.id);
        await setDoc(ref, session);
    } catch (error) {
        console.error("세션 저장 실패:", error);
    }
}

/**
 * 세션 기록 일괄 저장
 */
export async function saveSessions(uid, sessions) {
    try {
        const batch = writeBatch(db);
        for (const session of sessions) {
            const ref = doc(db, "users", uid, "sessions", session.id);
            batch.set(ref, session);
        }
        await batch.commit();
    } catch (error) {
        console.error("세션 일괄 저장 실패:", error);
    }
}

/**
 * 세션 기록 로드
 */
export async function loadSessions(uid) {
    try {
        const ref = collection(db, "users", uid, "sessions");
        const snap = await getDocs(query(ref, limit(100)));
        return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
        console.error("세션 로드 실패:", error);
        return [];
    }
}

/**
 * 일일 로그 저장 (개별)
 * /users/{uid}/dailyLogs/{date}
 */
export async function saveDailyLog(uid, date, logData) {
    try {
        const ref = doc(db, "users", uid, "dailyLogs", date);
        await setDoc(ref, logData, { merge: true });
    } catch (error) {
        console.error("일일 로그 저장 실패:", error);
    }
}

/**
 * 일일 로그 전체 로드
 */
export async function loadDailyLogs(uid) {
    try {
        const ref = collection(db, "users", uid, "dailyLogs");
        const snap = await getDocs(query(ref, limit(100)));
        const logs = {};
        snap.docs.forEach(d => {
            logs[d.id] = d.data();
        });
        return logs;
    } catch (error) {
        console.error("일일 로그 로드 실패:", error);
        return {};
    }
}

/**
 * 전체 데이터 한번에 Firestore에서 로드
 */
export async function loadAllData(uid) {
    const [user, quests, sessions, dailyLogs] = await Promise.all([
        loadUserProfile(uid),
        loadQuests(uid),
        loadSessions(uid),
        loadDailyLogs(uid),
    ]);
    return { user, quests, sessions, dailyLogs };
}

/**
 * 전체 데이터 한번에 Firestore에 저장
 */
export async function saveAllData(uid, data) {
    await Promise.all([
        saveUserProfile(uid, data.user),
        saveQuests(uid, data.quests),
        saveSessions(uid, data.sessions),
        ...Object.entries(data.dailyLogs).map(([date, log]) =>
            saveDailyLog(uid, date, log)
        ),
    ]);
}
