const CONTACTS_API_URL = "http://localhost:3000";
const CONTACTS_USER_KEY = "eurasiaCurrentUser";
const CONTACTS_REVIEWS_PAGE_SIZE = 4;

let contactsReviews = [];
let contactsReviewsPage = 1;

document.addEventListener("DOMContentLoaded", initContactsPage);
window.addEventListener("eurasia:user-change", fillReviewUserName);
window.addEventListener("eurasia:user-change", renderContactsReviews);

function initContactsPage() {
  fillReviewUserName();
  initReviewForm();
  loadReviews();
}

function getContactsElements() {
  return {
    form: document.querySelector("[data-review-form]"),
    message: document.querySelector("[data-review-message]"),
    list: document.querySelector("[data-reviews-list]"),
    pagination: document.querySelector("[data-reviews-pagination]"),
    prev: document.querySelector("[data-reviews-prev]"),
    next: document.querySelector("[data-reviews-next]"),
    pages: document.querySelector("[data-reviews-pages]")
  };
}

function initReviewForm() {
  const page = getContactsElements();

  if (!page.form) {
    return;
  }

  page.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearReviewMessage(page);

    const formData = new FormData(page.form);
    const userName = String(formData.get("userName") || "").trim();
    const text = String(formData.get("text") || "").trim();
    const rating = Number(formData.get("rating"));

    if (userName.length < 2) {
      setReviewMessage(page, "Введите имя не короче 2 символов.", "error");
      return;
    }

    if (text.length < 10) {
      setReviewMessage(page, "Отзыв должен быть не короче 10 символов.", "error");
      return;
    }

    try {
      const user = getReviewCurrentUser();
      const review = {
        userId: user ? user.id : null,
        userName,
        rating,
        text,
        date: new Date().toISOString().slice(0, 10),
        isPublished: true
      };

      const savedReview = await contactsFetchJson(`${CONTACTS_API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(review)
      });

      contactsReviews = [savedReview, ...contactsReviews];
      contactsReviewsPage = 1;
      renderContactsReviews();
      page.form.reset();
      fillReviewUserName();
      setReviewMessage(page, "Спасибо, отзыв добавлен.", "success");
    } catch (error) {
      console.error("Не удалось отправить отзыв:", error);
      setReviewMessage(page, "Не удалось отправить отзыв. Проверьте JSON Server.", "error");
    }
  });
}

async function loadReviews() {
  const page = getContactsElements();

  if (!page.list) {
    return;
  }

  try {
    const reviews = await contactsFetchJson(`${CONTACTS_API_URL}/reviews?isPublished=true`);
    contactsReviews = Array.isArray(reviews) ? sortReviews(reviews) : [];
    contactsReviewsPage = 1;
    renderContactsReviews();
  } catch (error) {
    console.error("Не удалось загрузить отзывы:", error);
    page.list.replaceChildren(createContactsMessage("Отзывы временно недоступны."));

    if (page.pagination) {
      page.pagination.hidden = true;
    }
  }
}

function renderContactsReviews() {
  const page = getContactsElements();

  if (!page.list) {
    return;
  }

  page.list.replaceChildren();

  if (!contactsReviews.length) {
    page.list.append(createContactsMessage("Пока нет отзывов. Будьте первым."));

    if (page.pagination) {
      page.pagination.hidden = true;
    }

    return;
  }

  const totalPages = Math.max(1, Math.ceil(contactsReviews.length / CONTACTS_REVIEWS_PAGE_SIZE));
  contactsReviewsPage = Math.min(contactsReviewsPage, totalPages);

  const start = (contactsReviewsPage - 1) * CONTACTS_REVIEWS_PAGE_SIZE;
  const fragment = document.createDocumentFragment();

  contactsReviews.slice(start, start + CONTACTS_REVIEWS_PAGE_SIZE).forEach((review) => {
    fragment.append(createReviewCard(review));
  });

  page.list.append(fragment);
  renderContactsReviewsPagination(page, totalPages);
}

function createReviewCard(review) {
  const card = document.createElement("article");
  card.className = "contacts-review-card";

  const top = document.createElement("div");
  top.className = "contacts-review-card__top";

  const name = document.createElement("h3");
  name.textContent = review.userName || "Гость";

  const rating = document.createElement("span");
  rating.className = "contacts-review-card__rating";
  rating.textContent = `${Number(review.rating) || 5}/5`;

  top.append(name, rating);

  const text = document.createElement("p");
  text.textContent = review.text || "";

  const date = document.createElement("time");
  date.dateTime = review.date || "";
  date.textContent = formatContactsDate(review.date);

  card.append(top, text, date);

  if (isContactsAdmin()) {
    const actions = document.createElement("div");
    actions.className = "admin-card-actions";

    const deleteButton = document.createElement("button");
    deleteButton.className = "admin-card-action admin-card-action--danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Удалить";
    deleteButton.addEventListener("click", () => deleteReview(review));

    actions.append(deleteButton);
    card.append(actions);
  }

  return card;
}

async function deleteReview(review) {
  const shouldDelete = await window.EurasiaAdminUI.confirm({
    title: "Удалить отзыв",
    text: `Отзыв пользователя "${review.userName || "Гость"}" будет удален из каталога.`,
    confirmText: "Удалить"
  });

  if (!shouldDelete) {
    return;
  }

  try {
    await contactsFetchJson(`${CONTACTS_API_URL}/reviews/${review.id}`, {
      method: "DELETE"
    });
    contactsReviews = contactsReviews.filter((item) => item.id !== review.id);
    renderContactsReviews();
  } catch (error) {
    console.error("Не удалось удалить отзыв:", error);
    window.EurasiaAdminUI.notice({
      title: "Не удалось удалить",
      text: "Проверьте, запущен ли JSON Server."
    });
  }
}

function renderContactsReviewsPagination(page, totalPages) {
  if (!page.pagination || !page.pages || !page.prev || !page.next) {
    return;
  }

  page.pagination.hidden = totalPages <= 1;
  page.pages.replaceChildren();

  if (totalPages <= 1) {
    return;
  }

  page.prev.disabled = contactsReviewsPage === 1;
  page.next.disabled = contactsReviewsPage === totalPages;

  page.prev.onclick = () => changeContactsReviewsPage(contactsReviewsPage - 1);
  page.next.onclick = () => changeContactsReviewsPage(contactsReviewsPage + 1);

  getContactsPageItems(contactsReviewsPage, totalPages).forEach((item) => {
    if (item === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "contacts-reviews-pagination__ellipsis";
      ellipsis.textContent = "...";
      page.pages.append(ellipsis);
      return;
    }

    const button = document.createElement("button");
    button.className = "contacts-reviews-pagination__page";
    button.type = "button";
    button.textContent = String(item);
    button.setAttribute("aria-label", `${window.getCurrentLanguage?.() === "en" ? "Page" : "Страница"} ${item}`);

    if (item === contactsReviewsPage) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => changeContactsReviewsPage(item));
    page.pages.append(button);
  });
}

function changeContactsReviewsPage(pageNumber) {
  contactsReviewsPage = pageNumber;
  renderContactsReviews();
  document.querySelector(".contacts-reviews__catalog")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function getContactsPageItems(currentPage, totalPages) {
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

function fillReviewUserName() {
  const form = document.querySelector("[data-review-form]");
  const input = form ? form.userName : null;
  const user = getReviewCurrentUser();

  if (!input || !user) {
    return;
  }

  const name = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ").trim();
  input.value = name || user.login || user.email || "";
}

function sortReviews(reviews) {
  return reviews
    .filter((review) => review && review.isPublished !== false)
    .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
}

async function contactsFetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса ${url}: ${response.status}`);
  }

  return response.json();
}

function getReviewCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CONTACTS_USER_KEY));
  } catch (error) {
    return null;
  }
}

function isContactsAdmin() {
  const user = getReviewCurrentUser();
  return user && user.role === "admin";
}

function createContactsMessage(text) {
  const message = document.createElement("p");
  message.className = "contacts-reviews__message";
  message.textContent = text;
  return message;
}

function setReviewMessage(page, text, type) {
  if (!page.message) {
    return;
  }

  page.message.textContent = text;
  page.message.classList.toggle("is-error", type === "error");
  page.message.classList.toggle("is-success", type === "success");
}

function clearReviewMessage(page) {
  setReviewMessage(page, "", "");
}

function formatContactsDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
