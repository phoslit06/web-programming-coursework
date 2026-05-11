const API_BASE_URL = "http://localhost:3000";

const DAY_SECTIONS = {
  weekday: "Будний день",
  weekend: "Выходной день",
  holiday: "Праздничный день",
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isBrokenText(value) {
  return /\?{2,}/.test(String(value || ""));
}

function getDisplayText(tariff) {
  const fallback = TARIFF_DISPLAY[tariff.id] || {};
  const title = isBrokenText(tariff.title) ? fallback.title : tariff.title;
  const subtitle = fallback.subtitle || "";

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
    const inSearch = !query || normalizeText(`${display.title} ${display.subtitle} ${tariff.description} ${tariff.categoryTitle}`).includes(query);
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
      return first.title.localeCompare(second.title, "ru");
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

  return Number(value).toLocaleString("ru-RU");
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
      th.textContent = column;
    } else {
      th.innerHTML = `<span class="tariff-table__head-prefix">Стоимость проката, рублей</span><span class="tariff-table__head-time">${column.label.replace("Стоимость проката, рублей ", "")}</span>`;
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
  actionButton.setAttribute("aria-label", `Выбрать тариф: ${getDisplayText(tariff).title}`);
  actionButton.dataset.tariffId = String(tariff.id);
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
  caption.textContent = `${DAY_SECTIONS[dayKey]}: ${dayTariffs.length} позиций`;
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

    dayText.textContent = item.day;
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
    actionButton.setAttribute("aria-label", `Открыть действия для графика: ${item.day}`);
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
  caption.textContent = "Тарифы на прокат ватрушек";

  ["Наименование", "Дни", ...TUBING_PRICE_COLUMNS].forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";

    if (typeof column === "string") {
      th.textContent = column;
    } else {
      th.innerHTML = `<span class="tariff-table__head-prefix">Стоимость проката, рублей</span><span class="tariff-table__head-time">${column.label.replace("Стоимость проката, рублей ", "")}</span>`;
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
  row.append(createCellWithStack(days.map((day) => day.label), "tariff-table__muted"));

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
  const rentalTariffs = visibleTariffs.filter((tariff) => RENTAL_TARIFF_IDS.includes(tariff.id));

  tariffContainers.forEach((container) => {
    renderTariffTable(container, container.dataset.tariffTable, rentalTariffs);
  });

  renderTubingTable(visibleTariffs);
  renderScheduleTable();
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
