const TRAILS_API_URL = "http://localhost:3000/trails?_sort=id&_order=asc";

document.addEventListener("DOMContentLoaded", initTrailsPage);

async function initTrailsPage() {
  const page = getTrailsElements();

  if (!page.list || !page.descriptions || !page.rowTemplate || !page.descriptionTemplate) {
    return;
  }

  try {
    const trails = await fetchJson(TRAILS_API_URL);
    renderTrailsList(page, trails);
    renderDescriptions(page, trails);
    renderExtraTrails(page, trails);
  } catch (error) {
    console.error("Не удалось загрузить трассы:", error);
    page.list.replaceChildren(createMessage("Данные временно недоступны"));
    page.descriptions.replaceChildren(createMessage("Данные временно недоступны"));
  }
}

function getTrailsElements() {
  return {
    list: document.querySelector("[data-trails-list]"),
    descriptions: document.querySelector("[data-trail-descriptions]"),
    extra: document.querySelector("[data-extra-trails]"),
    rowTemplate: document.querySelector("#trail-row-template"),
    descriptionTemplate: document.querySelector("#trail-description-template")
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  return response.json();
}

function renderTrailsList(page, trails) {
  page.list.replaceChildren();

  const items = trails.filter((trail) => trail.showInList !== false);

  if (!items.length) {
    page.list.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((trail) => {
    const row = page.rowTemplate.content.firstElementChild.cloneNode(true);
    const status = trail.status || (trail.isOpen ? "open" : "closed");

    row.dataset.status = status;
    addRowClass(row, trail);
    row.querySelector("[data-trail-number]").textContent = trail.number || "";
    row.querySelector("[data-trail-kind]").textContent = trail.number ? trail.kind : trail.listTitle || trail.title.toLowerCase();
    row.querySelector("[data-trail-length]").textContent = trail.length ? formatLength(trail.length) : "";
    row.querySelector("[data-trail-status]").textContent = trail.statusTitle || (trail.isOpen ? "open" : "close");

    fragment.append(row);
  });

  page.list.append(fragment);
}

function renderDescriptions(page, trails) {
  page.descriptions.replaceChildren();

  const items = trails.filter((trail) => trail.showInList !== false && trail.showDescription !== false);

  if (!items.length) {
    page.descriptions.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((trail) => {
    const card = createDescription(page, trail);

    fragment.append(card);
  });

  page.descriptions.append(fragment);
}

function renderExtraTrails(page, trails) {
  if (!page.extra) {
    return;
  }

  page.extra.replaceChildren();

  trails
    .filter((trail) => trail.showInList === false)
    .forEach((trail) => page.extra.append(createDescription(page, trail)));
}

function createDescription(page, trail) {
  const card = page.descriptionTemplate.content.firstElementChild.cloneNode(true);

  card.querySelector("[data-trail-title]").textContent = trail.title;
  card.querySelector("[data-trail-description]").textContent = trail.description;

  return card;
}

function addRowClass(row, trail) {
  if (!trail.number) {
    row.classList.add("trail-row--special");
  }

  if (trail.level === "freeride" && trail.title.toLowerCase().includes("фрирайд")) {
    row.classList.add("trail-row--natural");
  }

  if (trail.level === "freeride" && trail.title.toLowerCase().includes("снежного")) {
    row.classList.add("trail-row--snowman");
  }

  if (trail.level === "hard" && trail.title.toLowerCase().includes("сноу")) {
    row.classList.add("trail-row--snowpark");
  }
}

function formatLength(length) {
  return `${new Intl.NumberFormat("ru-RU").format(length)} метров`;
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "trails-message";
  message.textContent = text;
  return message;
}
