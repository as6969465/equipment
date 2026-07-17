// ===================== 申請帳號頁面邏輯 (register.html) =====================
// 密碼交給 Firebase Authentication 管理（雲端加密雜湊儲存），Firestore 只存
// 審核狀態與基本資料（帳號、姓名、部門），絕對不存密碼本身。

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

function showError(message) {
  const el = document.getElementById("errorMsg");
  el.textContent = message;
  el.classList.remove("hidden");
  document.getElementById("successMsg").classList.add("hidden");
}

function showSuccess(message) {
  const el = document.getElementById("successMsg");
  el.textContent = message;
  el.classList.remove("hidden");
  document.getElementById("errorMsg").classList.add("hidden");
}

const ACCOUNT_PATTERN = /^[A-Za-z0-9_-]{3,15}$/;

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const account = document.getElementById("account").value.trim();
    const name = document.getElementById("name").value.trim();
    const department = document.getElementById("department").value.trim();
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const registerBtn = document.getElementById("registerBtn");

    if (!ACCOUNT_PATTERN.test(account)) {
      showError("帳號請使用 3-15 個英數字元（可包含 - 或 _）");
      return;
    }
    if (!name) {
      showError("請輸入姓名");
      return;
    }
    if (password.length < 6) {
      showError("密碼至少需要 6 個字元");
      return;
    }
    if (password !== passwordConfirm) {
      showError("兩次輸入的密碼不一致");
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "送出中...";

    try {
      await waitForFb();
      const { db, doc, getDoc, setDoc, auth, createUserWithEmailAndPassword } = window.fb;

      // 帳號不可與現有人員名冊重複（含尚待審核的申請）
      const existing = await getDoc(doc(db, "staff", account));
      if (existing.exists()) {
        showError("此帳號已被申請或使用，請換一個帳號");
        registerBtn.disabled = false;
        registerBtn.textContent = "送出申請";
        return;
      }

      const authEmail = window.accountToAuthEmail(account);
      await createUserWithEmailAndPassword(auth, authEmail, password);

      await setDoc(doc(db, "staff", account), {
        id: account,
        name,
        department: department || "",
        role: "staff", // 自行申請一律為一般維護人員，管理員權限僅能由現有管理員手動調整
        status: "pending",
        selfRegistered: true,
        // 預設可查看頁籤，需與 app.html 的 DEFAULT_STAFF_PERMISSIONS 保持一致；
        // 核准後管理員可在「人員名冊」調整
        permissions: ["scan", "equipment", "records", "analytics"],
      });

      showSuccess("申請已送出，請等待管理員審核，核准後即可登入。");
      registerForm.reset();
      registerBtn.textContent = "申請已送出";
    } catch (err) {
      const code = err && err.code;
      if (code === "auth/email-already-in-use") {
        showError("此帳號已被申請或使用，請換一個帳號");
      } else if (code === "auth/weak-password") {
        showError("密碼強度不足，請設定至少 6 個字元");
      } else {
        showError("申請失敗，請稍後再試（" + (err && err.message ? err.message : "未知錯誤") + "）");
      }
      registerBtn.disabled = false;
      registerBtn.textContent = "送出申請";
    }
  });
}
