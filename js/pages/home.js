
const API_URL = "http://localhost:3000";
const PROMOTIONS_URL = `${API_URL}/promotions?isActive=true&showOnHome=true&_sort=validFrom&_order=desc&_limit=4`;
const NEWS_URL = `${API_URL}/news?isActive=true&showOnHome=true&_sort=date&_order=desc&_limit=2`;
const ALL_PROMOTIONS_URL = `${API_URL}/promotions?isActive=true&_sort=id&_order=asc`;
const ALL_NEWS_URL = `${API_URL}/news?isActive=true&_sort=date&_order=desc`;
const SLIDER_INTERVAL = 5000;

document.addEventListener("DOMContentLoaded", initHomePage);

async function initHomePage() {
  const page = getHomeElements();

  if (!page.slider || !page.promotionsList || !page.newsList) {
    return;
  }

  try {
    const [promotions, news] = await Promise.all([
      fetchJson(PROMOTIONS_URL),
      fetchJson(NEWS_URL)
    ]);

    const promotionItems = promotions.map((item) => ({
      ...item,
      sourceType: "promotion",
      link: "pages/tours/tours.html"
    }));

    const newsItems = news.map((item) => ({
      ...item,
      sourceType: "news",
      link: "pages/news/news.html"
    }));

    renderPromotions(page, promotionItems);
    renderNews(page, newsItems);
    renderSlider(page, [...promotionItems, ...newsItems]);
    initHomeAdmin(page);
  } catch (error) {
    console.error("Не удалось загрузить данные главной страницы:", error);
    showDataError(page);
  }

  window.addEventListener("eurasia:user-change", () => initHomeAdmin(page));
}

function getHomeElements() {
  return {
    slider: document.querySelector("[data-home-slider]"),
    sliderViewport: document.querySelector("[data-slider-viewport]"),
    sliderControls: document.querySelector("[data-slider-controls]"),
    sliderPrev: document.querySelector("[data-slider-prev]"),
    sliderNext: document.querySelector("[data-slider-next]"),
    sliderDots: document.querySelector("[data-slider-dots]"),
    promotionsList: document.querySelector("[data-home-promotions]"),
    newsList: document.querySelector("[data-home-news]"),
    slideTemplate: document.querySelector("#home-slide-template"),
    promotionTemplate: document.querySelector("#promotion-card-template"),
    newsTemplate: document.querySelector("#news-card-template")
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  return response.json();
}

function initHomeAdmin(page) {
  document.querySelector("[data-home-admin-panel]")?.remove();
  document.querySelector("[data-home-admin-modal]")?.remove();

  if (!isHomeAdmin()) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.dataset.homeAdminPanel = "";

  const title = document.createElement("h2");
  title.className = "admin-panel__title";
  title.textContent = "Управление главной";

  const text = document.createElement("p");
  text.className = "admin-panel__text";
  text.textContent = "Выберите 4 акции или тура и 2 новости, которые будут показаны на главной странице.";

  const button = document.createElement("button");
  button.className = "admin-button";
  button.type = "button";
  button.textContent = "Настроить главную";
  button.addEventListener("click", () => openHomeAdminModal());

  panel.append(title, text, button);

  const anchor = page.promotionsList.closest("section") || page.promotionsList;
  anchor.parentNode.insertBefore(panel, anchor);
}

async function openHomeAdminModal() {
  const oldModal = document.querySelector("[data-home-admin-modal]");
  if (oldModal) {
    oldModal.hidden = false;
    document.body.classList.add("modal-open");
    return;
  }

  const modal = createHomeAdminModal();
  document.body.append(modal);
  document.body.classList.add("modal-open");

  const message = modal.querySelector("[data-admin-message]");
  const content = modal.querySelector("[data-admin-content]");
  message.textContent = "Загрузка списков...";

  try {
    const [promotions, news] = await Promise.all([
      fetchJson(ALL_PROMOTIONS_URL),
      fetchJson(ALL_NEWS_URL)
    ]);

    content.replaceChildren(
      createHomeAdminChecks("Акции и туры", "home-promotion", promotions),
      createHomeAdminChecks("Новости", "home-news", news)
    );
    message.textContent = "";
    modal.querySelector("[data-admin-save]").disabled = false;
    modal.querySelector("[data-admin-save]").addEventListener("click", () => saveHomeAdminSelection(modal, promotions, news));
  } catch (error) {
    console.error("Не удалось загрузить элементы главной:", error);
    message.textContent = "Не удалось загрузить списки. Проверьте JSON Server.";
    message.classList.add("is-error");
  }
}

function createHomeAdminModal() {
  const modal = document.createElement("div");
  modal.className = "admin-modal";
  modal.dataset.homeAdminModal = "";

  const dialog = document.createElement("div");
  dialog.className = "admin-modal__dialog";

  const head = document.createElement("div");
  head.className = "admin-modal__head";

  const title = document.createElement("h2");
  title.className = "admin-modal__title";
  title.textContent = "Главная страница";

  const close = document.createElement("button");
  close.className = "admin-modal__close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => closeHomeAdminModal(modal));

  const content = document.createElement("div");
  content.className = "admin-check-grid";
  content.dataset.adminContent = "";

  const message = document.createElement("p");
  message.className = "admin-panel__message";
  message.dataset.adminMessage = "";

  const actions = document.createElement("div");
  actions.className = "admin-panel__actions";

  const save = document.createElement("button");
  save.className = "admin-button";
  save.type = "button";
  save.textContent = "Сохранить";
  save.disabled = true;
  save.dataset.adminSave = "";

  actions.append(save);
  head.append(title, close);
  dialog.append(head, content, message, actions);
  modal.append(dialog);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeHomeAdminModal(modal);
    }
  });

  return modal;
}

function closeHomeAdminModal(modal) {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function createHomeAdminChecks(titleText, name, items) {
  const group = document.createElement("div");
  group.className = "admin-check-group";

  const title = document.createElement("h3");
  title.textContent = titleText;
  group.append(title);

  items.forEach((item) => {
    const label = document.createElement("label");
    label.className = "admin-check-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = item.id;
    input.checked = item.showOnHome === true;

    const text = document.createElement("span");
    text.textContent = getHomeField(item, "title");

    label.append(input, text);
    group.append(label);
  });

  return group;
}

async function saveHomeAdminSelection(modal, promotions, news) {
  const message = modal.querySelector("[data-admin-message]");
  const save = modal.querySelector("[data-admin-save]");
  const promotionIds = getCheckedIds(modal, "home-promotion");
  const newsIds = getCheckedIds(modal, "home-news");

  message.className = "admin-panel__message";

  if (promotionIds.length !== 4 || newsIds.length !== 2) {
    message.textContent = "Нужно выбрать ровно 4 акции или тура и ровно 2 новости.";
    message.classList.add("is-error");
    return;
  }

  save.disabled = true;
  message.textContent = "Сохраняем...";

  try {
    await Promise.all([
      ...promotions.map((item) => patchHomeItem("promotions", item.id, {
        showOnHome: promotionIds.includes(Number(item.id))
      })),
      ...news.map((item) => patchHomeItem("news", item.id, {
        showOnHome: newsIds.includes(Number(item.id))
      }))
    ]);

    message.textContent = "Главная обновлена.";
    message.classList.add("is-success");
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    console.error("Не удалось сохранить главную:", error);
    message.textContent = "Не удалось сохранить. Проверьте JSON Server.";
    message.classList.add("is-error");
    save.disabled = false;
  }
}

function patchHomeItem(collection, id, data) {
  return fetchJson(`${API_URL}/${collection}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

function getCheckedIds(modal, name) {
  return Array.from(modal.querySelectorAll(`input[name="${name}"]:checked`))
    .map((input) => Number(input.value));
}

function isHomeAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem("eurasiaCurrentUser"));
    return user && user.role === "admin";
  } catch (error) {
    return false;
  }
}

function renderPromotions(page, promotions) {
  page.promotionsList.replaceChildren();

  if (!promotions.length) {
    page.promotionsList.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  promotions.forEach((promotion) => {
    const card = page.promotionTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("[data-promotion-image]");
    const title = card.querySelector("[data-promotion-title]");
    const text = card.querySelector("[data-promotion-text]");
    const meta = card.querySelector("[data-promotion-meta]");

    card.href = promotion.link;
    const promotionTitle = getHomeField(promotion, "title");
    card.setAttribute("aria-label", promotionTitle);
    image.src = promotion.image;
    image.alt = promotionTitle;
    title.textContent = promotionTitle;
    text.textContent = getHomeField(promotion, "description");
    meta.textContent = getPromotionMeta(promotion);

    fragment.append(card);
  });

  page.promotionsList.append(fragment);
}

function renderNews(page, news) {
  page.newsList.replaceChildren();

  if (!news.length) {
    page.newsList.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  news.forEach((item) => {
    const card = page.newsTemplate.content.firstElementChild.cloneNode(true);
    const link = card.querySelector(".news-card__link");
    const image = card.querySelector("[data-news-image]");
    const title = card.querySelector("[data-news-title]");
    const date = card.querySelector("[data-news-date]");

    link.href = item.link;
    const newsTitle = getHomeField(item, "title");
    link.setAttribute("aria-label", newsTitle);
    image.src = item.image;
    image.alt = newsTitle;
    title.textContent = newsTitle;
    date.textContent = formatDate(item.date);

    fragment.append(card);
  });

  page.newsList.append(fragment);
}

function renderSlider(page, items) {
  page.sliderViewport.replaceChildren();
  page.sliderDots.replaceChildren();

  if (!items.length) {
    page.sliderViewport.append(createFallbackSlide());
    page.sliderControls.hidden = true;
    return;
  }

  const slides = [];
  const dots = [];
  const slideFragment = document.createDocumentFragment();
  const dotFragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const slide = createSlide(page, item, index);
    const dot = createSliderDot(item, index);

    slides.push(slide);
    dots.push(dot);
    slideFragment.append(slide);
    dotFragment.append(dot);
  });

  page.sliderViewport.append(slideFragment);
  page.sliderDots.append(dotFragment);
  page.sliderControls.hidden = items.length < 2;

  setupSliderControls(page, slides, dots);
}

function createSlide(page, item, index) {
  const slide = page.slideTemplate.content.firstElementChild.cloneNode(true);
  const image = slide.querySelector("[data-slide-image]");
  const title = slide.querySelector("[data-slide-title]");
  const text = slide.querySelector("[data-slide-text]");
  const link = slide.querySelector("[data-slide-link]");
  const titleText = getHomeField(item, "title");

  slide.classList.add(`home-slider__slide--${index + 1}`);
  slide.style.backgroundImage = `url("${item.image}")`;
  image.src = item.image;
  image.alt = titleText;

  if (index === 0) {
    const heading = document.createElement("h1");
    heading.id = "hero-title";
    heading.textContent = titleText;
    title.replaceWith(heading);
  } else {
    title.textContent = titleText;
  }

  text.textContent = item.sourceType === "promotion"
    ? getHomeField(item, "description")
    : getHomeField(item, "shortText");
  link.href = item.link;
  const openLabel = window.getCurrentLanguage?.() === "en" ? "Open" : "Перейти";
  link.setAttribute("aria-label", `${openLabel}: ${titleText}`);

  if (index === 0) {
    slide.classList.add("is-active");
  }

  return slide;
}

function createSliderDot(item, index) {
  const dot = document.createElement("button");
  dot.className = "slider-dot";
  dot.type = "button";
  dot.textContent = String(index + 1);
  dot.setAttribute("aria-label", translateHomeText(`Открыть слайд: ${getHomeField(item, "title")}`));
  dot.dataset.slideIndex = String(index);

  if (index === 0) {
    dot.classList.add("is-active");
  }

  return dot;
}

function setupSliderControls(page, slides, dots) {
  let activeIndex = 0;
  let timerId = null;

  const setActiveSlide = (nextIndex) => {
    activeIndex = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeIndex);
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
      dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    });
  };

  const startAutoPlay = () => {
    if (slides.length < 2 || timerId || document.body.classList.contains("accessibility-mode")) {
      return;
    }

    timerId = window.setInterval(() => {
      setActiveSlide(activeIndex + 1);
    }, SLIDER_INTERVAL);
  };

  const stopAutoPlay = () => {
    if (!timerId) {
      return;
    }

    window.clearInterval(timerId);
    timerId = null;
  };

  page.sliderPrev.onclick = () => setActiveSlide(activeIndex - 1);
  page.sliderNext.onclick = () => setActiveSlide(activeIndex + 1);

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setActiveSlide(Number(dot.dataset.slideIndex));
    });
  });

  page.slider.addEventListener("mouseenter", stopAutoPlay);
  page.slider.addEventListener("mouseleave", startAutoPlay);
  page.slider.addEventListener("focusin", stopAutoPlay);
  page.slider.addEventListener("focusout", (event) => {
    if (!page.slider.contains(event.relatedTarget)) {
      startAutoPlay();
    }
  });

  setActiveSlide(0);
  startAutoPlay();
}

function createFallbackSlide() {
  const slide = document.createElement("article");
  slide.className = "hero-card home-slider__slide is-active";
  slide.innerHTML = `
    <div class="hero-card__content">
      <h1 id="hero-title" data-i18n="text.948c007e46d5">Данные временно недоступны</h1>
      <p data-i18n="text.8f5a6a0c823c">Запустите JSON Server командой npm run server, чтобы загрузить актуальные акции и новости.</p>
    </div>
  `;

  window.refreshPageTranslations?.();
  return slide;
}

function showDataError(page) {
  page.sliderViewport.replaceChildren(createFallbackSlide());
  page.sliderControls.hidden = true;
  page.sliderDots.replaceChildren();
  page.promotionsList.replaceChildren(createMessage("Данные временно недоступны"));
  page.newsList.replaceChildren(createMessage("Данные временно недоступны"));
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "home-message";
  message.textContent = translateHomeText(text);
  return message;
}

function getPromotionMeta(promotion) {
  const parts = [];

  const periodText = getHomeField(promotion, "periodText");

  if (periodText) {
    parts.push(periodText);
  }

  if (typeof promotion.price === "number") {
    parts.push(`${formatPrice(promotion.price)}`);
  }

  if (typeof promotion.oldPrice === "number") {
    parts.push(`${translateHomeText("старая цена")} ${formatPrice(promotion.oldPrice)}`);
  }

  return parts.join(" / ");
}

function formatPrice(value) {
  return window.formatLocalizedCurrency
    ? window.formatLocalizedCurrency(value)
    : `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function getHomeField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function getHomeText(key, fallback) {
  return window.getTranslation ? window.getTranslation(key) : fallback;
}

function translateHomeText(text) {
  return window.translateUiText ? window.translateUiText(text) : text;
}
