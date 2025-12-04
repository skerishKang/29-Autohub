import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase 웹 설정 (Firebase 콘솔 autohub-dev 프로젝트의 autohub-web 앱 구성)
const firebaseConfig = {
  apiKey: "AIzaSyDhwI76-e4WHMoCSPZsUzD2npHbnLCqnX4",
  authDomain: "autohub-dev.firebaseapp.com",
  projectId: "autohub-dev",
  storageBucket: "autohub-dev.firebasestorage.app",
  messagingSenderId: "595518888404",
  appId: "1:595518888404:web:4add5ec9c3348bc7da5e41",
  measurementId: "G-TE884G6ZTX",
} as const;

// 클라이언트 환경에서 Firebase 앱 초기화 (중복 초기화 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
