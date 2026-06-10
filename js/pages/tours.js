const TOURS_API_URL = "http://localhost:3000";
const TOURS_CURRENT_USER_KEY = "eurasiaCurrentUser";
const TOURS_ASSET_PREFIX = "../../";
const TOURS_DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const TOURS_DAY_OPTIONS = [
  { value: "monday", label: "Понедельник", short: "пн" },
  { value: "tuesday", label: "Вторник", short: "вт" },
  { value: "wednesday", label: "Среда", short: "ср" },
  { value: "thursday", label: "Четверг", short: "чт" },
  { value: "friday", label: "Пятница", short: "пт" },
  { value: "saturday", label: "Суббота", short: "сб" },
  { value: "sunday", label: "Воскресенье", short: "вс" }
];
const TOURS_DAY_VALUES = TOURS_DAY_OPTIONS.map((day) => day.value);
const TOURS_PAGE_SIZE = {
  tours: 4,
  promotions: 6
};

let loadedTourItems = [];
let loadedBookings = [];
let loadedOrders = [];
let paginationState = {
  tours: 1,
  promotions: 1
};
let bookingState = {
  item: null,
  user: null,
  message: null,
  month: null,
  selectedDate: null
};

document.addEventListener("DOMContentLoaded", initToursPage);

async function initToursPage() {
  const page = getToursPageElements();

  if (!page.toursList || !page.promotionsList || !page.template) {
    return;
  }

  setupBookingModal(page);

  try {
    const [items, bookings, orders] = await Promise.all([
      fetchToursJson(`${TOURS_API_URL}/promotions?isActive=true&_sort=id&_order=asc`),
      fetchToursJson(`${TOURS_API_URL}/bookings`),
      fetchToursJson(`${TOURS_API_URL}/orders`)
    ]);
    loadedTourItems = Array.isArray(items) ? items : [];
    loadedBookings = Array.isArray(bookings) ? bookings : [];
    loadedOrders = Array.isArray(orders) ? orders : [];
    renderToursPage(page, loadedTourItems);
  } catch (error) {
    console.error("Не удалось загрузить туры и акции:", error);
    page.toursList.replaceChildren(createToursMessage("Данные временно недоступны. Проверьте JSON Server."));
    page.promotionsList.replaceChildren(createToursMessage("Данные временно недоступны. Проверьте JSON Server."));
  }

  window.addEventListener("eurasia:user-change", () => {
    closeBookingModal(page);
    if (loadedTourItems.length) {
      renderToursPage(page, loadedTourItems);
    }
  });
}

function getToursPageElements() {
  return {
    toursList: document.querySelector("[data-tours-list]"),
    promotionsList: document.querySelector("[data-promotions-list]"),
    template: document.querySelector("#tour-card-template"),
    toursPagination: document.querySelector("[data-tours-pagination]"),
    promotionsPagination: document.querySelector("[data-promotions-pagination]"),
    bookingModal: document.querySelector("[data-booking-modal]"),
    bookingTitle: document.querySelector("[data-booking-title]"),
    bookingText: document.querySelector("[data-booking-text]"),
    bookingMonth: document.querySelector("[data-booking-month]"),
    bookingCalendar: document.querySelector("[data-booking-calendar]"),
    bookingHint: document.querySelector("[data-booking-hint]"),
    bookingSelected: document.querySelector("[data-booking-selected]"),
    bookingSubmit: document.querySelector("[data-booking-submit]"),
    bookingPrev: document.querySelector("[data-booking-prev]"),
    bookingNext: document.querySelector("[data-booking-next]")
  };
}

function setupBookingModal(page) {
  if (!page.bookingModal) {
    return;
  }

  page.bookingModal.querySelectorAll("[data-booking-close]").forEach((button) => {
    button.addEventListener("click", () => closeBookingModal(page));
  });

  page.bookingPrev.addEventListener("click", () => changeBookingMonth(page, -1));
  page.bookingNext.addEventListener("click", () => changeBookingMonth(page, 1));
  page.bookingSubmit.addEventListener("click", () => submitTourBooking(page));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !page.bookingModal.hidden) {
      closeBookingModal(page);
    }
  });
}

function renderToursPage(page, items) {
  const tours = items.filter((item) => item.type === "tour");
  const promotions = items.filter((item) => item.type !== "tour");

  renderToursAdminControls(page);
  paginationState.tours = clampPage(paginationState.tours, tours.length, TOURS_PAGE_SIZE.tours);
  paginationState.promotions = clampPage(paginationState.promotions, promotions.length, TOURS_PAGE_SIZE.promotions);

  renderToursGroup(page, page.toursList, page.toursPagination, page.template, tours, "Туры временно недоступны.", "tours");
  renderToursGroup(page, page.promotionsList, page.promotionsPagination, page.template, promotions, "Акции временно недоступны.", "promotions");
}

function renderToursGroup(page, container, pagination, template, items, emptyText, groupName) {
  container.replaceChildren();

  if (!items.length) {
    container.append(createToursMessage(emptyText));
    if (pagination) {
      pagination.replaceChildren();
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  const pageSize = TOURS_PAGE_SIZE[groupName];
  const currentPage = paginationState[groupName];
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(startIndex, startIndex + pageSize);

  visibleItems.forEach((item) => {
    fragment.append(createTourCard(page, template, item));
  });

  container.append(fragment);
  renderToursPagination(page, pagination, groupName, items.length);
}

function renderToursAdminControls(page) {
  document.querySelectorAll("[data-tours-admin-panel]").forEach((panel) => panel.remove());

  if (!isToursAdmin()) {
    return;
  }

  page.toursList.parentNode.insertBefore(createToursAdminPanel("Управление турами", "Добавить тур", () => addTourItem(page, "tour")), page.toursList);
  page.promotionsList.parentNode.insertBefore(createToursAdminPanel("Управление акциями", "Добавить акцию", () => addTourItem(page, "promotion")), page.promotionsList);
}

function createToursAdminPanel(titleText, buttonText, onClick) {
  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.dataset.toursAdminPanel = "";

  const title = document.createElement("h2");
  title.className = "admin-panel__title";
  title.textContent = titleText;

  const button = document.createElement("button");
  button.className = "admin-button";
  button.type = "button";
  button.textContent = buttonText;
  button.addEventListener("click", onClick);

  panel.append(title, button);
  return panel;
}

function renderToursPagination(page, container, groupName, totalItems) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  const pageSize = TOURS_PAGE_SIZE[groupName];
  const totalPages = Math.ceil(totalItems / pageSize);
  container.hidden = totalPages <= 1;

  if (totalPages <= 1) {
    return;
  }

  const currentPage = paginationState[groupName];
  const pages = document.createElement("div");
  pages.className = "tours-pagination__pages";

  getToursPageItems(currentPage, totalPages).forEach((item) => {
    if (item === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "tours-pagination__ellipsis";
      ellipsis.textContent = "...";
      pages.append(ellipsis);
      return;
    }

    pages.append(createPaginationPageButton(String(item), groupName, item, page, item === currentPage));
  });

  container.append(
    createPaginationStepButton("Назад", "left", groupName, currentPage - 1, page, currentPage === 1),
    pages,
    createPaginationStepButton("Далее", "right", groupName, currentPage + 1, page, currentPage === totalPages)
  );
}

function createPaginationStepButton(text, direction, groupName, pageNumber, page, disabled = false) {
  const button = document.createElement("button");
  button.className = "tours-pagination__button";
  button.type = "button";
  button.disabled = disabled;
  button.append(createPaginationArrow(direction), createPaginationText(text));

  if (direction === "right") {
    button.replaceChildren(createPaginationText(text), createPaginationArrow(direction));
  }

  button.addEventListener("click", () => {
    paginationState[groupName] = pageNumber;
    renderToursPage(page, loadedTourItems);
  });

  return button;
}

function createPaginationPageButton(text, groupName, pageNumber, page, active = false) {
  const button = document.createElement("button");
  button.className = "tours-pagination__page";
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", `${window.getCurrentLanguage?.() === "en" ? "Page" : "Страница"} ${text}`);
  button.classList.toggle("is-active", active);

  if (active) {
    button.setAttribute("aria-current", "page");
  }

  button.addEventListener("click", () => {
    paginationState[groupName] = pageNumber;
    renderToursPage(page, loadedTourItems);
  });

  return button;
}

function createPaginationArrow(direction) {
  const image = document.createElement("img");
  image.src = `../../assets/images/common/icons/arrow-${direction}.svg`;
  image.alt = "";
  return image;
}

function createPaginationText(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function getToursPageItems(currentPage, totalPages) {
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

function clampPage(page, itemCount, pageSize) {
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

function createTourCard(page, template, item) {
  const card = template.content.firstElementChild.cloneNode(true);
  const image = card.querySelector("[data-tour-image]");
  const title = card.querySelector("[data-tour-title]");
  const subtitle = card.querySelector("[data-tour-subtitle]");
  const period = card.querySelector("[data-tour-period]");
  const features = card.querySelector("[data-tour-features]");
  const duration = card.querySelector("[data-tour-duration]");
  const price = card.querySelector("[data-tour-price]");
  const button = card.querySelector("[data-tour-action]");
  const message = card.querySelector("[data-tour-message]");

  card.classList.add(item.type === "tour" ? "tour-card--tour" : "tour-card--promotion");
  card.dataset.itemId = String(item.id);
  image.src = resolveToursAssetPath(item.image);
  const itemTitle = getTourField(item, "title");
  image.alt = itemTitle;
  title.textContent = itemTitle;
  subtitle.textContent = getTourField(item, "subtitle") || getItemTypeTitle(item);

  renderPeriod(period, item);
  renderFeatures(features, getTourField(item, "features"));
  renderDuration(duration, item);
  renderPrice(price, item);

  button.textContent = getTourField(item, "ctaLabel")
    || translateTourText(item.type === "tour" ? "Забронировать тур" : "Заказать");
  button.disabled = item.canAddToCart === false;

  if (item.canAddToCart === false) {
    button.textContent = "Недоступно";
  } else {
    button.addEventListener("click", (event) => handleTourAction(page, event, item, button, message));
  }

  if (isToursAdmin()) {
    card.querySelector(".tour-card__bottom").append(createTourAdminActions(page, item));
  }

  return card;
}

function createTourAdminActions(page, item) {
  const actions = document.createElement("div");
  actions.className = "admin-card-actions";

  const editButton = document.createElement("button");
  editButton.className = "admin-card-action";
  editButton.type = "button";
  editButton.textContent = "Редактировать";
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    editTourItem(page, item);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "admin-card-action admin-card-action--danger";
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteTourItem(page, item);
  });

  actions.append(editButton, deleteButton);
  return actions;
}

async function addTourItem(page, type) {
  const data = await getTourEditorData(type);

  if (!data) {
    return;
  }

  try {
    const saved = await fetchToursJson(`${TOURS_API_URL}/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (saved) {
      loadedTourItems.push(saved);
      renderToursPage(page, loadedTourItems);
    }
  } catch (error) {
    console.error("Не удалось добавить предложение:", error);
    window.EurasiaAdminUI.notice({
      title: "Предложение не добавлено",
      text: "Не удалось добавить. Проверьте JSON Server."
    });
  }
}

async function editTourItem(page, item) {
  const data = await getTourEditorData(item.type || "promotion", item);

  if (!data) {
    return;
  }

  try {
    const saved = await fetchToursJson(`${TOURS_API_URL}/promotions/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    Object.assign(item, saved || data);
    renderToursPage(page, loadedTourItems);
  } catch (error) {
    console.error("Не удалось изменить предложение:", error);
    window.EurasiaAdminUI.notice({
      title: "Предложение не сохранено",
      text: "Не удалось изменить. Проверьте JSON Server."
    });
  }
}

async function deleteTourItem(page, item) {
  const shouldDelete = await window.EurasiaAdminUI.confirm({
    title: "Удалить предложение",
    text: `Предложение "${item.title}" будет удалено со страницы.`,
    confirmText: "Удалить"
  });

  if (!shouldDelete) {
    return;
  }

  try {
    await fetchToursJson(`${TOURS_API_URL}/promotions/${item.id}`, {
      method: "DELETE"
    });
    loadedTourItems = loadedTourItems.filter((tourItem) => tourItem.id !== item.id);
    renderToursPage(page, loadedTourItems);
  } catch (error) {
    console.error("Не удалось удалить предложение:", error);
    window.EurasiaAdminUI.notice({
      title: "Предложение не удалено",
      text: "Не удалось удалить. Проверьте JSON Server."
    });
  }
}

async function getTourEditorData(type, item = {}) {
  const isTour = type === "tour";
  const data = await window.EurasiaAdminUI.form({
    title: item.id ? "Редактировать предложение" : "Новое предложение",
    submitText: item.id ? "Сохранить" : "Добавить",
    fields: [
      { name: "title", label: `${translateTourText("Название")} (RU)`, value: item.title || "", required: true },
      { name: "titleEn", label: `${translateTourText("Название")} (EN)`, value: item.titleEn || "", required: true },
      { name: "subtitle", label: `${translateTourText("Подзаголовок")} (RU)`, value: item.subtitle || getItemTypeTitle({ type }), required: true },
      { name: "subtitleEn", label: `${translateTourText("Подзаголовок")} (EN)`, value: item.subtitleEn || (isTour ? "Ski tour" : "Special offer"), required: true },
      { name: "description", label: `${translateTourText("Описание")} (RU)`, type: "textarea", value: item.description || "", required: true },
      { name: "descriptionEn", label: `${translateTourText("Описание")} (EN)`, type: "textarea", value: item.descriptionEn || "", required: true },
      { name: "periodText", label: `${translateTourText("Период или условие")} (RU)`, value: item.periodText || "", required: true },
      { name: "periodTextEn", label: `${translateTourText("Период или условие")} (EN)`, value: item.periodTextEn || "", required: true },
      { name: "image", label: "Выберите изображение", type: "file", accept: "image/*", value: item.image || "assets/images/tours/tour-01.jpg", required: true },
      { name: "price", label: "Цена", type: "number", min: 0, step: 1, value: item.price || 1000, required: true },
      { name: "featuresText", label: `${translateTourText("Состав через запятую")} (RU)`, type: "textarea", value: Array.isArray(item.features) ? item.features.join(", ") : "", required: true },
      { name: "featuresTextEn", label: `${translateTourText("Состав через запятую")} (EN)`, type: "textarea", value: Array.isArray(item.featuresEn) ? item.featuresEn.join(", ") : "", required: true },
      { name: "validFrom", label: "Действует с", type: "date", value: item.validFrom || "2026-12-01", required: true },
      { name: "validTo", label: "Действует до", type: "date", value: item.validTo || "2027-03-31", required: true },
      { name: "availableDays", label: "Дни бронирования", type: "checkboxes", options: TOURS_DAY_OPTIONS, value: getEditorAvailableDays(type, item), required: true },
      { name: "durationDays", label: "Дней", type: "number", min: 1, step: 1, value: isTour ? item.durationDays || 3 : 1, required: isTour },
      { name: "durationNights", label: "Ночей", type: "number", min: 0, step: 1, value: isTour ? item.durationNights || 2 : 0, required: isTour }
    ]
  });

  if (!data) {
    return null;
  }

  const availableDays = normalizeEditorDays(data.availableDays);
  const periodLines = getEditorPeriodLines(data.periodText, data.validFrom, data.validTo, availableDays);
  const periodLinesEn = getEditorPeriodLines(data.periodTextEn, data.validFrom, data.validTo, availableDays);

  return {
    title: data.title.trim(),
    titleEn: data.titleEn.trim(),
    type: isTour ? "tour" : "promotion",
    subtitle: data.subtitle.trim(),
    subtitleEn: data.subtitleEn.trim(),
    description: data.description.trim(),
    descriptionEn: data.descriptionEn.trim(),
    periodType: getPeriodTypeByDays(availableDays),
    periodText: data.periodText.trim(),
    periodTextEn: data.periodTextEn.trim(),
    periodLines,
    periodLinesEn,
    features: String(data.featuresText || "").split(",").map((line) => line.trim()).filter(Boolean),
    featuresEn: String(data.featuresTextEn || "").split(",").map((line) => line.trim()).filter(Boolean),
    durationDays: isTour ? Number(data.durationDays) : null,
    durationNights: isTour ? Number(data.durationNights) : null,
    bookingLengthDays: isTour ? Number(data.durationDays) : 1,
    price: Number(data.price),
    priceText: `${Number(data.price).toLocaleString("ru-RU")} руб.`,
    priceTextEn: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0
    }).format(Number(data.price)),
    discountText: item.discountText || "",
    validFrom: data.validFrom || item.validFrom || "2026-12-01",
    validTo: data.validTo || item.validTo || "2027-03-31",
    startDay: isTour && availableDays.length === 1 ? availableDays[0] : null,
    availableDays,
    image: data.image.trim(),
    isActive: item.isActive !== false,
    showOnHome: item.showOnHome === true,
    ctaLabel: isTour ? "Забронировать тур" : "Заказать",
    ctaLabelEn: isTour ? "Book tour" : "Order",
    canAddToCart: true
  };
}

function getEditorAvailableDays(type, item = {}) {
  if (Array.isArray(item.availableDays) && item.availableDays.length) {
    return normalizeEditorDays(item.availableDays);
  }

  if (item.startDay && TOURS_DAY_VALUES.includes(item.startDay)) {
    return [item.startDay];
  }

  if (item.periodType === "weekdays") {
    return ["monday", "tuesday", "wednesday", "thursday", "friday"];
  }

  if (item.periodType === "weekends") {
    return ["saturday", "sunday"];
  }

  return type === "tour" ? ["monday"] : [...TOURS_DAY_VALUES];
}

function normalizeEditorDays(days) {
  if (!Array.isArray(days)) {
    return [];
  }

  return TOURS_DAY_VALUES.filter((day) => days.includes(day));
}

function getPeriodTypeByDays(days) {
  const selected = normalizeEditorDays(days);

  if (selected.length === TOURS_DAY_VALUES.length) {
    return "any";
  }

  if (isSameDaySet(selected, ["monday", "tuesday", "wednesday", "thursday", "friday"])) {
    return "weekdays";
  }

  if (isSameDaySet(selected, ["saturday", "sunday"])) {
    return "weekends";
  }

  return "specificDays";
}

function isSameDaySet(first, second) {
  return first.length === second.length && second.every((day) => first.includes(day));
}

function getEditorPeriodLines(periodText, validFrom, validTo, availableDays) {
  return [
    periodText,
    getEditorDateRangeLine(validFrom, validTo),
    getEditorDaysLine(availableDays)
  ].filter(Boolean).flatMap((line) => String(line).split(/\n/).map((item) => item.trim()).filter(Boolean));
}

function getEditorDateRangeLine(validFrom, validTo) {
  const from = parseInputDate(validFrom);
  const to = parseInputDate(validTo);

  if (!from || !to) {
    return "";
  }

  return `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`;
}

function getEditorDaysLine(days) {
  const selected = normalizeEditorDays(days);

  if (!selected.length || selected.length === TOURS_DAY_VALUES.length) {
    return "";
  }

  if (getPeriodTypeByDays(selected) === "weekdays") {
    return "будние дни";
  }

  if (getPeriodTypeByDays(selected) === "weekends") {
    return "выходные дни";
  }

  return TOURS_DAY_OPTIONS
    .filter((day) => selected.includes(day.value))
    .map((day) => day.short)
    .join(", ");
}

function renderPeriod(container, item) {
  container.replaceChildren();

  const localizedLines = getTourField(item, "periodLines");
  const periodText = getTourField(item, "periodText");
  const lines = Array.isArray(localizedLines) && localizedLines.length ? localizedLines : [periodText].filter(Boolean);

  lines.forEach((line) => {
    const span = document.createElement("span");
    span.textContent = formatCardLine(line);
    container.append(span);
  });

  container.hidden = !lines.length;
}

function formatCardLine(line) {
  return String(line || "")
    .replace(/^с\s+/i, "с\u00a0")
    .replace(/^по\s+/i, "по\u00a0")
    .replace(/\s-\s/g, "\u00a0-\u00a0");
}

function renderFeatures(container, features) {
  container.replaceChildren();

  if (!Array.isArray(features) || !features.length) {
    container.hidden = true;
    return;
  }

  features.forEach((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    container.append(item);
  });

  container.hidden = false;
}

function renderDuration(container, item) {
  container.replaceChildren();

  if (item.type !== "tour" || !item.durationDays || !item.durationNights) {
    container.hidden = true;
    return;
  }

  container.append(
    createDurationItem(item.durationDays, "Дня"),
    createDurationItem(item.durationNights, "Ночи")
  );
  container.hidden = false;
}

function createDurationItem(value, label) {
  const wrapper = document.createElement("span");
  wrapper.className = "tour-card__duration-item";

  const number = document.createElement("strong");
  number.textContent = value;

  const text = document.createElement("span");
  text.textContent = label;

  wrapper.append(number, text);
  return wrapper;
}

function renderPrice(container, item) {
  container.replaceChildren();

  const priceText = getTourField(item, "priceText");
  const periodText = getTourField(item, "periodText");

  if (item.type === "tour" || !priceText || priceText === periodText) {
    container.hidden = true;
    return;
  }

  const main = document.createElement("strong");
  main.textContent = priceText;
  container.append(main);

  if (shouldShowPriceNote(item)) {
    const discount = document.createElement("span");
    discount.textContent = item.discountText;
    container.append(discount);
  }

  container.hidden = false;
}

function shouldShowPriceNote(item) {
  if (!item.discountText || item.discountText === item.priceText) {
    return false;
  }

  const note = normalizeTourText(item.discountText);
  const period = normalizeTourText([
    item.periodText,
    ...(Array.isArray(item.periodLines) ? item.periodLines : [])
  ].filter(Boolean).join(" "));

  if (!note || !period) {
    return true;
  }

  if (/понедель|вторник|сред|четверг|пятниц|суббот|воскрес|будн|выходн|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр/.test(note)) {
    return false;
  }

  return !period.includes(note) && !period.includes(note.slice(0, 5));
}

function normalizeTourText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9]+/g, " ")
    .trim();
}

async function handleTourAction(page, event, item, button, message) {
  const user = getToursUser();

  if (!user) {
    button.dataset.openLogin = "";
    showTourMessage(message, "Войдите, чтобы добавить в корзину.");
    return;
  }

  event.preventDefault();
  delete button.dataset.openLogin;
  openBookingModal(page, item, user, message);
}

function openBookingModal(page, item, user, message) {
  if (!page.bookingModal) {
    return;
  }

  const initialMonth = getInitialBookingMonth(item);
  bookingState = {
    item,
    user,
    message,
    month: initialMonth,
    selectedDate: null
  };

  page.bookingTitle.textContent = getTourField(item, "title");
  page.bookingText.textContent = `${getTourField(item, "periodText")}. ${translateTourText(item.type === "tour" ? "Выберите дату начала тура" : "Выберите дату акции")}.`;
  page.bookingHint.textContent = translateTourText(item.type === "tour"
    ? "Серые даты недоступны по условиям тура."
    : "Серые даты недоступны по условиям акции.");
  page.bookingSelected.textContent = "";
  page.bookingSubmit.disabled = true;
  page.bookingModal.hidden = false;
  document.body.classList.add("modal-open");
  renderBookingCalendar(page);
}

function closeBookingModal(page) {
  if (!page.bookingModal) {
    return;
  }

  page.bookingModal.hidden = true;
  document.body.classList.remove("modal-open");
  bookingState.item = null;
  bookingState.user = null;
  bookingState.message = null;
  bookingState.selectedDate = null;
}

function changeBookingMonth(page, direction) {
  if (!bookingState.month) {
    return;
  }

  bookingState.month = new Date(bookingState.month.getFullYear(), bookingState.month.getMonth() + direction, 1);
  bookingState.selectedDate = null;
  page.bookingSelected.textContent = "";
  page.bookingSubmit.disabled = true;
  renderBookingCalendar(page);
}

function renderBookingCalendar(page) {
  const item = bookingState.item;
  const month = bookingState.month;

  if (!item || !month) {
    return;
  }

  page.bookingCalendar.replaceChildren();
  page.bookingMonth.textContent = new Intl.DateTimeFormat(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU", {
    month: "long",
    year: "numeric"
  }).format(month);

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = addDays(monthStart, -getMondayIndex(monthStart));

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(calendarStart, i);
    const button = document.createElement("button");
    const isAvailable = isItemDateAvailable(item, date);

    button.className = "tour-booking__day";
    button.type = "button";
    button.textContent = String(date.getDate());
    button.disabled = !isAvailable;

    if (date.getMonth() !== month.getMonth()) {
      button.classList.add("is-other-month");
    }

    if (bookingState.selectedDate && isSameDate(date, bookingState.selectedDate)) {
      button.classList.add("is-selected");
    }

    if (isAvailable) {
      button.addEventListener("click", () => selectBookingDate(page, date));
    }

    page.bookingCalendar.append(button);
  }
}

function selectBookingDate(page, date) {
  bookingState.selectedDate = stripTime(date);
  const finish = getItemFinishDate(bookingState.item, bookingState.selectedDate);
  page.bookingSelected.textContent = translateTourText(
    `Выбрано: ${getBookingDetails(bookingState.item, bookingState.selectedDate, finish)}`
  );
  page.bookingSubmit.disabled = false;
  renderBookingCalendar(page);
}

async function submitTourBooking(page) {
  const item = bookingState.item;
  const user = bookingState.user;
  const start = bookingState.selectedDate;

  if (!item || !user || !start) {
    return;
  }

  const finish = getItemFinishDate(item, start);
  const details = getBookingDetails(item, start, finish);

  page.bookingSubmit.disabled = true;
  page.bookingSubmit.textContent = translateTourText("Добавляем...");

  try {
    await addTourItemToCart(item, user, {
      details,
      checkIn: formatInputDate(start),
      checkOut: formatInputDate(finish)
    });
    showTourMessage(
      bookingState.message,
      item.type === "tour" ? "Тур с выбранными датами добавлен в корзину." : "Акция с выбранной датой добавлена в корзину.",
      "success"
    );
    closeBookingModal(page);
  } catch (error) {
    console.error("Не удалось добавить предложение в корзину:", error);
    page.bookingSelected.textContent = translateTourText("Не удалось добавить предложение. Проверьте JSON Server.");
  } finally {
    page.bookingSubmit.textContent = translateTourText("Добавить в корзину");
    page.bookingSubmit.disabled = !bookingState.selectedDate;
  }
}

function getInitialBookingMonth(item) {
  const today = getToday();
  const validFrom = parseInputDate(item.validFrom) || today;
  const start = validFrom > today ? validFrom : today;
  const firstAvailable = findFirstAvailableDate(item, start) || start;

  return new Date(firstAvailable.getFullYear(), firstAvailable.getMonth(), 1);
}

function findFirstAvailableDate(item, start) {
  const validTo = parseInputDate(item.validTo);
  let date = stripTime(start);

  for (let i = 0; i < 430; i += 1) {
    if (validTo && date > validTo) {
      return null;
    }

    if (isItemDateAvailable(item, date)) {
      return date;
    }

    date = addDays(date, 1);
  }

  return null;
}

function isItemDateAvailable(item, dateValue) {
  const date = stripTime(dateValue);
  const today = getToday();
  const validFrom = parseInputDate(item.validFrom);
  const validTo = parseInputDate(item.validTo);

  if (date < today) {
    return false;
  }

  if (validFrom && date < validFrom) {
    return false;
  }

  if (validTo && date > validTo) {
    return false;
  }

  if (!isDateAllowedByItem(item, date)) {
    return false;
  }

  const finish = getItemFinishDate(item, date);

  if (validTo && finish > addDays(validTo, 1)) {
    return false;
  }

  return true;
}

function isDateAllowedByItem(item, date) {
  const dayName = getDayName(date);

  if (Array.isArray(item.availableDays) && item.availableDays.length) {
    return item.availableDays.includes(dayName);
  }

  if (item.type === "tour" && item.startDay) {
    return dayName === item.startDay;
  }

  if (item.periodType === "weekdays") {
    return !["saturday", "sunday"].includes(dayName);
  }

  if (item.periodType === "weekends") {
    return ["saturday", "sunday"].includes(dayName);
  }

  return true;
}

function isBookingRangeBusy(start, finish) {
  const hasBusyBooking = loadedBookings.some((booking) => {
    if (!booking.checkIn || !booking.checkOut || String(booking.status).toLowerCase() === "cancelled") {
      return false;
    }

    const busyStart = parseInputDate(booking.checkIn);
    const busyFinish = parseInputDate(booking.checkOut);

    if (!busyStart || !busyFinish) {
      return false;
    }

    return start < busyFinish && finish > busyStart;
  });

  if (hasBusyBooking) {
    return true;
  }

  return loadedOrders.some((order) => {
    const status = String(order.status || "").toLowerCase();

    if (status === "cancelled" || status === "canceled") {
      return false;
    }

    if (!Array.isArray(order.items)) {
      return false;
    }

    return order.items.some((item) => {
      if (item.itemType !== "tour" || !item.checkIn || !item.checkOut) {
        return false;
      }

      const busyStart = parseInputDate(item.checkIn);
      const busyFinish = parseInputDate(item.checkOut);

      if (!busyStart || !busyFinish) {
        return false;
      }

      return start < busyFinish && finish > busyStart;
    });
  });
}

async function addTourItemToCart(item, user, booking = {}) {
  const itemType = item.type === "tour" ? "tour" : "promotion";
  const details = booking.details || getTourField(item, "periodText") || getTourField(item, "subtitle") || "";
  const existing = await fetchToursJson(`${TOURS_API_URL}/cart?userId=${user.id}&itemType=${itemType}&itemId=${item.id}`);
  const sameItem = existing.find((current) => String(current.details || "") === details);

  if (sameItem) {
    await fetchToursJson(`${TOURS_API_URL}/cart/${sameItem.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quantity: Number(sameItem.quantity || 1) + 1
      })
    });
    return;
  }

  await fetchToursJson(`${TOURS_API_URL}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId: user.id,
      itemType,
      itemId: item.id,
      title: item.title,
      titleEn: item.titleEn || item.title,
      details,
      detailsEn: getBookingDetails(item, parseInputDate(booking.checkIn), parseInputDate(booking.checkOut), "en-US"),
      periodText: item.periodText || "",
      periodTextEn: item.periodTextEn || item.periodText || "",
      checkIn: booking.checkIn || null,
      checkOut: booking.checkOut || null,
      price: Number(item.price || 0),
      quantity: 1,
      image: item.image
    })
  });
}

async function fetchToursJson(url, options) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса ${url}: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function resolveToursAssetPath(path) {
  if (!path) {
    return "";
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  return `${TOURS_ASSET_PREFIX}${path}`;
}

function getToursUser() {
  try {
    return JSON.parse(localStorage.getItem(TOURS_CURRENT_USER_KEY));
  } catch (error) {
    return null;
  }
}

function isToursAdmin() {
  const user = getToursUser();
  return user && user.role === "admin";
}

function getItemTypeTitle(item) {
  return item.type === "tour" ? "Горнолыжный тур" : "Акция";
}

function showTourMessage(message, text, type = "") {
  if (!message) {
    return;
  }

  message.textContent = text;
  message.dataset.messageType = type;
}

function createToursMessage(text) {
  const message = document.createElement("p");
  message.className = "tours-message";
  message.textContent = text;
  return message;
}

function parseInputDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date, locale) {
  return new Intl.DateTimeFormat(locale || (window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU"), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getItemFinishDate(item, start) {
  return addDays(start, Number(item.bookingLengthDays || item.durationDays || 1));
}

function getBookingDetails(item, start, finish, locale) {
  if (item.type !== "tour") {
    const text = locale === "en-US"
      ? item.periodTextEn || item.subtitleEn || "special offer"
      : getTourField(item, "periodText") || getTourField(item, "subtitle") || "акция";
    return `${formatDisplayDate(start, locale)} · ${text}`;
  }

  return `${formatDisplayDate(start, locale)} - ${formatDisplayDate(addDays(finish, -1), locale)}`;
}

function getTourField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function translateTourText(text) {
  return window.translateUiText ? window.translateUiText(text) : text;
}

function getDayName(date) {
  return TOURS_DAY_NAMES[date.getDay()];
}

function getMondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function getToday() {
  return stripTime(new Date());
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, count) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + count);
  return stripTime(nextDate);
}

function isSameDate(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
