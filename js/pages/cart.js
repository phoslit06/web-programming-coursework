const CART_API_URL = "http://localhost:3000";
const CART_USER_KEY = "eurasiaCurrentUser";
const CART_MESSAGE_KEY = "eurasiaCartMessage";
const CART_ASSET_PREFIX = "../../";
const CART_IMAGE = "../../assets/images/hotels/hotel-city.jpg";
let cartCheckoutState = {
  items: [],
  user: null
};
let checkoutInProgress = false;

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector("[data-cart-list]");

  if (page) {
    setupPaymentModal();
    initCartPage();
    window.addEventListener("eurasia:user-change", initCartPage);
  }
});

async function initCartPage() {
  const state = document.querySelector("[data-cart-state]");
  const layout = document.querySelector("[data-cart-layout]");
  const user = getCartUser();

  if (!user) {
    layout.hidden = true;
    renderCartLoginState(state);
    return;
  }

  try {
    const items = await fetchCartJson(`${CART_API_URL}/cart?userId=${user.id}`);
    renderCart(items, user);
  } catch (error) {
    console.error(error);
    layout.hidden = true;
    state.hidden = false;
    state.textContent = translateCartText("Не удалось загрузить корзину. Проверьте JSON Server.");
  }
}

function renderCartLoginState(state) {
  state.hidden = false;
  state.replaceChildren();
  state.append(
    createCartText(translateCartText("Чтобы посмотреть корзину, нужно войти.")),
    createCartButton(translateCartText("Войти"), "button button--primary", { openLogin: "" })
  );
}

function renderCart(items, user) {
  const state = document.querySelector("[data-cart-state]");
  const layout = document.querySelector("[data-cart-layout]");
  const list = document.querySelector("[data-cart-list]");
  const orderButton = document.querySelector("[data-order-button]");
  const message = document.querySelector("[data-order-message]");

  list.replaceChildren();
  message.textContent = "";
  message.classList.remove("is-error");

  if (!items.length) {
    const savedMessage = sessionStorage.getItem(CART_MESSAGE_KEY);
    sessionStorage.removeItem(CART_MESSAGE_KEY);
    layout.hidden = true;
    state.hidden = false;
    state.textContent = translateCartText(savedMessage || "Корзина пока пустая.");
    return;
  }

  state.hidden = true;
  layout.hidden = false;
  items.forEach((item) => list.append(createCartCard(item)));
  updateCartSummary(items);

  orderButton.disabled = false;
  orderButton.onclick = () => openPaymentModal(items, user);
}

function createCartCard(item) {
  const card = document.createElement("article");
  card.className = "cart-card";

  const image = document.createElement("img");
  image.className = "cart-card__image";
  image.src = resolveCartAssetPath(item.image || CART_IMAGE);
  const itemTitle = getCartField(item, "title");
  image.alt = itemTitle;

  const content = document.createElement("div");
  content.className = "cart-card__content";
  content.append(
    createCartElement("h2", itemTitle, "cart-card__title"),
    createCartDetails(item),
    createCartElement("strong", formatCartPrice(getCartItemTotal(item)), "cart-card__price")
  );

  const deleteButton = document.createElement("button");
  deleteButton.className = "cart-card__delete";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `${translateCartText("Удалить")} ${itemTitle}`);
  deleteButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  `;
  deleteButton.addEventListener("click", () => removeCartItem(item.id));

  card.append(image, content, deleteButton);
  return card;
}

function createCartDetails(item) {
  const details = document.createElement("div");
  details.className = "cart-card__details";
  const values = [
    translateCartType(item.itemType),
    getCartField(item, "details"),
    translateCartText(`Количество: ${Number(item.quantity || 1)}`),
    formatCartPrice(Number(item.price || 0))
  ].filter(Boolean);

  values.forEach((value) => details.append(createCartElement("span", value)));

  return details;
}

function updateCartSummary(items) {
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const total = items.reduce((sum, item) => sum + getCartItemTotal(item), 0);

  document.querySelector("[data-summary-count]").textContent = translateCartText(`Товары, ${quantity}шт`);
  document.querySelector("[data-summary-subtotal]").textContent = formatCartPrice(total);
  document.querySelector("[data-summary-total]").textContent = formatCartPrice(total);
}

async function removeCartItem(id) {
  try {
    await fetchCartJson(`${CART_API_URL}/cart/${id}`, { method: "DELETE" });
    await initCartPage();
  } catch (error) {
    console.error(error);
    showOrderMessage(translateCartText("Не удалось удалить товар."), true);
  }
}

function setupPaymentModal() {
  const modal = document.querySelector("[data-cart-payment-modal]");

  if (!modal) {
    return;
  }

  modal.querySelectorAll("[data-payment-close]").forEach((button) => {
    button.addEventListener("click", closePaymentModal);
  });

  const payNow = modal.querySelector("[data-pay-now]");
  const payLater = modal.querySelector("[data-pay-later]");

  payNow.addEventListener("click", () => createOrder("paid"));
  payLater.addEventListener("click", () => createOrder("pending"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closePaymentModal();
    }
  });
}

function openPaymentModal(items, user) {
  const modal = document.querySelector("[data-cart-payment-modal]");

  if (!modal) {
    createOrder("pending", items, user);
    return;
  }

  cartCheckoutState = {
    items,
    user
  };
  modal.querySelectorAll("[data-pay-now], [data-pay-later]").forEach((button) => {
    button.disabled = false;
  });
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closePaymentModal() {
  const modal = document.querySelector("[data-cart-payment-modal]");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function createOrder(paymentStatus, givenItems, givenUser) {
  if (checkoutInProgress) {
    return;
  }

  const orderButton = document.querySelector("[data-order-button]");
  const modal = document.querySelector("[data-cart-payment-modal]");
  const paymentButtons = modal ? modal.querySelectorAll("[data-pay-now], [data-pay-later]") : [];
  const items = givenItems || cartCheckoutState.items;
  const user = givenUser || cartCheckoutState.user;
  const total = items.reduce((sum, item) => sum + getCartItemTotal(item), 0);

  if (!items.length || !user) {
    closePaymentModal();
    return;
  }

  checkoutInProgress = true;
  orderButton.disabled = true;
  paymentButtons.forEach((button) => {
    button.disabled = true;
  });
  showOrderMessage(translateCartText("Оформляем бронирование..."));

  try {
    const bookings = await Promise.all(items.map((item) => createBookingFromCartItem(item, user, paymentStatus)));
    await fetchCartJson(`${CART_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.id,
        items: items.map(({ id, ...item }) => item),
        bookingIds: bookings.map((booking) => booking.id),
        totalPrice: total,
        status: "created",
        paymentStatus,
        createdAt: formatCartDateInput(new Date())
      })
    });

    await Promise.all(items.map((item) => fetchCartJson(`${CART_API_URL}/cart/${item.id}`, { method: "DELETE" })));
    closePaymentModal();
    const paymentText = translateCartText(paymentStatus === "paid" ? "Оплачено" : "Ожидает оплаты");
    sessionStorage.setItem(
      CART_MESSAGE_KEY,
      translateCartText(`Бронирование оформлено. Статус оплаты: ${paymentText}.`)
    );
    await initCartPage();
  } catch (error) {
    console.error(error);
    orderButton.disabled = false;
    paymentButtons.forEach((button) => {
      button.disabled = false;
    });
    showOrderMessage(translateCartText("Не удалось оформить бронирование. Проверьте JSON Server."), true);
  } finally {
    checkoutInProgress = false;
  }
}

async function createBookingFromCartItem(item, user, paymentStatus) {
  const dates = getCartBookingDates(item);
  const booking = {
    userId: user.id,
    itemType: item.itemType || "cart",
    title: item.title,
    titleEn: item.titleEn || item.title,
    details: getBookingDetailsText(item),
    detailsEn: item.detailsEn || getBookingDetailsText(item),
    image: normalizeBookingImage(item.image),
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    guests: Number(item.guests || 1),
    totalPrice: getCartItemTotal(item),
    status: "confirmed",
    paymentStatus,
    createdAt: formatCartDateInput(new Date())
  };

  if (item.itemId) {
    booking.itemId = item.itemId;
  }

  if (item.hotelId) {
    booking.hotelId = item.hotelId;
  }

  if (item.roomId) {
    booking.roomId = item.roomId;
  }

  return fetchCartJson(`${CART_API_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(booking)
  });
}

function showOrderMessage(text, isError = false) {
  const message = document.querySelector("[data-order-message]");
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

async function fetchCartJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Ошибка запроса ${url}: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getCartUser() {
  try {
    return JSON.parse(localStorage.getItem(CART_USER_KEY));
  } catch (error) {
    return null;
  }
}

function getCartItemTotal(item) {
  return Number(item.price || 0) * Number(item.quantity || 1);
}

function normalizeBookingImage(path) {
  if (!path) {
    return CART_IMAGE.replace("../../", "");
  }

  return path.replace(/^(\.\.\/)+/, "");
}

function getBookingDetailsText(item) {
  if (item.itemType === "hotel") {
    return getCartField(item, "details") || translateCartText("Проживание");
  }

  return translateCartType(item.itemType);
}

function getCartBookingDates(item) {
  const checkIn = item.checkIn || formatCartDateInput(new Date());
  const checkOut = item.checkOut || formatCartDateInput(addCartDays(parseCartDate(checkIn), 1));

  return {
    checkIn,
    checkOut
  };
}

function parseCartDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function addCartDays(date, count) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + count);
  return nextDate;
}

function formatCartDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function translateCartType(type) {
  const types = {
    tariff: "Услуга",
    tour: "Тур",
    promotion: "Акция",
    hotel: "Проживание"
  };

  return translateCartText(types[type] || "Позиция");
}

function formatCartPrice(value) {
  return window.formatLocalizedCurrency
    ? window.formatLocalizedCurrency(value)
    : `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function getCartField(item, field) {
  return window.getLocalizedField ? window.getLocalizedField(item, field) : item?.[field] || "";
}

function translateCartText(text) {
  return window.getTranslationBySource ? window.getTranslationBySource(text) : text;
}

function resolveCartAssetPath(path) {
  if (!path) {
    return CART_IMAGE;
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("../") || path.startsWith("./")) {
    return path;
  }

  return `${CART_ASSET_PREFIX}${path}`;
}

function createCartElement(tagName, text, className = "") {
  const element = document.createElement(tagName);
  element.textContent = translateCartText(text);

  if (className) {
    element.className = className;
  }

  return element;
}

function createCartText(text) {
  return document.createTextNode(text);
}

function createCartButton(text, className, dataset = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;

  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });

  return button;
}
