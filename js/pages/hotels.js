const HOTELS_API_URL = "http://localhost:3000/hotels?isAvailable=true&_sort=id&_order=asc";
const PAGE_ASSET_PREFIX = "../../";

document.addEventListener("DOMContentLoaded", initHotelsPage);

async function initHotelsPage() {
  const hotelsList = document.querySelector("[data-hotels-list]");
  const template = document.querySelector("#hotel-card-template");

  if (!hotelsList || !template) {
    return;
  }

  try {
    const hotels = await fetchJson(HOTELS_API_URL);
    renderHotels(hotelsList, template, hotels);
  } catch (error) {
    console.error("Не удалось загрузить данные проживания:", error);
    hotelsList.replaceChildren(createMessage("Данные временно недоступны"));
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
  }

  return response.json();
}

function renderHotels(container, template, hotels) {
  container.replaceChildren();

  if (!hotels.length) {
    container.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  hotels.forEach((hotel) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("[data-hotel-image]");
    const distance = card.querySelector("[data-hotel-distance]");
    const title = card.querySelector("[data-hotel-title]");
    const description = card.querySelector("[data-hotel-description]");
    const button = card.querySelector("[data-hotel-button]");

    card.dataset.hotelId = String(hotel.id);
    image.src = resolveAssetPath(hotel.image);
    image.alt = hotel.title;
    distance.textContent = hotel.distance;
    title.textContent = hotel.title;
    description.textContent = hotel.description;
    button.setAttribute("aria-label", `Забронировать: ${hotel.title}`);

    fragment.append(card);
  });

  container.append(fragment);
}

function resolveAssetPath(path) {
  if (!path) {
    return "";
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${PAGE_ASSET_PREFIX}${path}`;
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "hotels-message";
  message.textContent = text;
  return message;
}
