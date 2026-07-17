// Firebase 專案初始化：Firestore 作為多人共用資料庫，即時同步設備/分類/紀錄/人員名冊
// 安全規則要求必須是已登入的 Firebase 使用者（含匿名登入），詳見 firestore.rules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiqLMuB1XETnhNv-w5lNSNtu4qC1Vmw54",
  authDomain: "reyi-equipment.firebaseapp.com",
  projectId: "reyi-equipment",
  storageBucket: "reyi-equipment.firebasestorage.app",
  messagingSenderId: "579617796148",
  appId: "1:579617796148:web:fead7831bbe139ff6ada61",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseApp = app;

// 供一般 <script>（非 module）程式碼透過 window.fb 呼叫 Firestore API
window.fb = { db, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocs };

// 匿名登入：Firestore 安全規則要求 request.auth != null，登入完成前不可讀寫
window.firebaseReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resolve(user);
    } else {
      signInAnonymously(auth).catch((err) => {
        console.error("Firebase 匿名登入失敗", err);
      });
    }
  });
});
