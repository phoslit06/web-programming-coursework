const API_BASE_URL = "http://localhost:3000";

const DAY_SECTIONS = {
  weekday: "Будний день",
  weekend: "Выходной день",
  holiday: "Праздничный день",
};

const PRICE_TIME_LABELS = {
  "1hour": { ru: "1 час", en: "1 hour" },
  "2hours": { ru: "2 часа", en: "2 hours" },
  "3hours": { ru: "3 часа", en: "3 hours" },
  "4hours": { ru: "4 часа", en: "4 hours" },
  day: { ru: "день", en: "per day" },
};

const PRICE_COLUMNS = [
  { key: "1hour", label: "Стоимость проката, рублей 1 час" },
  { key: "2hours", label: "Стоимость проката, рублей 2 часа" },
  { key: "3hours", label: "Стоимость проката, рублей 3 часа" },
  { key: "4hours", label: "Стоимость проката, рублей 4 часа" },
  { key: "day", label: "Стоимость проката, рублей день" },
];

const TUBING_PRICE_COLUMNS = PRICE_COLUMNS.filter((column) => column.key !== "4hours");
const RENTAL_TARIFF_IDS = [1, 2, 3, 5, 7, 8, 9];
const TUBING_TARIFF_ID = 25;
const FILTER_GROUPS = {
  kits: [1, 2],
  ride: [3],
  equipment: [5, 7],
  protection: [8, 9],
  tubing: [25],
};

const TARIFF_DISPLAY = {
  1: {
    title: "Комплект",
    subtitle: "(горные лыжи, сноуборд, ботинки, палки)",
  },
  2: {
    title: "Комплект",
    subtitle: "(горные лыжи, сноуборд, ботинки, палки) при занятии с инструктором",
  },
  3: {
    title: "Горные лыжи / сноуборд",
  },
  5: {
    title: "Ботинки",
  },
  7: {
    title: "Лыжные палки",
  },
  8: {
    title: "Защитный шлем",
  },
  9: {
    title: "Защитная маска",
  },
  25: {
    title: "Ватрушка (тюбинг)",
  },
};

const GROUP_LABELS = {
  child: "Дети до 14 лет",
  adult: "Взрослые",
  evening: "Вечер",
  all: "Для всех",
};

const GROUP_ORDER = ["child", "adult", "evening", "all"];

const state = {
  tariffs: [],
  workSchedule: [],
};

const controls = document.querySelector("[data-tariffs-controls]");
const searchInput = document.querySelector("[data-tariff-search]");
const resetButton = document.querySelector("[data-tariff-reset]");
const categoryInputs = Array.from(document.querySelectorAll('input[name="category"]'));
const sortInputs = Array.from(document.querySelectorAll('input[name="sort"]'));
const tariffContainers = Array.from(document.querySelectorAll("[data-tariff-table]"));
const tubingContainer = document.querySelector("[data-tubing-table]");
const scheduleContainer = document.querySelector("[data-work-schedule]");

function getJson(endpoint) {
  return fetch(`${API_BASE_URL}${endpoint}`, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }

    return response.json();
  });
}

function sendJson(endpoint, options = {}) {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    cache: "no-store",
    ...options,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Ошибка запроса: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.text().then((text) => (text ? JSON.parse(text) : null));
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isBrokenText(value) {
  return /\?{2,}/.test(String(value || ""));
}

function getDisplayText(tariff) {
  const fallback = TARIFF_DISPLAY[tariff.id] || {};
  const savedTitle = getTariffField(tariff, "title");
  const title = isBrokenText(savedTitle) ? translateTariffText(fallback.title) : savedTitle;
  const subtitle = translateTariffText(fallback.subtitle || "");

  return {
    title: title || fallback.title || "",
    subtitle,
  };
}

function getSelectedCategories() {
  const selected = categoryInputs.filter((input) => input.checked).map((input) => input.value);
  return selected.includes("all") || selected.length === 0 ? [] : selected;
}

function getSelectedSort() {
  const selected = sortInputs.find((input) => input.checked);
  return selected ? selected.value : "";
}

function getVisibleTariffs() {
  const query = normalizeText(searchInput?.value);
  const filterGroups = getSelectedCategories();
  const sortType = getSelectedSort();

  const filtered = state.tariffs.filter((tariff) => {
    const display = getDisplayText(tariff);
    const inCategory =
      filterGroups.length === 0 ||
      filterGroups.some((group) => FILTER_GROUPS[group]?.includes(tariff.id));
    const inSearch = !query || normalizeText(
      `${display.title} ${display.subtitle} ${getTariffField(tariff, "description")} ${getTariffField(tariff, "categoryTitle")}`
    ).includes(query);
    return tariff.isAvailable && inCategory && inSearch;
  });

  return filtered.sort((first, second) => {
    if (sortType === "price-asc") {
      return first.minPrice - second.minPrice;
    }

    if (sortType === "price-desc") {
      return second.minPrice - first.minPrice;
    }

    if (sortType === "title") {
      return getTariffField(first, "title").localeCompare(getTariffField(second, "title"), window.getCurrentLocale?.() || "ru");
    }

    return first.id - second.id;
  });
}

function getPriceGroups(dayPrices) {
  return GROUP_ORDER
    .filter((groupKey) => dayPrices && dayPrices[groupKey])
    .map((groupKey) => ({
      key: groupKey,
      label: GROUP_LABELS[groupKey],
      prices: dayPrices[groupKey],
    }));
}

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "•";
  }

  return new Intl.NumberFormat(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU").format(Number(value));
}

function translateText(source, values = {}) {
  if (window.getTranslationBySource) {
    return window.getTranslationBySource(source, values);
  }

  return source;
}

function getPriceTimeLabel(key) {
  const language = window.getCurrentLanguage?.() === "en" ? "en" : "ru";
  return PRICE_TIME_LABELS[key]?.[language] || key;
}

function createStack(items, className = "") {
  const stack = document.createElement("span");
  stack.className = className ? `tariff-table__stack ${className}` : "tariff-table__stack";

  items.forEach((item) => {
    const line = document.createElement("span");
    line.textContent = item;
    stack.append(line);
  });

  return stack;
}

function createTableHeader() {
  const thead = document.createElement("thead");
  const row = document.createElement("tr");
  const columns = ["Наименование", "Возрастная категория", ...PRICE_COLUMNS, ""];

  columns.forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";

    if (typeof column === "string") {
      th.textContent = translateText(column);
    } else {
      th.innerHTML = `<span class="tariff-table__head-prefix">${translateText("Стоимость проката, рублей")}</span><span class="tariff-table__head-time">${getPriceTimeLabel(column.key)}</span>`;
    }

    if (column === "" && !isTariffsAdmin()) {
      th.hidden = true;
    }

    row.append(th);
  });

  thead.append(row);
  return thead;
}

function createNameCell(tariff) {
  const td = document.createElement("td");
  const wrapper = document.createElement("span");
  const icon = document.createElement("span");
  const text = document.createElement("span");
  const title = document.createElement("span");
  const subtitle = document.createElement("span");
  const display = getDisplayText(tariff);

  wrapper.className = "tariff-table__name";
  text.className = "tariff-table__name-text";
  icon.className = "tariff-table__icon";
  icon.setAttribute("aria-hidden", "true");
  title.className = "tariff-table__title";
  title.textContent = display.title;

  text.append(title);

  if (display.subtitle) {
    subtitle.className = "tariff-table__subtitle";
    subtitle.textContent = display.subtitle;
    text.append(subtitle);
  }

  wrapper.append(icon, text);
  td.append(wrapper);

  return td;
}

function createTariffRow(tariff, dayKey) {
  const row = document.createElement("tr");
  const groups = getPriceGroups(tariff.prices?.[dayKey]);

  row.append(createNameCell(tariff));

  const ageCell = document.createElement("td");
  ageCell.append(createStack(groups.map((group) => group.label), "tariff-table__muted"));
  row.append(ageCell);

  PRICE_COLUMNS.forEach((column) => {
    const priceCell = document.createElement("td");
    priceCell.append(createStack(groups.map((group) => formatPrice(group.prices[column.key]))));
    row.append(priceCell);
  });

  const actionCell = document.createElement("td");
  const actionButton = document.createElement("button");
  actionButton.className = "tariff-table__action";
  actionButton.type = "button";
  actionButton.textContent = "⋮";
  const chooseLabel = window.getCurrentLanguage?.() === "en" ? "Select tariff" : "Выбрать тариф";
  actionButton.setAttribute("aria-label", `${chooseLabel}: ${getDisplayText(tariff).title}`);
  actionButton.dataset.tariffId = String(tariff.id);
  if (isTariffsAdmin()) {
    actionButton.textContent = "⋮";
    actionButton.setAttribute("aria-label", `Действия для тарифа: ${getDisplayText(tariff).title}`);
    actionButton.addEventListener("click", () => handleTariffAction(tariff));
  } else {
    actionCell.hidden = true;
    actionButton.hidden = true;
  }
  actionCell.append(actionButton);
  row.append(actionCell);

  return row;
}

function renderTariffTable(container, dayKey, tariffs) {
  const dayTariffs = tariffs.filter((tariff) => tariff.prices?.[dayKey]);
  container.textContent = "";

  if (dayTariffs.length === 0) {
    const message = document.createElement("p");
    message.className = "tariffs-message";
    message.textContent = "Нет тарифов по выбранным условиям.";
    container.append(message);
    return;
  }

  const table = document.createElement("table");
  const caption = document.createElement("caption");
  const tbody = document.createElement("tbody");

  table.className = "tariff-table";
  const itemsLabel = window.getCurrentLanguage?.() === "en" ? "items" : "позиций";
  caption.textContent = `${translateText(DAY_SECTIONS[dayKey])}: ${dayTariffs.length} ${itemsLabel}`;
  table.append(caption, createTableHeader());

  dayTariffs.forEach((tariff) => {
    tbody.append(createTariffRow(tariff, dayKey));
  });

  table.append(tbody);
  container.append(table);
}

function renderScheduleTable() {
  if (!scheduleContainer) {
    return;
  }

  scheduleContainer.textContent = "";

  if (state.workSchedule.length === 0) {
    const message = document.createElement("p");
    message.className = "tariffs-message";
    message.textContent = "График работы временно недоступен.";
    scheduleContainer.append(message);
    return;
  }

  const table = document.createElement("table");
  table.className = "schedule-table";
  table.innerHTML = `
    <caption>Актуальный график работы трасс и проката</caption>
    <thead>
      <tr>
        <th scope="col">День недели</th>
        <th scope="col">Трассы без освещения</th>
        <th scope="col">Трассы с освещением №1 и №2</th>
        <th scope="col">Учебный склон</th>
        <th scope="col">Прокат снаряжения</th>
        <th scope="col"></th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  state.workSchedule.forEach((item) => {
    const row = document.createElement("tr");
    const dayCell = document.createElement("td");
    const dayWrapper = document.createElement("span");
    const dayIcon = document.createElement("span");
    const dayText = document.createElement("span");

    dayWrapper.className = "schedule-table__day";
    dayIcon.className = "schedule-table__day-icon";

    if (item.dayType === "weekend" || item.dayType === "holiday") {
      dayIcon.classList.add("schedule-table__day-icon--green");
    }

    dayText.textContent = getTariffField(item, "day");
    dayWrapper.append(dayIcon, dayText);
    dayCell.append(dayWrapper);
    row.append(dayCell);

    [
      item.trailsWithoutLight,
      item.trailsWithLight,
      item.trainingSlope,
      item.rentalService,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });

    const actionCell = document.createElement("td");
    const actionButton = document.createElement("button");
    actionButton.className = "tariff-table__action";
    actionButton.type = "button";
    actionButton.textContent = "⋮";
    const scheduleActionLabel = window.getCurrentLanguage?.() === "en"
      ? "Open schedule actions"
      : "Открыть действия для графика";
    actionButton.setAttribute("aria-label", `${scheduleActionLabel}: ${getTariffField(item, "day")}`);
    actionCell.append(actionButton);
    row.append(actionCell);
    tbody.append(row);
  });

  table.append(tbody);
  scheduleContainer.append(table);
}

function renderTubingTable(tariffs) {
  if (!tubingContainer) {
    return;
  }

  tubingContainer.textContent = "";

  const tariff = tariffs.find((item) => item.id === TUBING_TARIFF_ID);

  if (!tariff) {
    const message = document.createElement("p");
    message.className = "tariffs-message";
    message.textContent = "Нет тарифов по выбранным условиям.";
    tubingContainer.append(message);
    return;
  }

  const table = document.createElement("table");
  const caption = document.createElement("caption");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const tbody = document.createElement("tbody");

  table.className = "tariff-table tariff-table--tubing";
  caption.textContent = translateText("Тарифы на прокат ватрушек");

  ["Наименование", "Дни", ...TUBING_PRICE_COLUMNS].forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";

    if (typeof column === "string") {
      th.textContent = translateText(column);
    } else {
      th.innerHTML = `<span class="tariff-table__head-prefix">${translateText("Стоимость проката, рублей")}</span><span class="tariff-table__head-time">${getPriceTimeLabel(column.key)}</span>`;
    }

    headerRow.append(th);
  });

  thead.append(headerRow);
  table.append(caption, thead);

  const row = document.createElement("tr");
  const days = [
    { key: "weekday", label: "Будни" },
    { key: "weekend", label: "Выходные" },
    { key: "holiday", label: "Праздничные" },
  ];

  row.append(createNameCell(tariff));
  row.append(createCellWithStack(days.map((day) => translateText(day.label)), "tariff-table__muted"));

  TUBING_PRICE_COLUMNS.forEach((column) => {
    row.append(createCellWithStack(days.map((day) => formatPrice(tariff.prices?.[day.key]?.all?.[column.key]))));
  });

  tbody.append(row);
  table.append(tbody);
  tubingContainer.append(table);
}

function createCellWithStack(items, className = "") {
  const cell = document.createElement("td");
  cell.append(createStack(items, className));
  return cell;
}

function renderAll() {
  const visibleTariffs = getVisibleTariffs();
  const rentalTariffs = visibleTariffs.filter((tariff) => RENTAL_TARIFF_IDS.includes(tariff.id) || tariff.category === "rental");

  tariffContainers.forEach((container) => {
    renderTariffTable(container, container.dataset.tariffTable, rentalTariffs);
  });

  renderTubingTable(visibleTariffs);
  renderScheduleTable();
}

function initTariffsAdminPanel() {
  document.body.classList.toggle("is-admin", isTariffsAdmin());
  document.querySelector("[data-tariffs-admin-panel]")?.remove();

  if (!isTariffsAdmin() || !controls) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.dataset.tariffsAdminPanel = "";

  const title = document.createElement("h2");
  title.className = "admin-panel__title";
  title.textContent = "Управление услугами";

  const actions = document.createElement("div");
  actions.className = "admin-panel__actions";

  const addButton = document.createElement("button");
  addButton.className = "admin-button";
  addButton.type = "button";
  addButton.textContent = "Добавить услугу";
  addButton.addEventListener("click", addTariffItem);

  actions.append(addButton);
  panel.append(title, actions);
  controls.parentNode.insertBefore(panel, controls.nextSibling);
}

function createDefaultTariffPrices(price) {
  return ["weekday", "weekend", "holiday"].reduce((days, dayKey) => {
    days[dayKey] = {
      all: {
        "1hour": price,
        "2hours": price,
        "3hours": price,
        "4hours": price,
        day: price
      }
    };
    return days;
  }, {});
}

function getMinTariffPrice(prices) {
  const values = [];

  Object.values(prices || {}).forEach((day) => {
    Object.values(day || {}).forEach((group) => {
      Object.values(group || {}).forEach((value) => {
        if (typeof value === "number") {
          values.push(value);
        }
      });
    });
  });

  return values.length ? Math.min(...values) : 0;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function isTariffsAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem("eurasiaCurrentUser"));
    return user && user.role === "admin";
  } catch (error) {
    return false;
  }
}

async function handleTariffAction(tariff) {
  const data = await window.EurasiaAdminUI.form({
    title: getDisplayText(tariff).title,
    submitText: "Продолжить",
    fields: [
      {
        name: "action",
        label: "Действие",
        type: "select",
        required: true,
        value: "edit",
        options: [
          { value: "edit", label: "Изменить цену" },
          { value: "delete", label: "Удалить тариф" }
        ]
      }
    ]
  });

  if (!data) {
    return;
  }

  if (data.action === "delete") {
    await deleteTariffItem(tariff);
    return;
  }

  await editTariffPrice(tariff);
}

async function editTariffPrice(tariff) {
  const data = await window.EurasiaAdminUI.form({
    title: "Изменить цену",
    submitText: "Сохранить",
    fields: [
      {
        name: "dayKey",
        label: "День",
        type: "select",
        value: "weekday",
        required: true,
        options: [
          { value: "weekday", label: "Будний день" },
          { value: "weekend", label: "Выходной день" },
          { value: "holiday", label: "Праздничный день" }
        ]
      },
      {
        name: "groupKey",
        label: "Группа",
        type: "select",
        value: "adult",
        required: true,
        options: [
          { value: "child", label: "Дети до 14 лет" },
          { value: "adult", label: "Взрослые" },
          { value: "evening", label: "Вечер" },
          { value: "all", label: "Для всех" }
        ]
      },
      {
        name: "priceKey",
        label: "Период",
        type: "select",
        value: "1hour",
        required: true,
        options: [
          { value: "1hour", label: "1 час" },
          { value: "2hours", label: "2 часа" },
          { value: "3hours", label: "3 часа" },
          { value: "4hours", label: "4 часа" },
          { value: "day", label: "День" }
        ]
      },
      { name: "price", label: "Новая цена", type: "number", min: 0, step: 1, value: "", required: true }
    ]
  });

  if (!data) {
    return;
  }

  const price = Number(data.price);
  const prices = cloneData(tariff.prices || {});
  prices[data.dayKey] = prices[data.dayKey] || {};
  prices[data.dayKey][data.groupKey] = prices[data.dayKey][data.groupKey] || {};
  prices[data.dayKey][data.groupKey][data.priceKey] = price;

  try {
    const saved = await sendJson(`/tariffs/${tariff.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prices,
        minPrice: getMinTariffPrice(prices)
      })
    });

    Object.assign(tariff, saved || { prices });
    renderAll();
  } catch (error) {
    console.error("Не удалось изменить цену:", error);
    window.EurasiaAdminUI.notice({
      title: "Цена не сохранена",
      text: "Не удалось изменить цену. Проверьте JSON Server."
    });
  }
}

async function addTariffItem() {
  const data = await window.EurasiaAdminUI.form({
    title: "Новая услуга",
    submitText: "Добавить",
    fields: [
      { name: "title", label: `${translateTariffText("Название услуги")} (RU)`, value: "Новая услуга проката", required: true },
      { name: "titleEn", label: `${translateTariffText("Название услуги")} (EN)`, value: "New rental service", required: true },
      { name: "description", label: `${translateTariffText("Описание")} (RU)`, type: "textarea", value: "", required: true },
      { name: "descriptionEn", label: `${translateTariffText("Описание")} (EN)`, type: "textarea", value: "", required: true },
      { name: "price", label: "Базовая цена", type: "number", min: 0, step: 1, value: 500, required: true }
    ]
  });

  if (!data) {
    return;
  }

  const price = Number(data.price);
  const prices = createDefaultTariffPrices(price);

  try {
    const saved = await sendJson("/tariffs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: data.title.trim(),
        titleEn: data.titleEn.trim(),
        category: "rental",
        categoryTitle: "Прокат",
        categoryTitleEn: "Rental",
        description: data.description || "",
        descriptionEn: data.descriptionEn || "",
        minPrice: price,
        isAvailable: true,
        prices
      })
    });

    if (saved) {
      state.tariffs.push(saved);
    }

    renderAll();
  } catch (error) {
    console.error("Не удалось добавить тариф:", error);
    window.EurasiaAdminUI.notice({
      title: "Тариф не добавлен",
      text: "Не удалось добавить тариф. Проверьте JSON Server."
    });
  }
}

async function deleteTariffItem(tariff) {
  const shouldDelete = await window.EurasiaAdminUI.confirm({
    title: "Удалить тариф",
    text: `Тариф "${getDisplayText(tariff).title}" будет удален из списка услуг.`,
    confirmText: "Удалить"
  });

  if (!shouldDelete) {
    return;
  }

  try {
    await sendJson(`/tariffs/${tariff.id}`, {
      method: "DELETE"
    });
    state.tariffs = state.tariffs.filter((item) => item.id !== tariff.id);
    renderAll();
  } catch (error) {
    console.error("Не удалось удалить тариф:", error);
    window.EurasiaAdminUI.notice({
      title: "Тариф не удален",
      text: "Не удалось удалить тариф. Проверьте JSON Server."
    });
  }
}

function setUnavailableMessage() {
  tariffContainers.forEach((container) => {
    container.innerHTML = '<p class="tariffs-message">Данные временно недоступны. Запустите JSON Server командой npm run server.</p>';
  });

  if (tubingContainer) {
    tubingContainer.innerHTML = '<p class="tariffs-message">Данные временно недоступны. Запустите JSON Server командой npm run server.</p>';
  }

  if (scheduleContainer) {
    scheduleContainer.innerHTML = '<p class="tariffs-message">График временно недоступен. Запустите JSON Server командой npm run server.</p>';
  }
}

function updateCategoryState(changedInput) {
  const allInput = categoryInputs.find((input) => input.value === "all");
  const otherInputs = categoryInputs.filter((input) => input.value !== "all");

  if (changedInput.value === "all" && changedInput.checked) {
    otherInputs.forEach((input) => {
      input.checked = false;
    });
  }

  if (changedInput.value !== "all" && changedInput.checked && allInput) {
    allInput.checked = false;
  }

  if (!categoryInputs.some((input) => input.checked) && allInput) {
    allInput.checked = true;
  }
}

function resetFilters() {
  if (searchInput) {
    searchInput.value = "";
  }

  categoryInputs.forEach((input) => {
    input.checked = input.value === "all";
  });

  sortInputs.forEach((input) => {
    input.checked = false;
  });

  renderAll();
}

function getTariffField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function translateTariffText(text) {
  return window.translateUiText ? window.translateUiText(text) : text;
}

function bindControls() {
  controls?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  searchInput?.addEventListener("input", renderAll);

  categoryInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateCategoryState(input);
      renderAll();
    });
  });

  sortInputs.forEach((input) => {
    input.addEventListener("change", renderAll);
  });

  resetButton?.addEventListener("click", resetFilters);
}

function initTariffsPage() {
  if (tariffContainers.length === 0) {
    return;
  }

  bindControls();
  initTariffsAdminPanel();

  Promise.all([getJson("/tariffs"), getJson("/workSchedule")])
    .then(([tariffs, workSchedule]) => {
      state.tariffs = tariffs;
      state.workSchedule = workSchedule;
      renderAll();
    })
    .catch(() => {
      setUnavailableMessage();
    });
}

initTariffsPage();
window.addEventListener("eurasia:user-change", () => {
  initTariffsAdminPanel();
  renderAll();
});
