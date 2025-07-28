let DEBUG = false;

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

if (DEBUG) {
  CheckWork();
} else {
  const logDiv = document.getElementById("log");
  logDiv.style.display = 'none';
}

function triggerImport() {
  document.querySelector('input[type="file"]').click();
}

document.addEventListener("DOMContentLoaded", () => {
  const serviceList = document.getElementById("service-list");
  const toggleViewBtn = document.getElementById("toggle-view");

  let isGridView = true;
  let currentServices = [];

  // 🚀 Загрузка из localStorage или fallback
  function loadServices() {
    const stored = localStorage.getItem("xgenp_services");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          renderServices(parsed);
          return;
        }
      } catch (e) {
        console.error("Ошибка парсинга localStorage:", e);
      }
    }

    // fallback
    fetch('services.json')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          localStorage.setItem("xgenp_services", JSON.stringify(data)); // сохранить
          renderServices(data);
        } else {
          console.error("Неправильный формат JSON:", data);
        }
      })
      .catch(err => console.error("Ошибка при загрузке services.json:", err));
  }

  // 🔁 Отрисовка интерфейса
  function renderServices(services) {
    currentServices = services;
    serviceList.innerHTML = "";

    services.forEach(service => {
      const container = document.createElement("div");
      container.className = "service-item";

      const mainCard = document.createElement("div");
      mainCard.className = "card";
      mainCard.innerHTML = `
        <img src="icons/${service.icon}" alt="${service.name}" class="service-icon">
        <span class="service-name">${service.name}</span>
      `;

      const collapse = document.createElement("div");
      collapse.className = "collapse";
      collapse.innerHTML = `
        <div><strong>Site:</strong> ${service.id}</div>
        <div><strong>Длина:</strong> ${service.length || "по умолчанию"}</div>
        <div><strong>Пароль:</strong> <span class="generated-password">…</span></div>
      `;
      const passwordSpan = collapse.querySelector(".generated-password");
      generatePassword(service.id, service.length || 16)
        .then(pass => passwordSpan.textContent = pass)
        .catch(() => passwordSpan.textContent = "Ошибка");

      let isExpanded = false;
      container.addEventListener("click", () => {
        generatePassword(service.id, service.length || 16).then(password => {
          navigator.clipboard.writeText(password);
        });

        isExpanded = !isExpanded;
        if (isExpanded) {
          collapse.classList.add("open");
          collapse.style.maxHeight = collapse.scrollHeight * 2 + "px";
        } else {
          collapse.classList.remove("open");
          collapse.style.maxHeight = null;
        }
      });

      container.appendChild(mainCard);
      container.appendChild(collapse);
      serviceList.appendChild(container);
    });
  }

  toggleViewBtn.addEventListener("click", () => {
    isGridView = !isGridView;
    serviceList.className = isGridView ? "grid-view" : "list-view";
  });

  loadServices();
  // Инициализация импорта
  async function importZip(event) {
    const file = event.target.files[0];
    if (!file) return;

    const zip = await JSZip.loadAsync(file);
    const jsonFile = zip.file("services.json");
    if (!jsonFile) return alert("Файл services.json не найден!");

    const jsonText = await jsonFile.async("string");
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return alert("Некорректный JSON в архиве");

    localStorage.setItem("xgenp_services", JSON.stringify(parsed)); // 💾 сохраняем
    renderServices(parsed);
  }

  // Создание кнопки импорта
  const importBtn = document.createElement("button");
  importBtn.textContent = "📂 Импорт ZIP";
  importBtn.className = "styled-button"; // добавь стили в CSS
  importBtn.onclick = triggerImport;

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".zip";
  importInput.style.display = "none";
  importInput.onchange = importZip;

  const footerRight = document.querySelector(".footer-left");
  //console.log(footerRight);
  footerRight.appendChild(importBtn);
  footerRight.appendChild(importInput);

  const scriptZip = document.createElement("script");
  scriptZip.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  document.head.appendChild(scriptZip);

  // 📎 WebAuthn: Получение мастер-ключа
  async function getMasterKey() {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: JSON.parse(localStorage.getItem("allowedCredentials") || "[]")
      }
    });

    const rawId = cred.rawId;
    const buffer = new Uint8Array(rawId);
    return await crypto.subtle.digest('SHA-256', buffer);
  }


  // 🔐 Генерация пароля
  async function generatePassword(serviceId, length = 16) {
    const masterKey = await getMasterKey();
    if (!masterKey) return; // или покажи другой UI, например "доступ запрещен"

    const encoder = new TextEncoder();
    const data = encoder.encode(serviceId + ":" + length);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      masterKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const hash = new Uint8Array(signature);

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
    let password = "";
    for (let i = 0; i < length; i++) {
      const index = hash[i % hash.length] % alphabet.length;
      password += alphabet[index];
    }

    return password;
  }
});
