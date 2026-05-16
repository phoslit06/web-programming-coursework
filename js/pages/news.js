const NEWS_API_URL = "http://localhost:3000/news?isActive=true&_sort=date&_order=desc";
const NEWS_PAGE_SIZE = 6;
const NEWS_ASSET_PREFIX = "../../";

document.addEventListener("DOMContentLoaded", initNewsPage);

async function initNewsPage() {
  const page = getNewsElements();

  if (!page.list || !page.template) {
    return;
  }

  try {
    const news = await fetchJson(NEWS_API_URL);
    setupNewsPage(page, news);
  } catch (error) {
    console.error("Не удалось загрузить новости:", error);
    page.list.replaceChildren(createMessage("Данные временно недоступны"));
    page.pagination.hidden = true;
  }
}

function getNewsElements() {
  return {
    list: document.querySelector("[data-news-list]"),
    pagination: document.querySelector("[data-news-pagination]"),
    prev: document.querySelector("[data-news-prev]"),
    next: document.querySelector("[data-news-next]"),
    pages: document.querySelector("[data-news-pages]"),
    template: document.querySelector("#news-card-template")
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  return response.json();
}

function setupNewsPage(page, news) {
  const activeNews = Array.isArray(news) ? getUniqueNews(news) : [];
  let currentPage = 1;
  const totalPages = Math.max(1, Math.ceil(activeNews.length / NEWS_PAGE_SIZE));

  const render = () => {
    renderNews(page, activeNews, currentPage);
    renderPagination(page, currentPage, totalPages, (nextPage) => {
      currentPage = nextPage;
      render();
      page.list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  render();
}

function getUniqueNews(news) {
  const items = [];
  const usedIds = new Set();
  const usedTitles = new Set();

  news.forEach((item) => {
    const title = String(item.title || "").trim().toLowerCase();
    const hasTitle = title.length > 0;

    if (usedIds.has(item.id) || (hasTitle && usedTitles.has(title))) {
      return;
    }

    usedIds.add(item.id);

    if (hasTitle) {
      usedTitles.add(title);
    }

    items.push(item);
  });

  return items;
}

function renderNews(page, news, currentPage) {
  page.list.replaceChildren();

  if (!news.length) {
    page.list.append(createMessage("Данные временно недоступны"));
    page.pagination.hidden = true;
    return;
  }

  const start = (currentPage - 1) * NEWS_PAGE_SIZE;
  const items = news.slice(start, start + NEWS_PAGE_SIZE);
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const card = page.template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector("[data-news-link]");
    const image = card.querySelector("[data-news-image]");
    const date = card.querySelector("[data-news-date]");
    const title = card.querySelector("[data-news-title]");
    const text = card.querySelector("[data-news-text]");

    link.href = `news.html#news-${item.id}`;
    link.setAttribute("aria-label", `Открыть новость: ${item.title}`);
    card.id = `news-${item.id}`;
    image.src = resolveAssetPath(item.image);
    image.alt = item.title;
    date.dateTime = item.date;
    date.textContent = formatDate(item.date);
    title.textContent = item.title;
    text.textContent = item.shortText;

    fragment.append(card);
  });

  page.list.append(fragment);
}

function renderPagination(page, currentPage, totalPages, onPageChange) {
  page.pagination.hidden = totalPages <= 1;
  page.pages.replaceChildren();

  if (totalPages <= 1) {
    return;
  }

  page.prev.disabled = currentPage === 1;
  page.next.disabled = currentPage === totalPages;

  page.prev.onclick = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  page.next.onclick = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  getPageItems(currentPage, totalPages).forEach((item) => {
    if (item === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "news-pagination__ellipsis";
      ellipsis.textContent = "...";
      page.pages.append(ellipsis);
      return;
    }

    const button = document.createElement("button");
    button.className = "news-pagination__page";
    button.type = "button";
    button.textContent = String(item);
    button.setAttribute("aria-label", `Страница ${item}`);

    if (item === currentPage) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => onPageChange(item));
    page.pages.append(button);
  });
}

function getPageItems(currentPage, totalPages) {
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

function resolveAssetPath(path) {
  if (!path) {
    return "";
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${NEWS_ASSET_PREFIX}${path}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "news-message";
  message.textContent = text;
  return message;
}
