import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase 웹 설정 (Firebase 콘솔에서 제공된 구성 값 사용)
const firebaseConfig = {
  apiKey: "AIzaSyAOylHow4Bg8fk0O2FbiHcxA8wq6OPkRmo",
  authDomain: "grantscout-af8da.firebaseapp.com",
  projectId: "grantscout-af8da",
  storageBucket: "grantscout-af8da.firebasestorage.app",
  messagingSenderId: "790627865650",
  appId: "1:790627865650:web:5fd14b09a61565bc8b582b",
  measurementId: "G-CLWW6049WC",
} as const;

// 클라이언트 환경에서 Firebase 앱 초기화 (중복 초기화 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
