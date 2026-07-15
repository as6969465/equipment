// ===================== 登入頁面邏輯 (index.html) =====================
// 帳號驗證串接：日翊 FME CheckUserId API
// 正式機端點：https://eip.fme.com.tw/FMEIP/AasApi/CheckUserId

const FME_AUTH_ENDPOINT = "https://eip.fme.com.tw/FMEIP/AasApi/CheckUserId";

const FME_ERROR_MESSAGES = {
  "100": "帳號或密碼錯誤",
  "200": "AD 認證錯誤",
  "998": "系統暫時無法使用，請稍後再試",
  "999": "系統發生錯誤，請聯絡管理員",
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
      try {
        code = await callCheckUserId(userId, password);
      } catch (err) {
        // 正式環境不應發生（僅本機原型測試時，因跨網域無法連線正式 API 才會走到這裡）
        const fallback = demoLoginFallback(userId, password);
        code = fallback.code;
        demoUser = fallback.user;
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
