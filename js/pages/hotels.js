const HOTELS_API_URL = "http://localhost:3000";
const HOTELS_USER_KEY = "eurasiaCurrentUser";
const PAGE_ASSET_PREFIX = "../../";
const HOTEL_MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь"
];

let hotelsData = [];
let roomsData = [];
let bookingsData = [];
let hotelBookingState = {
  hotel: null,
  room: null,
  month: null,
  checkIn: null,
  checkOut: null,
  message: null
};

document.addEventListener("DOMContentLoaded", initHotelsPage);

async function initHotelsPage() {
  const page = getHotelsPageElements();

  if (!page.hotelsList || !page.template) {
    return;
  }

  setupHotelBookingModal(page);

  try {
    const [hotels, rooms, bookings] = await Promise.all([
      fetchJson(`${HOTELS_API_URL}/hotels?isAvailable=true&_sort=id&_order=asc`),
      fetchJson(`${HOTELS_API_URL}/rooms?isAvailable=true&_sort=id&_order=asc`),
      fetchJson(`${HOTELS_API_URL}/bookings`)
    ]);

    hotelsData = Array.isArray(hotels) ? hotels : [];
    roomsData = Array.isArray(rooms) ? rooms : [];
    bookingsData = Array.isArray(bookings) ? bookings : [];
    renderHotels(page, hotelsData);
  } catch (error) {
    console.error("Не удалось загрузить данные проживания:", error);
    page.hotelsList.replaceChildren(createMessage("Данные временно недоступны"));
  }

  window.addEventListener("eurasia:user-change", () => renderHotels(page, hotelsData));
}

function getHotelsPageElements() {
  return {
    hotelsList: document.querySelector("[data-hotels-list]"),
    template: document.querySelector("#hotel-card-template"),
    bookingModal: document.querySelector("[data-hotel-booking-modal]"),
    bookingTitle: document.querySelector("[data-hotel-booking-title]"),
    bookingText: document.querySelector("[data-hotel-booking-text]"),
    bookingRooms: document.querySelector("[data-hotel-booking-rooms]"),
    bookingCalendar: document.querySelector("[data-hotel-booking-calendar]"),
    bookingMonth: document.querySelector("[data-hotel-booking-month]"),
    bookingSelected: document.querySelector("[data-hotel-booking-selected]"),
    bookingSubmit: document.querySelector("[data-hotel-booking-submit]"),
    bookingPrev: document.querySelector("[data-hotel-booking-prev]"),
    bookingNext: document.querySelector("[data-hotel-booking-next]")
  };
}

function setupHotelBookingModal(page) {
  if (!page.bookingModal) {
    return;
  }

  page.bookingModal.querySelectorAll("[data-hotel-booking-close]").forEach((button) => {
    button.addEventListener("click", () => closeHotelBookingModal(page));
  });

  page.bookingPrev.addEventListener("click", () => changeHotelBookingMonth(page, -1));
  page.bookingNext.addEventListener("click", () => changeHotelBookingMonth(page, 1));
  page.bookingSubmit.addEventListener("click", () => submitHotelBooking(page));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !page.bookingModal.hidden) {
      closeHotelBookingModal(page);
    }
  });
}

async function fetchJson(url, options) {
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

function renderHotels(page, hotels) {
  page.hotelsList.replaceChildren();

  if (!hotels.length) {
    page.hotelsList.append(createMessage("Данные временно недоступны"));
    return;
  }

  const fragment = document.createDocumentFragment();

  hotels.forEach((hotel) => {
    const card = page.template.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("[data-hotel-image]");
    const distance = card.querySelector("[data-hotel-distance]");
    const title = card.querySelector("[data-hotel-title]");
    const description = card.querySelector("[data-hotel-description]");
    const button = card.querySelector("[data-hotel-button]");
    const message = card.querySelector("[data-hotel-message]");

    card.dataset.hotelId = String(hotel.id);
    image.src = resolveAssetPath(hotel.image);
    image.alt = hotel.title;
    distance.textContent = hotel.distance;
    title.textContent = hotel.title;
    description.textContent = hotel.description;
    button.setAttribute("aria-label", `Забронировать: ${hotel.title}`);
    button.addEventListener("click", (event) => handleHotelButtonClick(event, page, hotel, button, message));

    fragment.append(card);
  });

  page.hotelsList.append(fragment);
}

function handleHotelButtonClick(event, page, hotel, button, message) {
  const user = getCurrentHotelUser();

  if (!user) {
    button.dataset.openLogin = "";
    showHotelCardMessage(message, "Войдите, чтобы забронировать номер.");
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  delete button.dataset.openLogin;
  openHotelBookingModal(page, hotel, message);
}

function openHotelBookingModal(page, hotel, message) {
  const rooms = getRoomsForHotel(hotel.id);

  hotelBookingState = {
    hotel,
    room: null,
    month: getInitialHotelMonth(),
    checkIn: null,
    checkOut: null,
    message
  };

  page.bookingTitle.textContent = hotel.title;
  page.bookingText.textContent = rooms.length
    ? "Выберите номер, дату заезда и дату выезда. В корзину попадет одна бронь на весь период."
    : "Для этого корпуса пока нет доступных номеров.";
  page.bookingRooms.replaceChildren();
  page.bookingSelected.textContent = "";
  page.bookingSubmit.disabled = true;

  rooms.slice(0, 5).forEach((room) => {
    page.bookingRooms.append(createRoomOption(page, room));
  });

  page.bookingModal.hidden = false;
  document.body.classList.add("modal-open");
  renderHotelCalendar(page);
}

function closeHotelBookingModal(page) {
  if (!page.bookingModal) {
    return;
  }

  page.bookingModal.hidden = true;
  document.body.classList.remove("modal-open");
  hotelBookingState.hotel = null;
  hotelBookingState.room = null;
  hotelBookingState.checkIn = null;
  hotelBookingState.checkOut = null;
}

function createRoomOption(page, room) {
  const label = document.createElement("label");
  label.className = "hotel-room-option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "hotel-room";
  input.value = String(room.id);

  const check = document.createElement("span");
  check.className = "hotel-room-option__check";

  const text = document.createElement("span");
  text.className = "hotel-room-option__text";
  text.append(
    createElement("strong", `${room.title} · номер ${room.roomNumber}`),
    createElement("span", `${room.capacity} гост. · ${formatPrice(room.pricePerNight)} за ночь`),
    createElement("small", room.description)
  );

  input.addEventListener("change", () => {
    hotelBookingState.room = room;
    hotelBookingState.checkIn = null;
    hotelBookingState.checkOut = null;
    page.bookingSelected.textContent = "";
    page.bookingSubmit.disabled = true;
    renderHotelCalendar(page);
  });

  label.append(input, check, text);
  return label;
}

function changeHotelBookingMonth(page, direction) {
  if (!hotelBookingState.month) {
    return;
  }

  hotelBookingState.month = new Date(
    hotelBookingState.month.getFullYear(),
    hotelBookingState.month.getMonth() + direction,
    1
  );
  renderHotelCalendar(page);
}

function renderHotelCalendar(page) {
  const month = hotelBookingState.month || getInitialHotelMonth();
  page.bookingCalendar.replaceChildren();
  page.bookingMonth.textContent = `${HOTEL_MONTHS[month.getMonth()]} ${month.getFullYear()}`;

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = addDays(monthStart, -getMondayIndex(monthStart));

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(calendarStart, i);
    const button = document.createElement("button");
    const canChoose = hotelBookingState.room ? canChooseHotelDate(hotelBookingState.room.id, date) : false;

    button.className = "hotel-booking__day";
    button.type = "button";
    button.textContent = String(date.getDate());
    button.disabled = !canChoose;

    if (date.getMonth() !== month.getMonth()) {
      button.classList.add("is-other-month");
    }

    if (isSameHotelDate(date, hotelBookingState.checkIn)) {
      button.classList.add("is-selected", "is-range-start");
    }

    if (isSameHotelDate(date, hotelBookingState.checkOut)) {
      button.classList.add("is-selected", "is-range-end");
    }

    if (isHotelDateInsideRange(date)) {
      button.classList.add("is-selected");
    }

    if (canChoose) {
      button.addEventListener("click", () => selectHotelDate(page, date));
    }

    page.bookingCalendar.append(button);
  }
}

function canChooseHotelDate(roomId, date) {
  const isAvailable = isHotelDateAvailable(roomId, date);
  const checkIn = hotelBookingState.checkIn;

  if (!checkIn || hotelBookingState.checkOut) {
    return isAvailable;
  }

  if (date <= checkIn) {
    return isAvailable;
  }

  return isHotelRangeAvailable(roomId, checkIn, date);
}

function selectHotelDate(page, date) {
  const selectedDate = stripTime(date);
  const checkIn = hotelBookingState.checkIn;

  if (!checkIn || hotelBookingState.checkOut || selectedDate <= checkIn) {
    hotelBookingState.checkIn = selectedDate;
    hotelBookingState.checkOut = null;
  } else if (isHotelRangeAvailable(hotelBookingState.room.id, checkIn, selectedDate)) {
    hotelBookingState.checkOut = selectedDate;
  } else {
    page.bookingSelected.textContent = "В выбранном периоде есть занятые даты.";
    page.bookingSubmit.disabled = true;
  }

  updateHotelBookingSummary(page);
  renderHotelCalendar(page);
}

function updateHotelBookingSummary(page) {
  const checkIn = hotelBookingState.checkIn;
  const checkOut = hotelBookingState.checkOut;

  if (!hotelBookingState.room || !checkIn) {
    page.bookingSelected.textContent = hotelBookingState.room
      ? "Выберите дату заезда."
      : "Сначала выберите номер.";
    page.bookingSubmit.disabled = true;
    return;
  }

  if (!checkOut) {
    page.bookingSelected.textContent = `Заезд: ${formatDisplayDate(checkIn)}. Теперь выберите дату выезда.`;
    page.bookingSubmit.disabled = true;
    return;
  }

  const nights = getHotelStayNights(checkIn, checkOut);
  const total = nights * Number(hotelBookingState.room.pricePerNight || 0);
  page.bookingSelected.textContent = `Период: ${formatDisplayDate(checkIn)} - ${formatDisplayDate(checkOut)}. Ночей: ${nights}. Итого: ${formatPrice(total)}.`;
  page.bookingSubmit.disabled = false;
}

async function submitHotelBooking(page) {
  const user = getCurrentHotelUser();
  const room = hotelBookingState.room;
  const checkIn = hotelBookingState.checkIn;
  const checkOut = hotelBookingState.checkOut;

  if (!user || !room || !checkIn || !checkOut || !hotelBookingState.hotel) {
    updateHotelBookingSummary(page);
    return;
  }

  page.bookingSubmit.disabled = true;
  page.bookingSubmit.textContent = "Добавляем...";

  try {
    const item = await addHotelBookingToCart(user, hotelBookingState.hotel, room, checkIn, checkOut);
    const text = item
      ? "Бронь добавлена в корзину."
      : "Такая бронь уже есть в корзине.";
    showHotelCardMessage(hotelBookingState.message, text, "success");
    closeHotelBookingModal(page);
  } catch (error) {
    console.error("Не удалось добавить бронь в корзину:", error);
    page.bookingSelected.textContent = "Не удалось добавить бронь в корзину. Проверьте JSON Server.";
  } finally {
    page.bookingSubmit.textContent = "Забронировать";
    page.bookingSubmit.disabled = !(hotelBookingState.checkIn && hotelBookingState.checkOut);
  }
}

async function addHotelBookingToCart(user, hotel, room, checkInDate, checkOutDate) {
  const checkIn = formatInputDate(checkInDate);
  const checkOut = formatInputDate(checkOutDate);
  const nights = getHotelStayNights(checkInDate, checkOutDate);
  const totalPrice = nights * Number(room.pricePerNight || 0);
  const cartItems = await fetchJson(`${HOTELS_API_URL}/cart?userId=${user.id}&itemType=hotel&roomId=${room.id}`);
  const duplicate = Array.isArray(cartItems) && cartItems.find((item) => {
    return item.checkIn === checkIn && item.checkOut === checkOut && Number(item.hotelId) === Number(hotel.id);
  });

  if (duplicate) {
    return null;
  }

  return fetchJson(`${HOTELS_API_URL}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId: user.id,
      itemType: "hotel",
      hotelId: hotel.id,
      roomId: room.id,
      title: hotel.title,
      details: `Номер ${room.roomNumber} · ${formatDisplayDate(checkInDate)} - ${formatDisplayDate(checkOutDate)}`,
      checkIn,
      checkOut,
      guests: room.capacity,
      price: totalPrice,
      quantity: 1,
      image: hotel.image,
      createdAt: formatInputDate(new Date())
    })
  });
}

function isHotelDateAvailable(roomId, date) {
  const day = stripTime(date);

  if (day < getToday()) {
    return false;
  }

  return !bookingsData.some((booking) => {
    if (Number(booking.roomId) !== Number(roomId)) {
      return false;
    }

    if (String(booking.status).toLowerCase() === "cancelled") {
      return false;
    }

    const checkIn = parseInputDate(booking.checkIn);
    const checkOut = parseInputDate(booking.checkOut);

    if (!checkIn || !checkOut) {
      return false;
    }

    return day >= checkIn && day < checkOut;
  });
}

function isHotelRangeAvailable(roomId, checkInDate, checkOutDate) {
  const checkIn = stripTime(checkInDate);
  const checkOut = stripTime(checkOutDate);

  if (checkOut <= checkIn || checkIn < getToday()) {
    return false;
  }

  return !bookingsData.some((booking) => {
    if (Number(booking.roomId) !== Number(roomId)) {
      return false;
    }

    if (String(booking.status).toLowerCase() === "cancelled") {
      return false;
    }

    const busyFrom = parseInputDate(booking.checkIn);
    const busyTo = parseInputDate(booking.checkOut);

    if (!busyFrom || !busyTo) {
      return false;
    }

    return checkIn < busyTo && checkOut > busyFrom;
  });
}

function getRoomsForHotel(hotelId) {
  return roomsData.filter((room) => Number(room.hotelId) === Number(hotelId) && room.isAvailable !== false);
}

function isSameHotelDate(first, second) {
  return first && second && formatInputDate(first) === formatInputDate(second);
}

function isHotelDateInsideRange(date) {
  const checkIn = hotelBookingState.checkIn;
  const checkOut = hotelBookingState.checkOut;

  return checkIn && checkOut && date > checkIn && date < checkOut;
}

function getHotelStayNights(checkIn, checkOut) {
  return Math.max(1, Math.round((stripTime(checkOut) - stripTime(checkIn)) / 86400000));
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

function getCurrentHotelUser() {
  try {
    return JSON.parse(localStorage.getItem(HOTELS_USER_KEY));
  } catch (error) {
    return null;
  }
}

function getInitialHotelMonth() {
  const today = getToday();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function getToday() {
  return stripTime(new Date());
}

function parseInputDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function addDays(date, count) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + count);
  return stripTime(nextDate);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function showHotelCardMessage(message, text, type = "") {
  if (!message) {
    return;
  }

  message.textContent = text;
  message.dataset.messageType = type;
}

function createElement(tagName, text, className = "") {
  const element = document.createElement(tagName);
  element.textContent = text;

  if (className) {
    element.className = className;
  }

  return element;
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "hotels-message";
  message.textContent = text;
  return message;
}
