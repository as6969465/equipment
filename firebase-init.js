// Firebase 專案初始化：Firestore 作為多人共用資料庫，即時同步設備/分類/紀錄/人員名冊
// 安全規則要求必須是已登入的 Firebase 使用者（含匿名登入），詳見 firestore.rules
//
// 帳號密碼由人員自行申請時，密碼一律交給 Firebase Authentication 管理
// （雲端加密雜湊儲存，任何人都讀不到），Firestore 只存審核狀態與基本資料，
// 絕對不存密碼本身。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
  getDoc,
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

// 供一般 <script>（非 module）程式碼透過 window.fb 呼叫 Firestore / Auth API
window.fb = {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
};

// 自行申請帳號的登入識別碼要求為 email 格式，這裡統一用固定的假網域包裝「帳號」字串，
// 使用者介面上完全不會出現這個假 email，只用來滿足 Firebase Auth 的格式要求。
window.accountToAuthEmail = (account) => `${account}@reyi-equipment.local`;

// 匿名登入：Firestore 安全規則要求 request.auth != null，登入完成前不可讀寫。
// 若使用者是透過自行申請的帳密登入（Firebase Auth email/password），
// 則會由該次登入取代匿名身分，此處不會重複觸發。
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
