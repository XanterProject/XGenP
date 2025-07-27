async function generate(serviceId) {
  const masterKey = "XanterPlay"; // заглушка, позже — биометрия

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const result = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(serviceId)
  );

  const hashArray = Array.from(new Uint8Array(result));
  try {
    // Генерация пароля
    const password = btoa(String.fromCharCode(...hashArray)).slice(0, 16);
    log("✅ Пароль сгенерирован: " + password);
  } catch (e) {
    log("❌ Ошибка при генерации пароля: " + e.message);
  }

  document.getElementById("password").textContent = password;
}
function CheckWork() {
  if (!window.isSecureContext) {
    log("❌ Сайт не открыт по HTTPS или localhost — WebCrypto может не работать.");
  }

  if (!window.crypto || !window.crypto.subtle) {
    log("❌ WebCrypto API не поддерживается в этом браузере.");
  } else {
    log("✅ WebCrypto API поддерживается.");
  }

  if (!navigator.credentials || !navigator.credentials.get) {
    log("⚠️ navigator.credentials.get не доступен — биометрия может не работать.");
  } else {
    log("✅ navigator.credentials.get доступен.");
  }
}
function log(message) {
  const logDiv = document.getElementById("log");
  const time = new Date().toLocaleTimeString();
  logDiv.innerHTML += `[${time}] ${message}<br>`;
  logDiv.scrollTop = logDiv.scrollHeight;
}

CheckWork();