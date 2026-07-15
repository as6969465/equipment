// Firebase 專案初始化（僅註冊 App，目前僅使用 Firebase Hosting，尚未串接 Firestore/Auth 等服務）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiqLMuB1XETnhNv-w5lNSNtu4qC1Vmw54",
  authDomain: "reyi-equipment.firebaseapp.com",
  projectId: "reyi-equipment",
  storageBucket: "reyi-equipment.firebasestorage.app",
  messagingSenderId: "579617796148",
  appId: "1:579617796148:web:fead7831bbe139ff6ada61",
};

window.firebaseApp = initializeApp(firebaseConfig);
