const TRAILS_API_BASE_URL = "http://localhost:3000";
const TRAILS_API_URL = `${TRAILS_API_BASE_URL}/trails?_sort=id&_order=asc`;

document.addEventListener("DOMContentLoaded", initTrailsPage);
document.addEventListener("DOMContentLoaded", initMapDownloads);

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
    const number = trail.number || "";
    const numberElement = row.querySelector("[data-trail-number]");
    const statusElement = row.querySelector("[data-trail-status]");

    row.dataset.status = status;
    row.dataset.trailId = String(trail.id);
    addRowClass(row, trail);
    numberElement.textContent = formatTrailNumber(number);
    if (number.length > 1) {
      row.classList.add("trail-row--wide-number");
    }
    const trailTitle = getTrailField(trail, "title");
    row.querySelector("[data-trail-kind]").textContent = trail.number
      ? getTrailField(trail, "kind")
      : getTrailField(trail, "listTitle") || trailTitle.toLowerCase();
    row.querySelector("[data-trail-length]").textContent = trail.length ? formatLength(trail.length) : "";
    statusElement.textContent = getTrailField(trail, "statusTitle") || (trail.isOpen ? "open" : "close");
    setupTrailAdminToggle(statusElement, trail);

    fragment.append(row);
  });

  page.list.append(fragment);
}

function setupTrailAdminToggle(statusElement, trail) {
  if (!isTrailsAdmin()) {
    return;
  }

  statusElement.classList.add("is-admin-editable");
  statusElement.tabIndex = 0;
  statusElement.setAttribute("role", "button");
  statusElement.setAttribute("title", "Нажмите, чтобы переключить open / close");

  const toggle = () => toggleTrailStatus(statusElement, trail);

  statusElement.addEventListener("click", toggle);
  statusElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
}

async function toggleTrailStatus(statusElement, trail) {
  const currentStatus = trail.status || (trail.isOpen ? "open" : "closed");
  const nextOpen = currentStatus !== "open";

  statusElement.textContent = "...";

  try {
    await fetchJson(`${TRAILS_API_BASE_URL}/trails/${trail.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        isOpen: nextOpen,
        status: nextOpen ? "open" : "closed",
        statusTitle: nextOpen ? "open" : "close"
      })
    });

    initTrailsPage();
  } catch (error) {
    console.error("Не удалось изменить статус трассы:", error);
    statusElement.textContent = getTrailField(trail, "statusTitle") || (trail.isOpen ? "open" : "close");
    window.EurasiaAdminUI.notice({
      title: "Статус не изменен",
      text: "Не удалось изменить статус трассы. Проверьте JSON Server."
    });
  }
}

function isTrailsAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem("eurasiaCurrentUser"));
    return user && user.role === "admin";
  } catch (error) {
    return false;
  }
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

  card.querySelector("[data-trail-title]").textContent = getTrailField(trail, "title");
  card.querySelector("[data-trail-description]").textContent = getTrailField(trail, "description");

  return card;
}

function addRowClass(row, trail) {
  if (!trail.number) {
    row.classList.add("trail-row--special");
  }

  const title = `${trail.title || ""} ${trail.listTitle || ""}`.toLowerCase();

  if (trail.id === 10 || title.includes("неподготов")) {
    row.classList.add("trail-row--natural");
  }

  if (trail.id === 11 || title.includes("снежного человека")) {
    row.classList.add("trail-row--snowman");
  }

  if (trail.id === 12 || title.includes("сноу парк")) {
    row.classList.add("trail-row--snowpark");
  }
}

function formatLength(length) {
  const number = new Intl.NumberFormat(window.getCurrentLocale ? window.getCurrentLocale() : "ru-RU").format(length);
  const unit = window.getCurrentLanguage?.() === "en" ? "meters" : "метров";
  return `${number} ${unit}`;
}

function formatTrailNumber(number) {
  if (window.getCurrentLanguage?.() !== "en") {
    return number;
  }

  return String(number).replaceAll("А", "A").replaceAll("В", "B");
}

function getTrailField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "trails-message";
  message.textContent = window.translateUiText ? window.translateUiText(text) : text;
  return message;
}

function initMapDownloads() {
  document.querySelectorAll("[data-download-url]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();

      const url = link.dataset.downloadUrl;
      const name = link.dataset.downloadName || "map.png";

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("download failed");
        }

        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = fileUrl;
        downloadLink.download = name;
        document.body.append(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      } catch (error) {
        window.location.href = url;
      }
    });
  });
}
