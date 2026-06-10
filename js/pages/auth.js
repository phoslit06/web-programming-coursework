(() => {
const API_URL = "http://localhost:3000";
const CURRENT_USER_KEY = "eurasiaCurrentUser";
const THEME_KEY = "eurasiaTheme";
const ACCESSIBILITY_KEY = "eurasiaAccessibility";
const ACCESSIBILITY_FONT_KEY = "eurasiaAccessibilityFont";
const ACCESSIBILITY_SCHEME_KEY = "eurasiaAccessibilityScheme";
const ACCESSIBILITY_IMAGES_KEY = "eurasiaAccessibilityImages";
const ACCOUNT_BOOKINGS_PAGE_SIZE = 3;

function translateAuthText(source, values = {}) {
  if (window.getTranslationBySource) {
    return window.getTranslationBySource(source, values);
  }

  return source;
}

const popularPasswords = new Set([
  "123456", "123456789", "12345", "qwerty", "password", "12345678", "111111", "123123", "1234567890", "1234567",
  "qwerty123", "000000", "1q2w3e", "aa123456", "abc123", "password1", "1234", "qwertyuiop", "admin", "letmein",
  "welcome", "monkey", "dragon", "football", "iloveyou", "master", "sunshine", "princess", "login", "passw0rd",
  "solo", "starwars", "whatever", "hello", "freedom", "trustno1", "zaq1zaq1", "qazwsx", "baseball", "shadow",
  "superman", "michael", "jennifer", "charlie", "jordan", "hunter", "buster", "soccer", "harley", "batman",
  "andrew", "tigger", "summer", "love", "killer", "pepper", "ginger", "secret", "computer", "internet",
  "chelsea", "mercedes", "corvette", "ranger", "yankees", "banana", "asdfgh", "qwerty1", "qwe123", "zxcvbnm",
  "1qaz2wsx", "pass", "asdf1234", "987654321", "654321", "121212", "7777777", "888888", "555555", "696969",
  "пароль", "йцукен", "любовь", "привет", "евразия", "россия", "москва", "челябинск", "златоуст", "админ",
  "user", "test", "test123", "demo", "guest", "root", "q1w2e3r4", "qwerty12", "1q2w3e4r", "zaq12wsx"
]);

document.addEventListener("DOMContentLoaded", () => {
  createPagePreloader();
  initSiteSettings();
  createAuthModals();
  initAuthNavigation();
  initPasswordToggles();
  initLoginPage();
  initRegisterPage();
  initProfileEditForm();

  const page = document.body.dataset.page;

  if (page === "account") {
    initAccountPage();
  }

  hidePagePreloaderSoon();
});

window.addEventListener("load", hidePagePreloaderSoon);

window.addEventListener("error", (event) => {
  if (event.message && event.message.includes("ResizeObserver")) {
    return;
  }

  sessionStorage.setItem("eurasiaLastError", event.message || "Ошибка загрузки страницы");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason && (event.reason.message || String(event.reason));
  sessionStorage.setItem("eurasiaLastError", reason || "Ошибка загрузки данных");
});

function initSiteSettings() {
  normalizeSettingsControls();
  window.refreshPageTranslations?.();
  createAccessibilityPanel();
  optimizeImagesForLoading();

  const theme = localStorage.getItem(THEME_KEY);
  const accessibility = localStorage.getItem(ACCESSIBILITY_KEY);
  const font = localStorage.getItem(ACCESSIBILITY_FONT_KEY) || "medium";
  const scheme = localStorage.getItem(ACCESSIBILITY_SCHEME_KEY) || "black-white";
  const images = localStorage.getItem(ACCESSIBILITY_IMAGES_KEY) || "on";

  applyTheme(theme === "dark" ? "dark" : "light");
  applyAccessibilitySettings({
    enabled: accessibility === "on",
    font,
    scheme,
    images
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
      applyTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  });

  document.querySelectorAll("[data-accessibility-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const enabled = !document.body.classList.contains("accessibility-mode");
      applyAccessibilitySettings({ enabled });
    });
  });

}

function createPagePreloader() {
  if (document.querySelector("[data-page-preloader]")) {
    return;
  }

  const preloader = document.createElement("div");
  preloader.className = "page-preloader";
  preloader.dataset.pagePreloader = "";
  preloader.innerHTML = `
    <div class="page-preloader__box" role="status" aria-live="polite">
      <span class="page-preloader__spinner" aria-hidden="true"></span>
      <span>Загрузка</span>
    </div>
  `;

  document.body.append(preloader);
  window.setTimeout(hidePagePreloaderSoon, 1400);
}

function hidePagePreloaderSoon() {
  const preloader = document.querySelector("[data-page-preloader]");

  if (!preloader || preloader.classList.contains("is-hidden")) {
    return;
  }

  preloader.classList.add("is-hidden");
  window.setTimeout(() => preloader.remove(), 260);
}

function optimizeImagesForLoading(root = document) {
  root.querySelectorAll("img").forEach((image) => {
    image.decoding = "async";

    if (!image.closest(".site-header, .hero, [class*='hero']")) {
      image.loading = "lazy";
    }
  });
}

function applyTheme(theme) {
  const isDarkTheme = theme === "dark";
  const toggleLabel = translateAuthText(isDarkTheme ? "Включить светлую тему" : "Включить темную тему");

  document.body.classList.toggle("theme-dark", isDarkTheme);
  document.body.classList.toggle("theme-light", !isDarkTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.classList.add("theme-toggle");
    button.dataset.themeIcon = isDarkTheme ? "sun" : "moon";
    button.textContent = "";
    button.setAttribute("aria-label", toggleLabel);
    button.title = toggleLabel;
  });
}

function normalizeSettingsControls() {
  document.querySelectorAll(".settings-button, .mobile-menu__control").forEach((button) => {
    const text = button.textContent.trim();
    const ariaLabel = button.getAttribute("aria-label") || "";
    const hasThemeToggle = Object.prototype.hasOwnProperty.call(button.dataset, "themeToggle");
    const isThemeToggle =
      hasThemeToggle ||
      button.classList.contains("settings-button--icon") ||
      /тему/i.test(ariaLabel) ||
      /theme/i.test(ariaLabel);

    if (!button.dataset.langToggle && text.includes("RU") && text.includes("EN")) {
      button.dataset.langToggle = "";
    }

    if (!button.dataset.mobileLang && text === "RU") {
      button.dataset.mobileLang = "ru";
    }

    if (!button.dataset.mobileLang && text === "EN") {
      button.dataset.mobileLang = "en";
    }

    if (!button.dataset.accessibilityToggle && text === "A+") {
      button.dataset.accessibilityToggle = "";
    }

    if (!hasThemeToggle && isThemeToggle) {
      button.dataset.themeToggle = "";
    }

    if (isThemeToggle) {
      button.classList.add("theme-toggle");
      button.textContent = "";
    }
  });
}

function createAccessibilityPanel() {
  if (document.querySelector("[data-accessibility-panel]")) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "accessibility-panel";
  panel.dataset.accessibilityPanel = "";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="accessibility-panel__group">
      <span>Размер шрифта</span>
      <button type="button" data-a11y-font="small">A</button>
      <button type="button" data-a11y-font="medium">A+</button>
      <button type="button" data-a11y-font="large">A++</button>
    </div>
    <div class="accessibility-panel__group">
      <span>Цветовая схема</span>
      <button type="button" data-a11y-scheme="black-white">Черный/белый</button>
      <button type="button" data-a11y-scheme="black-green">Черный/зеленый</button>
      <button type="button" data-a11y-scheme="white-black">Белый/черный</button>
    </div>
    <div class="accessibility-panel__group">
      <button type="button" data-a11y-images>Отключить изображения</button>
    </div>
  `;

  document.body.prepend(panel);

  panel.addEventListener("click", (event) => {
    const fontButton = event.target.closest("[data-a11y-font]");
    const schemeButton = event.target.closest("[data-a11y-scheme]");
    const imagesButton = event.target.closest("[data-a11y-images]");

    if (fontButton) {
      applyAccessibilitySettings({ font: fontButton.dataset.a11yFont });
    }

    if (schemeButton) {
      applyAccessibilitySettings({ scheme: schemeButton.dataset.a11yScheme });
    }

    if (imagesButton) {
      const images = document.body.classList.contains("a11y-images-off") ? "on" : "off";
      applyAccessibilitySettings({ images });
    }
  });
}

function applyAccessibilitySettings(next = {}) {
  const enabled = typeof next.enabled === "boolean"
    ? next.enabled
    : document.body.classList.contains("accessibility-mode");
  const font = next.font || localStorage.getItem(ACCESSIBILITY_FONT_KEY) || "medium";
  const scheme = next.scheme || localStorage.getItem(ACCESSIBILITY_SCHEME_KEY) || "black-white";
  const images = next.images || localStorage.getItem(ACCESSIBILITY_IMAGES_KEY) || "on";

  document.body.classList.toggle("accessibility-mode", enabled);
  if (enabled) {
    document.documentElement.dataset.a11yFont = font;
    document.documentElement.dataset.a11yScheme = scheme;
  } else {
    delete document.documentElement.dataset.a11yFont;
    delete document.documentElement.dataset.a11yScheme;
  }
  document.body.classList.remove("a11y-font-small", "a11y-font-medium", "a11y-font-large");
  document.body.classList.remove("a11y-scheme-black-white", "a11y-scheme-black-green", "a11y-scheme-white-black");
  document.body.classList.add(`a11y-font-${font}`, `a11y-scheme-${scheme}`);
  document.body.classList.toggle("a11y-images-off", enabled && images === "off");
  localStorage.setItem(ACCESSIBILITY_KEY, enabled ? "on" : "off");
  localStorage.setItem(ACCESSIBILITY_FONT_KEY, font);
  localStorage.setItem(ACCESSIBILITY_SCHEME_KEY, scheme);
  localStorage.setItem(ACCESSIBILITY_IMAGES_KEY, images);

  const panel = document.querySelector("[data-accessibility-panel]");

  if (panel) {
    panel.hidden = !enabled;
    panel.querySelectorAll("[data-a11y-font]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.a11yFont === font ? "true" : "false");
    });
    panel.querySelectorAll("[data-a11y-scheme]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.a11yScheme === scheme ? "true" : "false");
    });
    const imageButton = panel.querySelector("[data-a11y-images]");

    if (imageButton) {
      imageButton.textContent = images === "off" ? "Включить изображения" : "Отключить изображения";
    }
  }
}

function createAuthModals() {
  if (document.querySelector("[data-auth-modal]")) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "auth-modal";
  modal.hidden = true;
  modal.dataset.authModal = "";
  modal.innerHTML = `
    <section class="auth-dialog auth-dialog--login" role="dialog" aria-modal="true" aria-labelledby="auth-login-title" data-auth-panel="login">
      <button class="auth-dialog__close" type="button" aria-label="Закрыть" data-auth-close>×</button>
      <h2 id="auth-login-title">Вход</h2>
      <form class="auth-form" novalidate data-login-form>
        <div class="form-field">
          <label for="modal-login-identifier">Ваш e-mail или логин</label>
          <input id="modal-login-identifier" name="identifier" type="text" placeholder="ivan@mail.ru или ivan_ivanov" autocomplete="username" aria-describedby="modal-login-identifier-error" required>
          <small id="modal-login-identifier-error" data-error-for="identifier"></small>
        </div>
        <div class="form-field">
          <label for="modal-login-password">Ваш пароль</label>
          <div class="password-field">
            <input id="modal-login-password" name="password" type="password" placeholder="Введите пароль" autocomplete="current-password" aria-describedby="modal-login-password-error" required>
            <button type="button" data-password-toggle aria-label="Показать пароль">Показать</button>
          </div>
          <small id="modal-login-password-error" data-error-for="password"></small>
        </div>
        <p class="form-message" data-form-message></p>
        <button class="button button--primary auth-submit" type="submit" disabled>Войти</button>
      </form>
      <button class="auth-dialog__link" type="button" data-open-register>Регистрация</button>
    </section>

    <section class="auth-dialog auth-dialog--register" role="dialog" aria-modal="true" aria-labelledby="auth-register-title" data-auth-panel="register" hidden>
      <button class="auth-dialog__close" type="button" aria-label="Закрыть" data-auth-close>×</button>
      <h2 id="auth-register-title">Регистрация</h2>
      <form class="auth-form auth-form--grid" novalidate data-register-form>
        <div class="form-field">
          <label for="modal-register-first-name">Ваше имя <span>*</span></label>
          <input id="modal-register-first-name" name="firstName" type="text" placeholder="Иван" autocomplete="given-name" aria-describedby="modal-register-first-name-error" required>
          <small id="modal-register-first-name-error" data-error-for="firstName"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-last-name">Ваша фамилия <span>*</span></label>
          <input id="modal-register-last-name" name="lastName" type="text" placeholder="Иванов" autocomplete="family-name" aria-describedby="modal-register-last-name-error" required>
          <small id="modal-register-last-name-error" data-error-for="lastName"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-middle-name">Ваше отчество</label>
          <input id="modal-register-middle-name" name="middleName" type="text" placeholder="Иванович" autocomplete="additional-name" aria-describedby="modal-register-middle-name-error">
          <small id="modal-register-middle-name-error" data-error-for="middleName"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-email">Ваш e-mail <span>*</span></label>
          <input id="modal-register-email" name="email" type="email" placeholder="ivan@mail.ru" autocomplete="email" aria-describedby="modal-register-email-error" required>
          <small id="modal-register-email-error" data-error-for="email"></small>
        </div>
        <div class="form-field form-field--login">
          <label for="modal-register-login">Ваш логин <span>*</span></label>
          <div class="login-field">
            <input id="modal-register-login" name="login" type="text" placeholder="ivan_ivanov" autocomplete="username" aria-describedby="modal-register-login-error" required>
            <button type="button" data-generate-login>Сгенерировать</button>
          </div>
          <small id="modal-register-login-error" data-error-for="login"></small>
        </div>
        <fieldset class="password-mode">
          <legend>Способ задания пароля <span>*</span></legend>
          <label>
            <input type="radio" name="passwordMode" value="manual" checked>
            <span>Самостоятельно</span>
          </label>
          <label>
            <input type="radio" name="passwordMode" value="auto">
            <span>Автоматически</span>
          </label>
        </fieldset>
        <div class="form-field">
          <label for="modal-register-password">Ваш пароль <span>*</span></label>
          <div class="password-field">
            <input id="modal-register-password" name="password" type="password" placeholder="Aaaa#1234" autocomplete="new-password" aria-describedby="modal-register-password-error" required>
            <button type="button" data-password-toggle aria-label="Показать пароль">Показать</button>
            <button type="button" data-generate-password hidden>Сгенерировать</button>
          </div>
          <small id="modal-register-password-error" data-error-for="password"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-password-repeat">Повторите пароль <span>*</span></label>
          <div class="password-field">
            <input id="modal-register-password-repeat" name="passwordRepeat" type="password" placeholder="Повторите пароль" autocomplete="new-password" aria-describedby="modal-register-password-repeat-error" required>
            <button type="button" data-password-toggle aria-label="Показать пароль">Показать</button>
          </div>
          <small id="modal-register-password-repeat-error" data-error-for="passwordRepeat"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-phone">Ваш телефон <span>*</span></label>
          <input id="modal-register-phone" name="phone" type="tel" placeholder="+79227288288" autocomplete="tel" aria-describedby="modal-register-phone-error" required>
          <small id="modal-register-phone-error" data-error-for="phone"></small>
        </div>
        <div class="form-field">
          <label for="modal-register-birth-date">Ваша дата рождения <span>*</span></label>
          <input id="modal-register-birth-date" name="birthDate" type="date" aria-describedby="modal-register-birth-date-error" required>
          <small id="modal-register-birth-date-error" data-error-for="birthDate"></small>
        </div>
        <label class="agreement-field">
          <input name="agreement" type="checkbox" required>
          <span>Согласен(на) с <button class="agreement-field__link" type="button" data-open-agreement>пользовательским соглашением</button> и обработкой персональных данных <b>*</b></span>
        </label>
        <small class="agreement-error" data-error-for="agreement"></small>
        <p class="form-message" data-form-message></p>
        <button class="button button--primary auth-submit" type="submit" disabled>Зарегистрироваться</button>
      </form>
      <button class="auth-dialog__link" type="button" data-open-login>Уже есть аккаунт? Войти</button>
    </section>

    <section class="auth-dialog auth-dialog--agreement" role="dialog" aria-modal="true" aria-labelledby="auth-agreement-title" data-auth-panel="agreement" hidden>
      <button class="auth-dialog__close" type="button" aria-label="Закрыть" data-auth-close>×</button>
      <h2 id="auth-agreement-title">Пользовательское соглашение</h2>
      <div class="agreement-text">
        <p>Пользователь передает данные добровольно для регистрации, связи с центром активного отдыха и оформления бронирований.</p>
        <p>Сайт использует имя, телефон, e-mail, дату рождения и данные бронирований только для работы личного кабинета, корзины, заказов и обратной связи.</p>
        <p>Администрация не передает персональные данные третьим лицам, кроме случаев, предусмотренных законодательством Российской Федерации.</p>
        <p>Пользователь обязан указывать достоверные данные и может обратиться к администрации для уточнения, изменения или удаления информации.</p>
        <p>Нажимая галочку в форме регистрации, пользователь подтверждает, что ознакомился с условиями и согласен на обработку персональных данных.</p>
      </div>
      <button class="button button--primary auth-submit" type="button" data-open-register>Вернуться к регистрации</button>
    </section>

    <section class="auth-dialog auth-dialog--register" role="dialog" aria-modal="true" aria-labelledby="auth-profile-title" data-auth-panel="profile" hidden>
      <button class="auth-dialog__close" type="button" aria-label="Закрыть" data-auth-close>×</button>
      <h2 id="auth-profile-title">Редактировать профиль</h2>
      <form class="auth-form auth-form--grid" novalidate data-profile-form>
        <div class="form-field">
          <label for="modal-profile-first-name">Ваше имя <span>*</span></label>
          <input id="modal-profile-first-name" name="firstName" type="text" placeholder="Иван" autocomplete="given-name" aria-describedby="modal-profile-first-name-error" required>
          <small id="modal-profile-first-name-error" data-error-for="firstName"></small>
        </div>
        <div class="form-field">
          <label for="modal-profile-last-name">Ваша фамилия <span>*</span></label>
          <input id="modal-profile-last-name" name="lastName" type="text" placeholder="Иванов" autocomplete="family-name" aria-describedby="modal-profile-last-name-error" required>
          <small id="modal-profile-last-name-error" data-error-for="lastName"></small>
        </div>
        <div class="form-field">
          <label for="modal-profile-middle-name">Ваше отчество</label>
          <input id="modal-profile-middle-name" name="middleName" type="text" placeholder="Иванович" autocomplete="additional-name" aria-describedby="modal-profile-middle-name-error">
          <small id="modal-profile-middle-name-error" data-error-for="middleName"></small>
        </div>
        <div class="form-field">
          <label for="modal-profile-email">Ваш e-mail <span>*</span></label>
          <input id="modal-profile-email" name="email" type="email" placeholder="ivan@mail.ru" autocomplete="email" aria-describedby="modal-profile-email-error" required>
          <small id="modal-profile-email-error" data-error-for="email"></small>
        </div>
        <div class="form-field form-field--login">
          <label for="modal-profile-login">Ваш логин <span>*</span></label>
          <input id="modal-profile-login" name="login" type="text" placeholder="ivan_ivanov" autocomplete="username" aria-describedby="modal-profile-login-error" required>
          <small id="modal-profile-login-error" data-error-for="login"></small>
        </div>
        <div class="form-field">
          <label for="modal-profile-phone">Ваш телефон <span>*</span></label>
          <input id="modal-profile-phone" name="phone" type="tel" placeholder="+79227288288" autocomplete="tel" aria-describedby="modal-profile-phone-error" required>
          <small id="modal-profile-phone-error" data-error-for="phone"></small>
        </div>
        <div class="form-field">
          <label for="modal-profile-birth-date">Ваша дата рождения <span>*</span></label>
          <input id="modal-profile-birth-date" name="birthDate" type="date" aria-describedby="modal-profile-birth-date-error" required>
          <small id="modal-profile-birth-date-error" data-error-for="birthDate"></small>
        </div>
        <p class="form-message" data-form-message></p>
        <button class="button button--primary auth-submit" type="submit">Сохранить</button>
      </form>
    </section>
  `;

  document.body.append(modal);
  translateAuthModalAttributes(modal);
}

function translateAuthModalAttributes(modal) {
  const placeholders = {
    "ivan@mail.ru или ivan_ivanov": "ivan@mail.ru or ivan_ivanov",
    "Иван": "John",
    "Иванов": "Smith",
    "Иванович": "Middle name"
  };

  modal.querySelectorAll("[placeholder]").forEach((field) => {
    const source = field.getAttribute("placeholder");
    const translated = placeholders[source] || translateAuthText(source);
    field.setAttribute("placeholder", translated);
  });

  modal.querySelectorAll("[aria-label]").forEach((element) => {
    const source = element.getAttribute("aria-label");
    element.setAttribute("aria-label", translateAuthText(source));
  });
}

function initAuthNavigation() {
  updateAuthLinks();

  window.addEventListener("pageshow", updateAuthLinks);
  window.addEventListener("storage", (event) => {
    if (event.key === CURRENT_USER_KEY) {
      updateAuthLinks();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateAuthLinks();
    }
  });

  document.addEventListener("click", (event) => {
    const authLink = event.target.closest("[data-auth-link]");
    const loginButton = event.target.closest("[data-open-login]");
    const registerButton = event.target.closest("[data-open-register]");
    const agreementButton = event.target.closest("[data-open-agreement]");
    const profileButton = event.target.closest("[data-open-profile-edit]");
    const closeButton = event.target.closest("[data-auth-close]");
    const modal = event.target.closest("[data-auth-modal]");

    if (authLink && !getCurrentUser()) {
      event.preventDefault();
      closeMobileMenu();
      openAuthModal("login");
      return;
    }

    if (loginButton) {
      event.preventDefault();
      openAuthModal("login");
      return;
    }

    if (registerButton) {
      event.preventDefault();
      openAuthModal("register");
      return;
    }

    if (agreementButton) {
      event.preventDefault();
      openAuthModal("agreement");
      return;
    }

    if (profileButton) {
      event.preventDefault();
      openProfileEditModal();
      return;
    }

    if (closeButton || (modal && event.target === modal)) {
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthModal();
    }
  });
}

function updateAuthLinks() {
  const user = getCurrentUser();
  const accountHref = getAccountHref();

  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    const label = translateAuthText(user ? "Личный кабинет" : "Вход");
    const textElement = link.querySelector(".mobile-menu__text") || link;

    link.href = user ? accountHref : "#auth-login";
    link.setAttribute("aria-label", label);
    textElement.textContent = label;

    if (user && document.body.dataset.page === "account") {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function getAccountHref() {
  const path = window.location.pathname;

  if (path.includes("/pages/account/")) {
    return "account.html";
  }

  if (path.includes("/pages/")) {
    return "../account/account.html";
  }

  return "pages/account/account.html";
}

function openAuthModal(type) {
  const modal = document.querySelector("[data-auth-modal]");

  if (!modal) {
    return;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");

  modal.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== type;
  });

  const activePanel = modal.querySelector(`[data-auth-panel="${type}"]`);
  const firstInput = activePanel.querySelector("input");

  if (firstInput) {
    firstInput.focus();
  }
}

function closeAuthModal() {
  const modal = document.querySelector("[data-auth-modal]");

  if (!modal || modal.hidden) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function closeMobileMenu() {
  const toggle = document.querySelector(".mobile-menu__toggle");

  if (toggle) {
    toggle.checked = false;
  }
}

function openProfileEditModal() {
  const user = getCurrentUser();

  if (!user) {
    openAuthModal("login");
    return;
  }

  fillProfileEditForm(user);
  openAuthModal("profile");
}

function notifyAuthChanged() {
  window.dispatchEvent(new CustomEvent("eurasia:user-change", {
    detail: getCurrentUser()
  }));
}

function initPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      const isHidden = input.type === "password";
      const label = translateAuthText(isHidden ? "Скрыть пароль" : "Показать пароль");

      input.type = isHidden ? "text" : "password";
      button.textContent = translateAuthText(isHidden ? "Скрыть" : "Показать");
      button.setAttribute("aria-label", label);
    });
  });
}

function initLoginPage() {
  const form = document.querySelector("[data-login-form]");

  if (!form) {
    return;
  }

  const message = form.querySelector("[data-form-message]");

  form.addEventListener("input", () => {
    const isValid = validateLoginForm(form, true);
    setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    if (!validateLoginForm(form, true)) {
      setMessage(message, "Исправьте поля с ошибками.", "error");
      return;
    }

    const identifier = form.identifier.value.trim();
    const password = form.password.value;
    setMessage(message, "Проверяем данные...");

    try {
      const user = await findUserByIdentifier(identifier);

      if (!user || user.password !== password) {
        setMessage(message, "Неверный логин или пароль.", "error");
        return;
      }

      saveCurrentUser(user);
      updateAuthLinks();
      notifyAuthChanged();
      setMessage(message, "Вход выполнен.", "success");
      finishAuth();
    } catch (error) {
      console.error(error);
      setMessage(message, "JSON Server недоступен. Запустите npm run server.", "error");
    }
  });
}

function initRegisterPage() {
  const form = document.querySelector("[data-register-form]");
  let loginAttempts = 0;
  let emailCheckTimer = 0;
  let loginCheckTimer = 0;

  if (!form) {
    return;
  }

  const message = form.querySelector("[data-form-message]");
  const generatePasswordButton = form.querySelector("[data-generate-password]");

  form.addEventListener("input", (event) => {
    const isValid = validateRegisterForm(form, true);
    setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");

    if (event.target.name === "email") {
      clearTimeout(emailCheckTimer);
      emailCheckTimer = window.setTimeout(() => checkUniqueField(form, "email", "Такой email уже зарегистрирован."), 500);
    }

    if (event.target.name === "login") {
      clearTimeout(loginCheckTimer);
      loginCheckTimer = window.setTimeout(() => checkUniqueField(form, "login", "Такой логин уже занят."), 500);
    }
  });

  form.phone.addEventListener("blur", () => {
    form.phone.value = normalizePhone(form.phone.value);
    const isValid = validateRegisterForm(form, true);
    setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");
  });

  form.email.addEventListener("blur", () => checkUniqueField(form, "email", "Такой email уже зарегистрирован."));
  form.login.addEventListener("blur", () => checkUniqueField(form, "login", "Такой логин уже занят."));
  form.passwordRepeat.addEventListener("paste", (event) => {
    if (getPasswordMode(form) === "manual") {
      event.preventDefault();
      setFieldError(form, "passwordRepeat", "Пароль нужно повторить вручную, без вставки.");
      setMessage(message, "Исправьте поля с ошибками.", "error");
    }
  });

  form.querySelectorAll('input[name="passwordMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePasswordMode(form);
      const isValid = validateRegisterForm(form, true);
      setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");
    });
  });

  generatePasswordButton.addEventListener("click", () => {
    setGeneratedPassword(form);
    const isValid = validateRegisterForm(form, true);
    setMessage(message, isValid ? "Пароль сгенерирован." : "Исправьте поля с ошибками.", isValid ? "success" : "error");
  });

  form.querySelector("[data-generate-login]").addEventListener("click", async () => {
    clearMessage(message);

    if (loginAttempts >= 5) {
      setFieldError(form, "login", "Попытки закончились. Введите логин вручную.");
      return;
    }

    const base = buildLoginBase(form.firstName.value, form.lastName.value);

    if (!base) {
      setFieldError(form, "login", "Сначала заполните имя и фамилию.");
      return;
    }

    try {
      while (loginAttempts < 5) {
        const suffix = loginAttempts === 0 ? "" : String(Math.floor(10 + Math.random() * 90));
        const candidate = `${base}${suffix}`.slice(0, 24);
        loginAttempts += 1;

        if (await isFieldAvailable("login", candidate)) {
          form.login.value = candidate;
          clearFieldError(form, "login");
          validateRegisterForm(form, true);
          setMessage(message, `Логин создан: ${candidate}`, "success");
          return;
        }
      }

      setFieldError(form, "login", "Не получилось подобрать свободный логин. Введите его вручную.");
    } catch (error) {
      console.error(error);
      setMessage(message, "Не удалось проверить логин. Запустите JSON Server.", "error");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    if (!validateRegisterForm(form, true)) {
      setMessage(message, "Проверьте поля с ошибками.", "error");
      return;
    }

    const email = form.email.value.trim().toLowerCase();
    const login = form.login.value.trim();

    try {
      const emailAvailable = await isFieldAvailable("email", email);
      const loginAvailable = await isFieldAvailable("login", login);

      if (!emailAvailable) {
        setFieldError(form, "email", "Такой email уже зарегистрирован.");
      }

      if (!loginAvailable) {
        setFieldError(form, "login", "Такой логин уже занят.");
      }

      if (!emailAvailable || !loginAvailable) {
        setMessage(message, "Исправьте уникальные поля.", "error");
        return;
      }

      const newUser = {
        firstName: normalizeName(form.firstName.value),
        lastName: normalizeName(form.lastName.value),
        middleName: normalizeName(form.middleName.value),
        email,
        phone: normalizePhone(form.phone.value),
        birthDate: form.birthDate.value,
        login,
        password: form.password.value,
        role: "user",
        createdAt: new Date().toISOString()
      };

      setMessage(message, "Создаём аккаунт...");

      const savedUser = await fetchJson(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newUser)
      });

      saveCurrentUser(savedUser);
      updateAuthLinks();
      notifyAuthChanged();
      setMessage(message, "Аккаунт создан.", "success");
      finishAuth();
    } catch (error) {
      console.error(error);
      setMessage(message, "Не удалось создать аккаунт. Проверьте JSON Server.", "error");
    }
  });
}

function initProfileEditForm() {
  const form = document.querySelector("[data-profile-form]");
  let emailCheckTimer = 0;
  let loginCheckTimer = 0;

  if (!form) {
    return;
  }

  const message = form.querySelector("[data-form-message]");

  form.addEventListener("input", (event) => {
    const isValid = validateProfileForm(form, true);
    setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");

    if (event.target.name === "email") {
      clearTimeout(emailCheckTimer);
      emailCheckTimer = window.setTimeout(() => checkProfileUniqueField(form, "email", "Такой email уже зарегистрирован."), 500);
    }

    if (event.target.name === "login") {
      clearTimeout(loginCheckTimer);
      loginCheckTimer = window.setTimeout(() => checkProfileUniqueField(form, "login", "Такой логин уже занят."), 500);
    }
  });

  form.phone.addEventListener("blur", () => {
    form.phone.value = normalizePhone(form.phone.value);
    const isValid = validateProfileForm(form, true);
    setMessage(message, isValid ? "" : "Исправьте поля с ошибками.", isValid ? "" : "error");
  });

  form.email.addEventListener("blur", () => checkProfileUniqueField(form, "email", "Такой email уже зарегистрирован."));
  form.login.addEventListener("blur", () => checkProfileUniqueField(form, "login", "Такой логин уже занят."));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    const currentUser = getCurrentUser();

    if (!currentUser) {
      setMessage(message, "Сначала войдите.", "error");
      return;
    }

    if (!validateProfileForm(form, true)) {
      setMessage(message, "Проверьте поля с ошибками.", "error");
      return;
    }

    const email = form.email.value.trim().toLowerCase();
    const login = form.login.value.trim();

    try {
      const emailAvailable = await isFieldAvailableForUser("email", email, currentUser.id);
      const loginAvailable = await isFieldAvailableForUser("login", login, currentUser.id);

      if (!emailAvailable) {
        setFieldError(form, "email", "Такой email уже зарегистрирован.");
      }

      if (!loginAvailable) {
        setFieldError(form, "login", "Такой логин уже занят.");
      }

      if (!emailAvailable || !loginAvailable) {
        setMessage(message, "Исправьте уникальные поля.", "error");
        return;
      }

      setMessage(message, "Сохраняем профиль...");

      const savedUser = await fetchJson(`${API_URL}/users/${currentUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: normalizeName(form.firstName.value),
          lastName: normalizeName(form.lastName.value),
          middleName: normalizeName(form.middleName.value),
          email,
          login,
          phone: normalizePhone(form.phone.value),
          birthDate: form.birthDate.value
        })
      });

      saveCurrentUser(savedUser);
      updateAuthLinks();
      notifyAuthChanged();
      setMessage(message, "Профиль сохранён.", "success");
      finishAuth();
    } catch (error) {
      console.error(error);
      setMessage(message, "Не удалось сохранить профиль. Проверьте JSON Server.", "error");
    }
  });
}

function finishAuth() {
  window.setTimeout(() => {
    closeAuthModal();

    if (document.body.dataset.page === "account") {
      initAccountPage();
    }
  }, 400);
}

function validateLoginForm(form, showErrors) {
  const checks = {
    identifier: validateLoginIdentifier(form.identifier.value),
    password: form.password.value ? "" : "Введите пароль."
  };

  Object.keys(checks).forEach((name) => {
    if (showErrors) {
      setFieldError(form, name, checks[name]);
    } else if (!checks[name]) {
      clearFieldError(form, name);
    }
  });

  const isValid = Object.values(checks).every((error) => !error);
  form.querySelector(".auth-submit").disabled = !isValid;

  return isValid;
}

function validateRegisterForm(form, showErrors) {
  const passwordMode = getPasswordMode(form);
  const checks = {
    lastName: validateName(form.lastName.value, true),
    firstName: validateName(form.firstName.value, true),
    middleName: validateName(form.middleName.value, false),
    birthDate: validateBirthDate(form.birthDate.value),
    phone: validatePhone(form.phone.value),
    email: validateEmail(form.email.value),
    login: validateLogin(form.login.value),
    password: validatePassword(form.password.value),
    passwordRepeat: passwordMode === "auto" ? "" : validatePasswordRepeat(form.password.value, form.passwordRepeat.value),
    agreement: form.agreement.checked ? "" : "Нужно принять соглашение."
  };

  Object.keys(checks).forEach((name) => {
    if (showErrors) {
      setFieldError(form, name, checks[name]);
    } else if (!checks[name]) {
      clearFieldError(form, name);
    }
  });

  const isValid = Object.values(checks).every((error) => !error);
  form.querySelector(".auth-submit").disabled = !isValid;

  return isValid;
}

function validateProfileForm(form, showErrors) {
  const checks = {
    lastName: validateName(form.lastName.value, true),
    firstName: validateName(form.firstName.value, true),
    middleName: validateName(form.middleName.value, false),
    birthDate: validateBirthDate(form.birthDate.value),
    phone: validatePhone(form.phone.value),
    email: validateEmail(form.email.value),
    login: validateLogin(form.login.value)
  };

  Object.keys(checks).forEach((name) => {
    if (showErrors) {
      setFieldError(form, name, checks[name]);
    } else if (!checks[name]) {
      clearFieldError(form, name);
    }
  });

  const isValid = Object.values(checks).every((error) => !error);
  form.querySelector(".auth-submit").disabled = !isValid;

  return isValid;
}

function fillProfileEditForm(user) {
  const form = document.querySelector("[data-profile-form]");

  if (!form) {
    return;
  }

  form.firstName.value = user.firstName || "";
  form.lastName.value = user.lastName || "";
  form.middleName.value = user.middleName || "";
  form.email.value = user.email || "";
  form.login.value = user.login || "";
  form.phone.value = user.phone || "";
  form.birthDate.value = user.birthDate || "";
  form.querySelectorAll(".is-invalid").forEach((input) => input.classList.remove("is-invalid"));
  form.querySelectorAll("[data-error-for]").forEach((error) => {
    error.textContent = "";
  });
  clearMessage(form.querySelector("[data-form-message]"));
  validateProfileForm(form, false);
}

function updatePasswordMode(form) {
  const isAuto = getPasswordMode(form) === "auto";
  const generateButton = form.querySelector("[data-generate-password]");

  form.password.readOnly = isAuto;
  form.passwordRepeat.readOnly = isAuto;
  generateButton.hidden = !isAuto;

  if (isAuto) {
    setGeneratedPassword(form);
    form.password.type = "text";
    form.passwordRepeat.type = "text";
    form.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.textContent = "Скрыть";
    });
  } else {
    form.password.readOnly = false;
    form.passwordRepeat.readOnly = false;
    form.password.type = "password";
    form.passwordRepeat.type = "password";
    form.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.textContent = "Показать";
    });
  }
}

function setGeneratedPassword(form) {
  const password = generatePassword();
  form.password.value = password;
  form.passwordRepeat.value = password;
  clearFieldError(form, "password");
  clearFieldError(form, "passwordRepeat");
}

function generatePassword() {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*?";
  const all = lower + upper + digits + special;
  const required = [
    randomChar(lower),
    randomChar(upper),
    randomChar(digits),
    randomChar(special)
  ];

  while (required.length < 12) {
    required.push(randomChar(all));
  }

  return required.sort(() => Math.random() - 0.5).join("");
}

function randomChar(source) {
  return source[Math.floor(Math.random() * source.length)];
}

function getPasswordMode(form) {
  return form.passwordMode ? form.passwordMode.value : "manual";
}

function validateLoginIdentifier(value) {
  const text = value.trim();

  if (!text) {
    return "Введите email или логин.";
  }

  return text.includes("@") ? validateEmail(text) : validateLogin(text);
}

function validateName(value, required) {
  const text = value.trim();

  if (!text) {
    return required ? "Заполните поле." : "";
  }

  return /^[А-ЯЁа-яё]+(?:[ -][А-ЯЁа-яё]+)*$/.test(text) ? "" : "Используйте кириллицу, пробел или дефис.";
}

function validateBirthDate(value) {
  if (!value) {
    return "Укажите дату рождения.";
  }

  const birthDate = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 16 ? "" : "Регистрация доступна с 16 лет.";
}

function validatePhone(value) {
  return /^\+7\d{10}$/.test(normalizePhone(value)) ? "" : "Введите российский телефон в формате +7XXXXXXXXXX.";
}

function validateEmail(value) {
  const email = value.trim().toLowerCase();

  if (!email) {
    return "Введите email.";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Введите корректный email.";
}

function validateLogin(value) {
  const login = value.trim();

  if (!login) {
    return "Введите логин.";
  }

  return /^[A-Za-z0-9_.-]{4,24}$/.test(login) ? "" : "Логин: 4-24 латинских символа, цифры, точка, дефис или подчёркивание.";
}

function validatePassword(value) {
  if (!value) {
    return "Введите пароль.";
  }

  if (value.length < 8 || value.length > 20) {
    return "Пароль должен быть от 8 до 20 символов.";
  }

  if (!/[a-zа-яё]/.test(value) || !/[A-ZА-ЯЁ]/.test(value) || !/\d/.test(value) || !/[^A-Za-zА-Яа-яЁё0-9]/.test(value)) {
    return "Нужны строчная и заглавная буквы, цифра и спецсимвол.";
  }

  const simplePassword = value.toLowerCase().replace(/[^a-zа-яё0-9]/g, "");

  return popularPasswords.has(simplePassword) ? "Слишком популярный пароль." : "";
}

function validatePasswordRepeat(password, repeat) {
  if (!repeat) {
    return "Повторите пароль.";
  }

  return password === repeat ? "" : "Пароли не совпадают.";
}

async function checkUniqueField(form, fieldName, message) {
  const value = form[fieldName].value.trim();

  if (!value || setFieldError(form, fieldName, fieldName === "email" ? validateEmail(value) : validateLogin(value))) {
    return;
  }

  try {
    if (!(await isFieldAvailable(fieldName, fieldName === "email" ? value.toLowerCase() : value))) {
      setFieldError(form, fieldName, message);
      form.querySelector(".auth-submit").disabled = true;
    }
  } catch (error) {
    console.error(error);
  }
}

async function checkProfileUniqueField(form, fieldName, message) {
  const currentUser = getCurrentUser();
  const value = form[fieldName].value.trim();

  if (!currentUser || !value || setFieldError(form, fieldName, fieldName === "email" ? validateEmail(value) : validateLogin(value))) {
    return;
  }

  try {
    const preparedValue = fieldName === "email" ? value.toLowerCase() : value;

    if (!(await isFieldAvailableForUser(fieldName, preparedValue, currentUser.id))) {
      setFieldError(form, fieldName, message);
      form.querySelector(".auth-submit").disabled = true;
    }
  } catch (error) {
    console.error(error);
  }
}

function initAccountPage() {
  const message = document.querySelector("[data-account-message]");
  const content = document.querySelector("[data-account-content]");
  const savedUser = getCurrentUser();

  if (!savedUser) {
    renderGuestAccount(message, content);
    return;
  }

  loadAccount(savedUser, message, content);
}

async function loadAccount(savedUser, message, content) {
  try {
    const user = await fetchJson(`${API_URL}/users/${savedUser.id}`);
    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.id !== savedUser.id) {
      return;
    }

    saveCurrentUser(user);
    message.hidden = true;
    content.hidden = false;
    content.replaceChildren();

    if (user.role === "admin") {
      await renderAdminAccount(content, user);
    } else {
      await renderUserAccount(content, user);
    }
  } catch (error) {
    console.error(error);
    message.hidden = false;
    message.textContent = translateAccountText("Не удалось загрузить кабинет. Проверьте JSON Server.");
    content.hidden = true;
  }
}

function renderGuestAccount(message, content) {
  message.hidden = false;
  content.hidden = true;
  content.replaceChildren();
  message.replaceChildren();
  const loginLink = createLink("#auth-login", "Открыть вход");
  loginLink.dataset.openLogin = "";
  message.append(
    createText("Для доступа к личному кабинету нужно войти. "),
    loginLink
  );
}

async function renderUserAccount(content, user) {
  const [bookings, hotels, rooms, promotions] = await Promise.all([
    fetchJson(`${API_URL}/bookings?userId=${user.id}`),
    fetchJson(`${API_URL}/hotels`),
    fetchJson(`${API_URL}/rooms`),
    fetchJson(`${API_URL}/promotions`)
  ]);
  const data = createBookingData(hotels, rooms, promotions);
  const { active, past } = splitBookings(bookings);
  const main = document.createElement("div");
  main.className = "account-bookings";

  main.append(
    createBookingSection("Забронировано", active, data, true),
    createBookingSection("Прошлые брони", past, data, false)
  );

  const side = document.createElement("div");
  side.className = "account-sidebar";
  side.append(createProfilePanel(user), createFeedbackFormPanel(user));

  content.append(side, main);
}

async function renderAdminAccount(content, user) {
  const [users, bookings, hotels, rooms, promotions, reviews, feedback] = await Promise.all([
    fetchJson(`${API_URL}/users`),
    fetchJson(`${API_URL}/bookings`),
    fetchJson(`${API_URL}/hotels`),
    fetchJson(`${API_URL}/rooms`),
    fetchJson(`${API_URL}/promotions`),
    fetchJson(`${API_URL}/reviews`),
    fetchJson(`${API_URL}/feedback`)
  ]);
  const data = createBookingData(hotels, rooms, promotions);
  const main = document.createElement("div");
  main.className = "account-bookings";

  const stats = createPanel("Панель администратора", "account-panel--wide");
  const grid = document.createElement("div");
  grid.className = "account-stats";

  [
    ["Пользователи", users.length],
    ["Бронирования", bookings.length],
    ["Отзывы", reviews.length],
    ["Обратная связь", feedback.filter((item) => item.status === "new").length]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "account-stat";
    item.append(createElement("b", value), createElement("span", label));
    grid.append(item);
  });

  stats.append(grid);
  main.append(
    stats,
    createAdminFeedbackSection(feedback),
    createBookingSection("Последние бронирования", bookings.slice(-4).reverse(), data, false)
  );
  content.append(createProfilePanel(user), main);
}

function createFeedbackFormPanel(user) {
  const panel = createPanel("Обратная связь", "account-feedback-panel");
  const text = createElement("p", "Вы можете отправить разработчику пожелание, вопрос или сообщение о проблеме.", "account-feedback__text");
  const form = document.createElement("form");
  form.className = "account-feedback-form";
  form.noValidate = true;

  const phoneField = createFeedbackField("Телефон для связи", "tel", "phone", user.phone || "", "+79291234567");
  const messageLabel = document.createElement("label");
  messageLabel.className = "account-feedback-form__field";
  messageLabel.innerHTML = `
    <span>Ваше сообщение</span>
    <textarea name="message" rows="5" placeholder="Напишите, что можно улучшить" required></textarea>
  `;

  const submit = createElement("button", "Отправить", "account-profile__edit");
  submit.type = "submit";
  const formMessage = createElement("p", "", "account-feedback-form__message");

  form.append(phoneField, messageLabel, submit, formMessage);
  form.addEventListener("submit", (event) => submitFeedbackForm(event, user, formMessage));
  panel.append(text, form);
  return panel;
}

function createFeedbackField(labelText, type, name, value, placeholder) {
  const label = document.createElement("label");
  label.className = "account-feedback-form__field";

  const caption = createElement("span", labelText);
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.value = value;
  input.placeholder = placeholder;
  input.required = true;

  label.append(caption, input);
  return label;
}

async function submitFeedbackForm(event, user, messageElement) {
  event.preventDefault();

  const form = event.currentTarget;
  const phone = String(form.elements.phone.value || "").trim();
  const text = String(form.elements.message.value || "").trim();

  messageElement.className = "account-feedback-form__message";
  messageElement.textContent = "";

  if (!phone) {
    messageElement.classList.add("is-error");
    messageElement.textContent = "Укажите телефон для связи.";
    return;
  }

  if (text.length < 10) {
    messageElement.classList.add("is-error");
    messageElement.textContent = "Сообщение должно быть не короче 10 символов.";
    return;
  }

  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  submit.textContent = "Отправляем...";

  try {
    await fetchJson(`${API_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.id,
        name: getFullName(user) || user.login || user.email || "Пользователь",
        email: user.email || "",
        phone,
        message: text,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "new"
      })
    });
    form.elements.message.value = "";
    messageElement.classList.add("is-success");
    messageElement.textContent = "Спасибо, сообщение отправлено.";
  } catch (error) {
    console.error(error);
    messageElement.classList.add("is-error");
    messageElement.textContent = "Не удалось отправить сообщение. Проверьте JSON Server.";
  } finally {
    submit.disabled = false;
    submit.textContent = "Отправить";
  }
}

function createAdminFeedbackSection(feedback) {
  const section = document.createElement("section");
  section.className = "account-booking-section";
  section.append(createElement("h1", "Обратная связь пользователей"));

  const list = document.createElement("div");
  list.className = "account-list account-feedback-list";
  const newItems = feedback
    .filter((item) => item && item.status === "new")
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));

  if (!newItems.length) {
    list.append(createElement("p", "Новых обращений нет.", "account-feedback-empty"));
  } else {
    newItems.forEach((item) => {
      list.append(createFeedbackRequestItem(item));
    });
  }

  section.append(list);
  return section;
}

function createFeedbackRequestItem(item) {
  const card = document.createElement("article");
  card.className = "account-list__item account-feedback-item";

  card.append(
    createElement("h3", item.name || "Пользователь"),
    createElement("strong", item.phone || "Телефон не указан"),
    createElement("span", item.email || "Email не указан"),
    createElement("span", formatBookingDate(item.createdAt)),
    createElement("p", item.message || "")
  );

  const button = createElement("button", "Обработано", "account-feedback-item__button");
  button.type = "button";
  button.addEventListener("click", () => processFeedbackRequest(item.id));
  card.append(button);
  return card;
}

async function processFeedbackRequest(id) {
  if (!id) {
    return;
  }

  try {
    await fetchJson(`${API_URL}/feedback/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "processed" })
    });
    initAccountPage();
  } catch (error) {
    console.error(error);
    showAccountNotice("Не удалось обработать", "Проверьте JSON Server и попробуйте ещё раз.");
  }
}

function createProfilePanel(user) {
  const panel = createPanel("Профиль", "account-profile-card");
  const profile = document.createElement("div");
  profile.className = "account-profile";
  const roleText = user.role === "admin" ? "Администратор" : "Пользователь";

  profile.append(
    createProfileRow("ФИО", getFullName(user)),
    createProfileRow("Email", user.email),
    createProfileRow("Телефон", user.phone),
    createProfileRow("Дата рождения", formatDate(user.birthDate)),
    createProfileRow("Логин", user.login),
    createElement("span", roleText, "role-badge")
  );

  const actions = document.createElement("div");
  actions.className = "account-profile__actions";
  const editButton = createElement("button", "Редактировать профиль", "account-profile__edit");
  editButton.type = "button";
  editButton.dataset.openProfileEdit = "";
  const logoutButton = createElement("button", "Выйти", "account-profile__logout");
  logoutButton.type = "button";
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    updateAuthLinks();
    notifyAuthChanged();
    initAccountPage();
  });

  actions.append(editButton, logoutButton);
  panel.append(profile, actions);
  return panel;
}

function createBookingSection(title, items, data, canCancel) {
  const section = document.createElement("section");
  const translatedTitle = translateAccountText(title);
  section.className = "account-booking-section";
  section.append(createElement("h1", translatedTitle));

  const list = document.createElement("div");
  list.className = "account-booking-list";
  const pagination = document.createElement("nav");
  pagination.className = "account-pagination";
  pagination.setAttribute(
    "aria-label",
    `${window.getCurrentLanguage?.() === "en" ? "Pagination" : "Пагинация"}: ${translatedTitle}`
  );
  let currentPage = 1;

  const render = () => {
    list.replaceChildren();

    if (!items.length) {
      list.append(createElement("p", "Данных пока нет."));
      pagination.hidden = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / ACCOUNT_BOOKINGS_PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * ACCOUNT_BOOKINGS_PAGE_SIZE;

    items.slice(start, start + ACCOUNT_BOOKINGS_PAGE_SIZE).forEach((item) => {
      list.append(createBookingItem(item, data, canCancel));
    });

    renderAccountPagination(pagination, currentPage, totalPages, (nextPage) => {
      currentPage = nextPage;
      render();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  render();
  section.append(list, pagination);
  return section;
}

function renderAccountPagination(container, currentPage, totalPages, onPageChange) {
  container.hidden = totalPages <= 1;
  container.replaceChildren();

  if (totalPages <= 1) {
    return;
  }

  const prev = createAccountPaginationButton("Назад", currentPage === 1);
  const pages = document.createElement("div");
  pages.className = "account-pagination__pages";
  const next = createAccountPaginationButton("Далее", currentPage === totalPages);

  prev.addEventListener("click", () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });

  next.addEventListener("click", () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });

  getAccountPageItems(currentPage, totalPages).forEach((item) => {
    if (item === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "account-pagination__ellipsis";
      ellipsis.textContent = "...";
      pages.append(ellipsis);
      return;
    }

    const button = document.createElement("button");
    button.className = "account-pagination__page";
    button.type = "button";
    button.textContent = String(item);
    button.setAttribute("aria-label", `${window.getCurrentLanguage?.() === "en" ? "Page" : "Страница"} ${item}`);

    if (item === currentPage) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => onPageChange(item));
    pages.append(button);
  });

  container.append(prev, pages, next);
}

function createAccountPaginationButton(text, disabled) {
  const button = document.createElement("button");
  button.className = "account-pagination__button";
  button.type = "button";
  button.textContent = text;
  button.disabled = disabled;
  return button;
}

function getAccountPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("...");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push("...");
  }

  pages.push(totalPages);
  return pages;
}

function createBookingItem(item, data, canCancel) {
  const hotel = data.hotels.get(Number(item.hotelId));
  const room = data.rooms.get(Number(item.roomId));
  const promotion = data.promotions.get(Number(item.itemId));
  const card = document.createElement("article");
  card.className = "account-booking-card";

  const image = document.createElement("img");
  image.className = "account-booking-card__image";
  image.src = getBookingImage(hotel, item);
  image.alt = getBookingTitle(hotel, item, promotion);

  const text = document.createElement("div");
  text.className = "account-booking-card__text";
  text.append(
    createElement("h2", getBookingTitle(hotel, item, promotion)),
    createElement("p", getRoomText(room, item)),
    createElement("p", formatDateRange(item.checkIn, item.checkOut)),
    createElement("strong", formatPrice(item.totalPrice))
  );

  const actions = document.createElement("div");
  actions.className = "account-booking-card__actions";
  const canPay = canCancel && item.paymentStatus !== "paid" && item.status !== "cancelled";
  const status = createElement(canPay ? "button" : "span", getPaymentText(item), "account-booking-card__status");

  if (canPay) {
    status.type = "button";
    status.addEventListener("click", () => payBooking(item.bookingIds || item.id));
  }

  if (item.status === "cancelled") {
    status.classList.add("account-booking-card__status--cancelled");
  }

  actions.append(status);

  if (canCancel) {
    const cancelButton = createElement("button", "Отменить", "account-booking-card__cancel");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => cancelBooking(item.bookingIds || item.id, item));
    actions.append(cancelButton);
  }

  card.append(image, text, actions);
  return card;
}

function createBookingData(hotels, rooms, promotions = []) {
  return {
    hotels: new Map(hotels.map((hotel) => [Number(hotel.id), hotel])),
    rooms: new Map(rooms.map((room) => [Number(room.id), room])),
    promotions: new Map(promotions.map((promotion) => [Number(promotion.id), promotion]))
  };
}

function splitBookings(bookings) {
  const today = getTodayStart();
  const active = [];
  const past = [];
  const groupedBookings = groupAccountBookings(bookings);

  groupedBookings.forEach((booking) => {
    const item = normalizeBookingForDate(booking, today);

    if (item.isPastBooking) {
      past.push(item);
    } else {
      active.push(item);
    }
  });

  active.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  past.sort((a, b) => new Date(b.checkOut) - new Date(a.checkOut));

  return { active, past };
}

function groupAccountBookings(bookings) {
  const normalized = bookings
    .map((booking) => ({
      ...booking,
      bookingIds: Array.isArray(booking.bookingIds) ? booking.bookingIds : [booking.id].filter(Boolean)
    }))
    .sort((a, b) => new Date(a.checkIn || 0) - new Date(b.checkIn || 0));
  const result = [];

  normalized.forEach((booking) => {
    const previous = result[result.length - 1];

    if (previous && canMergeAccountBookings(previous, booking)) {
      previous.checkOut = booking.checkOut;
      previous.totalPrice = Number(previous.totalPrice || 0) + Number(booking.totalPrice || 0);
      previous.bookingIds = previous.bookingIds.concat(booking.bookingIds);
      return;
    }

    const duplicate = result.find((item) => getAccountBookingKey(item) === getAccountBookingKey(booking));

    if (duplicate) {
      duplicate.bookingIds = duplicate.bookingIds.concat(booking.bookingIds);
      duplicate.totalPrice = Math.max(Number(duplicate.totalPrice || 0), Number(booking.totalPrice || 0));
      return;
    }

    result.push(booking);
  });

  return result;
}

function canMergeAccountBookings(first, second) {
  if (!first.hotelId || !second.hotelId || !first.roomId || !second.roomId) {
    return false;
  }

  return Number(first.userId) === Number(second.userId)
    && Number(first.hotelId) === Number(second.hotelId)
    && Number(first.roomId) === Number(second.roomId)
    && String(first.status) === String(second.status)
    && String(first.paymentStatus) === String(second.paymentStatus)
    && first.checkOut === second.checkIn;
}

function getAccountBookingKey(booking) {
  return [
    booking.userId,
    booking.itemType || "hotel",
    booking.itemId || "",
    booking.hotelId || "",
    booking.roomId || "",
    booking.title || "",
    booking.checkIn || "",
    booking.checkOut || "",
    booking.status || "",
    booking.paymentStatus || ""
  ].join("|");
}

function normalizeBookingForDate(booking, today) {
  const checkOut = parseDateOnly(booking.checkOut);
  const isExpired = checkOut && checkOut <= today;
  const isUnpaid = booking.paymentStatus !== "paid";
  const status = isExpired && isUnpaid ? "cancelled" : booking.status;

  return {
    ...booking,
    status,
    isPastBooking: status === "completed" || status === "cancelled" || Boolean(isExpired)
  };
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

async function cancelBooking(ids, item = {}) {
  const bookingIds = normalizeBookingIds(ids);
  const wasPaid = item.paymentStatus === "paid";

  try {
    await Promise.all(bookingIds.map((id) => fetchJson(`${API_URL}/bookings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "cancelled",
        paymentStatus: wasPaid ? "refunded" : item.paymentStatus
      })
    })));
    showAccountNotice(
      "Бронь отменена",
      wasPaid
        ? "Ваша бронь отменена. Деньги вернутся на счёт в течение недели."
        : "Ваша бронь отменена."
    );
    initAccountPage();
  } catch (error) {
    console.error(error);
    showAccountNotice("Не удалось отменить", "Проверьте JSON Server и попробуйте ещё раз.");
  }
}

async function payBooking(ids) {
  const shouldPay = window.confirm(translateAccountText("Оплатить бронь сейчас?"));

  if (!shouldPay) {
    return;
  }

  const bookingIds = normalizeBookingIds(ids);

  try {
    await Promise.all(bookingIds.map((id) => fetchJson(`${API_URL}/bookings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ paymentStatus: "paid" })
    })));
    initAccountPage();
  } catch (error) {
    console.error(error);
  }
}

function normalizeBookingIds(ids) {
  return (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
}

function showAccountNotice(title, text) {
  let modal = document.querySelector("[data-account-notice]");

  if (!modal) {
    modal = document.createElement("div");
    modal.className = "account-notice-modal";
    modal.dataset.accountNotice = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="account-notice-modal__backdrop" data-account-notice-close></div>
      <section class="account-notice" role="dialog" aria-modal="true" aria-labelledby="account-notice-title">
        <button class="account-notice__close" type="button" aria-label="Закрыть" data-account-notice-close>×</button>
        <div class="account-notice__icon" aria-hidden="true">✓</div>
        <h2 id="account-notice-title" data-account-notice-title></h2>
        <p data-account-notice-text></p>
        <button class="button button--primary account-notice__button" type="button" data-account-notice-close>Хорошо</button>
      </section>
    `;
    document.body.append(modal);
    modal.querySelectorAll("[data-account-notice-close]").forEach((button) => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
      });
    });
  }

  modal.querySelector("[data-account-notice-title]").textContent = translateAccountText(title);
  modal.querySelector("[data-account-notice-text]").textContent = translateAccountText(text);
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function getBookingTitle(hotel, item, promotion) {
  if (hotel) {
    return getAccountField(hotel, "title").toUpperCase();
  }

  if (promotion) {
    return getAccountField(promotion, "title").toUpperCase();
  }

  return String(getAccountField(item, "title") || translateAccountText("Бронирование")).toUpperCase();
}

function getRoomText(room, item) {
  if (room && room.roomNumber) {
    return `${translateAccountText("Номер")} ${room.roomNumber}`;
  }

  const details = getAccountField(item, "details");

  if (details && !isDateOnlyBookingDetail(details)) {
    return details;
  }

  return translateBookingType(item.itemType);
}

function isDateOnlyBookingDetail(value) {
  const text = String(value || "").trim();

  return /^\d{2}\.\d{2}\.\d{4}\s*[-–]\s*\d{2}\.\d{2}\.\d{4}$/.test(text)
    || /^\d{2}\.\d{2}\.\d{4}\s*·/.test(text);
}

function getPaymentText(item) {
  if (item.status === "cancelled") {
    return translateAccountText("Отменена");
  }

  return translateAccountText(item.paymentStatus === "paid" ? "Оплачено" : "Ожидает оплаты");
}

function getBookingImage(hotel, item) {
  if (!hotel || !hotel.image) {
    return resolveAccountAssetPath(item.image || "assets/images/hotels/hotel-city.jpg");
  }

  return resolveAccountAssetPath(hotel.image);
}

function resolveAccountAssetPath(path) {
  if (!path) {
    return "../../assets/images/hotels/hotel-city.jpg";
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("../") || path.startsWith("./")) {
    return path;
  }

  return `../../${path}`;
}

function translateBookingType(type) {
  const types = {
    hotel: "Проживание",
    tour: "Тур",
    promotion: "Акция",
    tariff: "Услуга"
  };

  return translateAccountText(types[type] || "Бронирование");
}

function formatDateRange(from, to) {
  return `${formatBookingDate(from)} - ${formatBookingDate(to)}`;
}

function formatBookingDate(value) {
  const date = parseDateOnly(value);

  if (!date || Number.isNaN(date.getTime())) {
    return translateAccountText("Не указано");
  }

  return date.toLocaleDateString(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function createProfileRow(label, value) {
  const row = document.createElement("div");
  row.className = "account-profile__row";
  row.append(createElement("span", label), createElement("b", value || translateAccountText("Не указано")));
  return row;
}

function createPanel(title, extraClass = "") {
  const panel = document.createElement("article");
  panel.className = extraClass ? `account-panel ${extraClass}` : "account-panel";
  panel.append(createElement("h2", title));
  return panel;
}

function createElement(tagName, text, className = "") {
  const element = document.createElement(tagName);
  element.textContent = translateAccountText(text);

  if (className) {
    element.className = className;
  }

  return element;
}

function createText(text) {
  return document.createTextNode(translateAccountText(text));
}

function createLink(href, text) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = translateAccountText(text);
  return link;
}

async function findUserByIdentifier(identifier) {
  const value = identifier.trim();
  const field = value.includes("@") ? "email" : "login";
  const users = await fetchJson(`${API_URL}/users?${field}=${encodeURIComponent(field === "email" ? value.toLowerCase() : value)}`);
  return users[0] || null;
}

async function isFieldAvailable(fieldName, value) {
  const users = await fetchJson(`${API_URL}/users?${fieldName}=${encodeURIComponent(value)}`);
  return users.length === 0;
}

async function isFieldAvailableForUser(fieldName, value, userId) {
  const users = await fetchJson(`${API_URL}/users?${fieldName}=${encodeURIComponent(value)}`);
  return users.every((user) => Number(user.id) === Number(userId));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Ошибка запроса ${url}: ${response.status}`);
  }

  return response.json();
}

function saveCurrentUser(user) {
  const { password, ...safeUser } = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  } catch (error) {
    return null;
  }
}

function clearLoginErrors(form) {
  clearFieldError(form, "identifier");
  clearFieldError(form, "password");
}

function setFieldError(form, name, message) {
  const input = form[name];
  const error = form.querySelector(`[data-error-for="${name}"]`);

  if (input) {
    input.classList.toggle("is-invalid", Boolean(message));
  }

  if (error) {
    error.textContent = translateAuthText(message || "");
  }

  return Boolean(message);
}

function clearFieldError(form, name) {
  setFieldError(form, name, "");
}

function setMessage(element, text, type = "") {
  if (!element) {
    return;
  }

  element.textContent = translateAuthText(text || "");
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function clearMessage(element) {
  setMessage(element, "");
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhone(value) {
  const phone = value.trim().replace(/[()\s-]/g, "");

  if (/^8\d{10}$/.test(phone)) {
    return `+7${phone.slice(1)}`;
  }

  if (/^7\d{10}$/.test(phone)) {
    return `+${phone}`;
  }

  return phone;
}

function buildLoginBase(firstName, lastName) {
  const first = transliterate(firstName).replace(/[^a-z]/g, "");
  const last = transliterate(lastName).replace(/[^a-z]/g, "");

  if (!first || !last) {
    return "";
  }

  return `${first}_${last}`.slice(0, 20);
}

function transliterate(text) {
  const letters = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
  };

  return text.trim().toLowerCase().split("").map((letter) => letters[letter] || letter).join("");
}

function getFullName(user) {
  return [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) {
    return translateAccountText("Не указано");
  }

  return new Date(value).toLocaleDateString(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU");
}

function formatPrice(value) {
  return window.formatLocalizedCurrency
    ? window.formatLocalizedCurrency(value)
    : `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function getAccountField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function translateAccountText(text) {
  return window.translateUiText ? window.translateUiText(text) : text;
}

function translateStatus(status) {
  const statuses = {
    pending: "ожидает",
    confirmed: "подтверждено",
    completed: "завершено",
    cancelled: "отменено",
    paid: "оплачено"
  };

  return translateAccountText(statuses[status] || status || "не указан");
}

function translateItemType(type) {
  const types = {
    tariff: "услуга",
    promotion: "акция",
    hotel: "проживание"
  };

  return translateAccountText(types[type] || type || "позиция");
}
})();
