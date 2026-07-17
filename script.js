// ===================== 登入頁面邏輯 (index.html) =====================
// 帳號驗證串接：日翊 FME CheckUserId API
// 正式機端點：https://eip.fme.com.tw/FMEIP/AasApi/CheckUserId

const FME_AUTH_ENDPOINT = "https://eip.fme.com.tw/FMEIP/AasApi/CheckUserId";

const FME_ERROR_MESSAGES = {
  "100": "帳號或密碼錯誤",
  "200": "AD 認證錯誤",
  "998": "系統暫時無法使用，請稍後再試",
  "999": "系統發生錯誤，請聯絡管理員",
  "PENDING": "帳號審核中，請等待管理員核准後再登入",
  "REJECTED": "帳號申請未通過，請聯絡管理員",
};

// TODO: IT 工程師請在此串接正式後端登入 API（正式環境請移除下方 DEMO_USERS 示範帳號機制）
const DEMO_USERS = [
  { USER_ID: "demo", PSW: "demo123", NAME: "示範人員", ROLE: "staff" },
  { USER_ID: "reyi", PSW: "8963", NAME: "系統管理員", ROLE: "admin" },
];

async function callCheckUserId(userId, password) {
  const response = await fetch(FME_AUTH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ USER_ID: userId, PSW: password }),
  });
  const data = await response.json();
  const code = String(data.MSG || "").split(" ")[0];
  return code;
}

// TODO: IT 工程師請在正式環境移除此示範登入邏輯，僅保留 callCheckUserId()
function demoLoginFallback(userId, password) {
  const user = DEMO_USERS.find((u) => u.USER_ID === userId && u.PSW === password);
  return user ? { code: "000", user } : { code: "100", user: null };
}

// firebase-init.js 以 type="module" 載入（瀏覽器會延後執行），本檔案為一般
// script 會先執行，故 window.fb 可能尚未就緒，這裡改為輪詢等待。
function waitForFb() {
  return new Promise((resolve) => {
    (function check() {
      if (window.fb) resolve();
      else setTimeout(check, 30);
    })();
  });
}

// 檢查是否為人員自行申請的帳號（存於 Firestore staff 集合，密碼交由 Firebase
// Authentication 驗證，Firestore 只存審核狀態）。回傳 null 代表不是此類帳號，
// 應繼續走示範帳號 / 正式 FME API 驗證流程。
async function trySelfRegisteredLogin(userId, password) {
  await waitForFb();
  const { db, doc, getDoc, auth, signInWithEmailAndPassword } = window.fb;

  const profileSnap = await getDoc(doc(db, "staff", userId));
  if (!profileSnap.exists() || !profileSnap.data().selfRegistered) {
    return null; // 不是自行申請的帳號
  }
  const profile = profileSnap.data();

  try {
    await signInWithEmailAndPassword(auth, window.accountToAuthEmail(userId), password);
  } catch (err) {
    return { code: "100", user: null }; // 帳號或密碼錯誤
  }

  if (profile.status === "pending") {
    return { code: "PENDING", user: null };
  }
  if (profile.status === "rejected") {
    return { code: "REJECTED", user: null };
  }
  return { code: "000", user: { USER_ID: userId, NAME: profile.name, ROLE: profile.role || "staff" } };
}

function showError(message) {
  const el = document.getElementById("errorMsg");
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError() {
  const el = document.getElementById("errorMsg");
  el.classList.add("hidden");
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;
    const loginBtn = document.getElementById("loginBtn");

    if (!userId || !password) {
      showError("請輸入帳號與密碼");
      return;
    }
    if (userId.length > 15) {
      showError("帳號長度不可超過 15 個字元");
      return;
    }
    if (password.length > 30) {
      showError("密碼長度不可超過 30 個字元");
      return;
    }

    loginBtn.disabled = true; // 防止重複提交
    loginBtn.textContent = "登入中...";

    let code = "999";
    let demoUser = null;

    // TODO: IT 工程師請在正式環境移除此判斷，僅保留下方 callCheckUserId() 呼叫
    // 先比對示範帳號：若帳號為原型測試用的示範帳號，直接以本機資料驗證，不呼叫正式 API。
    // 原因：本機若能連上正式 FME 網域，callCheckUserId 會正常回應「帳密錯誤」而非拋出例外，
    // 導致下方 catch 內的示範帳號備援永遠不會被觸發。
    const demoMatch = DEMO_USERS.find((u) => u.USER_ID === userId);
    if (demoMatch) {
      const fallback = demoLoginFallback(userId, password);
      code = fallback.code;
      demoUser = fallback.user;
    } else {
      // 先檢查是否為人員自行申請、待管理員審核的帳號
      let selfRegResult = null;
      try {
        selfRegResult = await trySelfRegisteredLogin(userId, password);
      } catch (err) {
        selfRegResult = null;
      }

      if (selfRegResult) {
        code = selfRegResult.code;
        demoUser = selfRegResult.user;
      } else {
        try {
          code = await callCheckUserId(userId, password);
        } catch (err) {
          // 正式環境不應發生（僅本機原型測試時，因跨網域無法連線正式 API 才會走到這裡）
          const fallback = demoLoginFallback(userId, password);
          code = fallback.code;
          demoUser = fallback.user;
        }
      }
    }

    if (code === "000") {
      sessionStorage.setItem(
        "emm_user",
        JSON.stringify(demoUser || { USER_ID: userId, NAME: userId, ROLE: "staff" })
      );
      window.location.href = "app.html";
      return;
    }

    showError(FME_ERROR_MESSAGES[code] || "系統發生錯誤，請聯絡管理員");
    loginBtn.disabled = false;
    loginBtn.textContent = "登入";
  });
}
