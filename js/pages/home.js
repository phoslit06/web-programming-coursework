const API_URL = "http://localhost:3000";
const PROMOTIONS_URL = `${API_URL}/promotions?isActive=true&showOnHome=true&_sort=validFrom&_order=desc&_limit=4`;
const NEWS_URL = `${API_URL}/news?isActive=true&showOnHome=true&_sort=date&_order=desc&_limit=2`;
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
  } catch (error) {
    console.error("Не удалось загрузить данные главной страницы:", error);
    showDataError(page);
  }
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

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  return response.json();
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
    card.setAttribute("aria-label", promotion.title);
    image.src = promotion.image;
    image.alt = promotion.title;
    title.textContent = promotion.title;
    text.textContent = promotion.description;
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
    link.setAttribute("aria-label", item.title);
    image.src = item.image;
    image.alt = item.title;
    title.textContent = item.title;
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
  const titleText = item.title;

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

  text.textContent = item.sourceType === "promotion" ? item.description : item.shortText;
  link.href = item.link;
  link.setAttribute("aria-label", `Перейти: ${titleText}`);

  if (index === 0) {
    slide.classList.add("is-active");
  }

  return slide;
}

function createSliderDot(item, index) {
  const dot = document.createElement("button");
  dot.className = "slider-dot";
  dot.type = "button";
  dot.setAttribute("aria-label", `Открыть слайд: ${item.title}`);
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
    if (slides.length < 2 || timerId) {
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
      <h1 id="hero-title">Данные временно недоступны</h1>
      <p>Запустите JSON Server командой npm run server, чтобы загрузить актуальные акции и новости.</p>
    </div>
  `;
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
  message.textContent = text;
  return message;
}

function getPromotionMeta(promotion) {
  const parts = [];

  if (promotion.periodText) {
    parts.push(promotion.periodText);
  }

  if (typeof promotion.price === "number") {
    parts.push(`${formatPrice(promotion.price)}`);
  }

  if (typeof promotion.oldPrice === "number") {
    parts.push(`старая цена ${formatPrice(promotion.oldPrice)}`);
  }

  return parts.join(" / ");
}

function formatPrice(value) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
