const NEWS_API_URL = "http://localhost:3000/news?isActive=true&_sort=date&_order=desc";
const NEWS_COLLECTION_URL = "http://localhost:3000/news";
const NEWS_PAGE_SIZE = 6;
const NEWS_ASSET_PREFIX = "../../";
const newsPageState = {
  page: null,
  items: [],
  currentPage: 1
};

document.addEventListener("DOMContentLoaded", initNewsPage);
window.addEventListener("eurasia:user-change", () => {
  if (newsPageState.page) {
    renderNewsAdminPanel(newsPageState.page);
    renderCurrentNewsPage();
  }
});

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function setupNewsPage(page, news) {
  newsPageState.page = page;
  newsPageState.items = Array.isArray(news) ? getUniqueNews(news) : [];
  newsPageState.currentPage = 1;
  renderNewsAdminPanel(page);
  renderCurrentNewsPage();
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

function renderCurrentNewsPage() {
  const page = newsPageState.page;
  const totalPages = Math.max(1, Math.ceil(newsPageState.items.length / NEWS_PAGE_SIZE));
  newsPageState.currentPage = Math.min(newsPageState.currentPage, totalPages);

  renderNews(page, newsPageState.items, newsPageState.currentPage);
  renderPagination(page, newsPageState.currentPage, totalPages, (nextPage) => {
    newsPageState.currentPage = nextPage;
    renderCurrentNewsPage();
    page.list.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderNewsAdminPanel(page) {
  document.querySelector("[data-news-admin-panel]")?.remove();

  if (!isNewsAdmin()) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.dataset.newsAdminPanel = "";

  const title = document.createElement("h2");
  title.className = "admin-panel__title";
  title.textContent = "Управление новостями";

  const text = document.createElement("p");
  text.className = "admin-panel__text";
  text.textContent = "Можно добавить новую новость, редактировать или удалить существующую.";

  const addButton = document.createElement("button");
  addButton.className = "admin-button";
  addButton.type = "button";
  addButton.textContent = "Добавить новость";
  addButton.addEventListener("click", addNewsItem);

  panel.append(title, text, addButton);
  page.list.parentNode.insertBefore(panel, page.list);
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

    if (isNewsAdmin()) {
      card.append(createNewsAdminActions(item));
    }

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

function createNewsAdminActions(item) {
  const actions = document.createElement("div");
  actions.className = "admin-card-actions";

  const editButton = document.createElement("button");
  editButton.className = "admin-card-action";
  editButton.type = "button";
  editButton.textContent = "Редактировать";
  editButton.addEventListener("click", () => editNewsItem(item));

  const deleteButton = document.createElement("button");
  deleteButton.className = "admin-card-action admin-card-action--danger";
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", () => deleteNewsItem(item));

  actions.append(editButton, deleteButton);
  return actions;
}

async function addNewsItem() {
  const data = await getNewsEditorData();

  if (!data) {
    return;
  }

  try {
    const saved = await fetchJson(NEWS_COLLECTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (saved) {
      newsPageState.items = getUniqueNews([saved, ...newsPageState.items]);
      newsPageState.currentPage = 1;
      renderCurrentNewsPage();
    }
  } catch (error) {
    console.error("Не удалось добавить новость:", error);
    window.EurasiaAdminUI.notice({
      title: "Новость не добавлена",
      text: "Не удалось добавить новость. Проверьте JSON Server."
    });
  }
}

async function editNewsItem(item) {
  const data = await getNewsEditorData(item);

  if (!data) {
    return;
  }

  try {
    const saved = await fetchJson(`${NEWS_COLLECTION_URL}/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    Object.assign(item, saved || data);
    renderCurrentNewsPage();
  } catch (error) {
    console.error("Не удалось изменить новость:", error);
    window.EurasiaAdminUI.notice({
      title: "Новость не сохранена",
      text: "Не удалось изменить новость. Проверьте JSON Server."
    });
  }
}

async function deleteNewsItem(item) {
  const shouldDelete = await window.EurasiaAdminUI.confirm({
    title: "Удалить новость",
    text: `Новость "${item.title}" будет удалена со страницы.`,
    confirmText: "Удалить"
  });

  if (!shouldDelete) {
    return;
  }

  try {
    await fetchJson(`${NEWS_COLLECTION_URL}/${item.id}`, {
      method: "DELETE"
    });
    newsPageState.items = newsPageState.items.filter((newsItem) => newsItem.id !== item.id);
    renderCurrentNewsPage();
  } catch (error) {
    console.error("Не удалось удалить новость:", error);
    window.EurasiaAdminUI.notice({
      title: "Новость не удалена",
      text: "Не удалось удалить новость. Проверьте JSON Server."
    });
  }
}

async function getNewsEditorData(item = {}) {
  const data = await window.EurasiaAdminUI.form({
    title: item.id ? "Редактировать новость" : "Новая новость",
    submitText: item.id ? "Сохранить" : "Добавить",
    fields: [
      { name: "title", label: "Заголовок", value: item.title || "", required: true },
      { name: "shortText", label: "Краткое описание", type: "textarea", value: item.shortText || "", required: true },
      { name: "date", label: "Дата", type: "date", value: item.date || new Date().toISOString().slice(0, 10), required: true },
      { name: "image", label: "Выберите изображение", type: "file", accept: "image/*", value: item.image || "assets/images/news/news-01.jpg", required: true },
      { name: "fullText", label: "Полный текст", type: "textarea", rows: 5, value: item.fullText || item.shortText || "" }
    ]
  });

  if (!data) {
    return null;
  }

  return {
    title: data.title.trim(),
    date: data.date.trim(),
    category: item.category || "news",
    shortText: data.shortText.trim(),
    fullText: String(data.fullText || data.shortText).trim(),
    image: data.image.trim(),
    isActive: item.isActive !== false,
    showOnHome: item.showOnHome === true
  };
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

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("data:") || path.startsWith("blob:")) {
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

function isNewsAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem("eurasiaCurrentUser"));
    return user && user.role === "admin";
  } catch (error) {
    return false;
  }
}
