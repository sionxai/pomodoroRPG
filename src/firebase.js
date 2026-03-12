/**
 * Firebase 통합 모듈
 * - 웹/Capacitor 공용 Firebase App 초기화
 * - Google / Apple 로그인 브리지
 * - Firestore 동기화 (user, quests, sessions, dailyLogs)
 */

import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";

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
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

let redirectResultPromise = null;

function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

function isNativeIosApp() {
  return isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function shouldUseRedirectFlow() {
  if (isNativePlatform()) {
    return false;
  }

  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrowViewport = window.matchMedia?.("(max-width: 980px)").matches ?? false;
  const touchPoints = navigator.maxTouchPoints || 0;

  return coarsePointer || (touchPoints > 1 && narrowViewport);
}

function buildGoogleCredential(nativeResult) {
  const credential = nativeResult?.credential ?? {};
  if (!credential.idToken && !credential.accessToken) {
    throw new Error("Google 로그인 자격 증명을 받지 못했습니다.");
  }
  return GoogleAuthProvider.credential(
    credential.idToken ?? null,
    credential.accessToken ?? null
  );
}

function buildAppleCredential(nativeResult) {
  const credential = nativeResult?.credential ?? {};
  if (!credential.idToken) {
    throw new Error("Apple 로그인 ID 토큰을 받지 못했습니다.");
  }
  return appleProvider.credential({
    idToken: credential.idToken,
    rawNonce: credential.nonce ?? undefined,
  });
}

async function completeSignInWithCredential(credential) {
  const result = await signInWithCredential(auth, credential);
  return { status: "success", user: result.user };
}

export async function prepareAuth() {
  if (isNativePlatform()) {
    return null;
  }

  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((error) => {
      console.error("Firebase 리디렉션 로그인 복구 실패:", error);
      throw error;
    });
  }

  return redirectResultPromise;
}

export function getCloudAuthUiModel() {
  if (isNativeIosApp()) {
    return {
      providers: [
        {
          action: "firebase-login-apple",
          className: "primary-button",
          label: " Apple 로그인",
        },
      ],
      loggedInBody: "Apple 계정으로 로그인 중입니다. 진행 상황이 클라우드에 자동 저장됩니다.",
      loggedOutBody:
        "iPhone/iPad 앱에서는 Apple 계정으로 로그인해 진행 상황을 동기화할 수 있습니다. Google 로그인은 iOS용 Firebase 설정을 추가한 뒤 활성화하세요.",
    };
  }

  return {
    providers: [
      {
        action: "firebase-login-google",
        className: "primary-button",
        label: "🔑 Google 로그인",
      },
    ],
    loggedInBody: "Google 계정으로 로그인 중입니다. 진행 상황이 클라우드에 자동 저장됩니다.",
    loggedOutBody: "Google 계정으로 로그인하면 기기 간 진행 상황을 동기화할 수 있습니다.",
  };
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    if (isNativePlatform()) {
      const nativeResult = await FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
      });
      return await completeSignInWithCredential(buildGoogleCredential(nativeResult));
    }

    if (shouldUseRedirectFlow()) {
      await signInWithRedirect(auth, googleProvider);
      return { status: "redirect" };
    }

    const result = await signInWithPopup(auth, googleProvider);
    return { status: "success", user: result.user };
  } catch (error) {
    console.error("Google 로그인 실패:", error);
    throw error;
  }
}

export async function signInWithApple() {
  try {
    if (isNativePlatform()) {
      const nativeResult = await FirebaseAuthentication.signInWithApple({
        skipNativeAuth: true,
      });
      return await completeSignInWithCredential(buildAppleCredential(nativeResult));
    }

    if (shouldUseRedirectFlow()) {
      await signInWithRedirect(auth, appleProvider);
      return { status: "redirect" };
    }

    const result = await signInWithPopup(auth, appleProvider);
    return { status: "success", user: result.user };
  } catch (error) {
    console.error("Apple 로그인 실패:", error);
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
  if (!isNativePlatform()) {
    return;
  }

  try {
    await FirebaseAuthentication.signOut();
  } catch (error) {
    console.warn("네이티브 인증 세션 정리 실패:", error);
  }
}

export async function saveUserProfile(uid, userData) {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(
      ref,
      {
        ...userData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("프로필 저장 실패:", error);
  }
}

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

export async function loadQuests(uid) {
  try {
    const ref = collection(db, "users", uid, "quests");
    const snap = await getDocs(query(ref, limit(100)));
    return snap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  } catch (error) {
    console.error("퀘스트 로드 실패:", error);
    return [];
  }
}

export async function saveSession(uid, session) {
  try {
    const ref = doc(db, "users", uid, "sessions", session.id);
    await setDoc(ref, session);
  } catch (error) {
    console.error("세션 저장 실패:", error);
  }
}

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

export async function loadSessions(uid) {
  try {
    const ref = collection(db, "users", uid, "sessions");
    const snap = await getDocs(query(ref, limit(100)));
    return snap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  } catch (error) {
    console.error("세션 로드 실패:", error);
    return [];
  }
}

export async function saveDailyLog(uid, date, logData) {
  try {
    const ref = doc(db, "users", uid, "dailyLogs", date);
    await setDoc(ref, logData, { merge: true });
  } catch (error) {
    console.error("일일 로그 저장 실패:", error);
  }
}

export async function loadDailyLogs(uid) {
  try {
    const ref = collection(db, "users", uid, "dailyLogs");
    const snap = await getDocs(query(ref, limit(100)));
    const logs = {};
    snap.docs.forEach((entry) => {
      logs[entry.id] = entry.data();
    });
    return logs;
  } catch (error) {
    console.error("일일 로그 로드 실패:", error);
    return {};
  }
}

export async function loadAllData(uid) {
  const [user, quests, sessions, dailyLogs] = await Promise.all([
    loadUserProfile(uid),
    loadQuests(uid),
    loadSessions(uid),
    loadDailyLogs(uid),
  ]);
  return { user, quests, sessions, dailyLogs };
}

export async function saveAllData(uid, data) {
  await Promise.all([
    saveUserProfile(uid, data.user),
    saveQuests(uid, data.quests),
    saveSessions(uid, data.sessions),
    ...Object.entries(data.dailyLogs).map(([date, log]) => saveDailyLog(uid, date, log)),
  ]);
}
