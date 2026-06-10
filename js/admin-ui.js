(function () {
  function translate(text) {
    return window.translateUiText ? window.translateUiText(text) : text;
  }

  function openModal(titleText) {
    const modal = document.createElement("div");
    modal.className = "admin-modal";

    const dialog = document.createElement("div");
    dialog.className = "admin-modal__dialog admin-modal__dialog--form";

    const head = document.createElement("div");
    head.className = "admin-modal__head";

    const title = document.createElement("h2");
    title.className = "admin-modal__title";
    title.textContent = translate(titleText);

    const close = document.createElement("button");
    close.className = "admin-modal__close";
    close.type = "button";
    close.textContent = "×";

    head.append(title, close);
    dialog.append(head);
    modal.append(dialog);
    document.body.append(modal);
    document.body.classList.add("modal-open");

    return { modal, dialog, close };
  }

  function closeModal(modal) {
    modal.remove();
    document.body.classList.remove("modal-open");
  }

  function form(options) {
    return new Promise((resolve) => {
      const { modal, dialog, close } = openModal(options.title || "Форма");
      const formElement = document.createElement("form");
      const message = document.createElement("p");
      const actions = document.createElement("div");
      const submit = document.createElement("button");
      const cancel = document.createElement("button");

      formElement.className = "admin-form";
      message.className = "admin-panel__message";
      actions.className = "admin-panel__actions";
      submit.className = "admin-button";
      submit.type = "submit";
      submit.textContent = translate(options.submitText || "Сохранить");
      cancel.className = "admin-button admin-button--danger";
      cancel.type = "button";
      cancel.textContent = translate("Отмена");

      (options.fields || []).forEach((field) => {
        formElement.append(createField(field));
      });

      actions.append(submit, cancel);
      formElement.append(message, actions);
      dialog.append(formElement);

      const finish = (value) => {
        closeModal(modal);
        resolve(value);
      };

      close.addEventListener("click", () => finish(null));
      cancel.addEventListener("click", () => finish(null));
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          finish(null);
        }
      });

      formElement.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.className = "admin-panel__message";

        const data = {};
        const error = await collectFormData(formElement, options.fields || [], data);

        if (error) {
          message.textContent = error;
          message.classList.add("is-error");
          return;
        }

        finish(data);
      });
    });
  }

  function confirmModal(options) {
    return new Promise((resolve) => {
      const { modal, dialog, close } = openModal(options.title || "Подтвердите действие");
      const text = document.createElement("p");
      const actions = document.createElement("div");
      const submit = document.createElement("button");
      const cancel = document.createElement("button");

      text.className = "admin-panel__text";
      text.textContent = translate(options.text || "");
      actions.className = "admin-panel__actions";
      submit.className = "admin-button";
      submit.type = "button";
      submit.textContent = translate(options.confirmText || "Да");
      cancel.className = "admin-button admin-button--danger";
      cancel.type = "button";
      cancel.textContent = translate(options.cancelText || "Отмена");

      actions.append(submit);

      if (options.cancelText !== "") {
        actions.append(cancel);
      }
      dialog.append(text, actions);

      const finish = (value) => {
        closeModal(modal);
        resolve(value);
      };

      close.addEventListener("click", () => finish(false));
      cancel.addEventListener("click", () => finish(false));
      submit.addEventListener("click", () => finish(true));
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          finish(false);
        }
      });
    });
  }

  function notice(options) {
    return confirmModal({
      title: options.title || "Сообщение",
      text: options.text || "",
      confirmText: options.confirmText || "Понятно",
      cancelText: ""
    });
  }

  function createField(field) {
    const label = document.createElement("label");
    const title = document.createElement("span");
    let control;

    label.className = "admin-form__field";
    title.textContent = translate(field.label || field.name);

    if (field.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = field.rows || 4;
    } else if (field.type === "select") {
      control = document.createElement("select");
      (field.options || []).forEach((option) => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = translate(option.label);
        control.append(item);
      });
    } else if (field.type === "checkboxes") {
      control = document.createElement("div");
      control.className = "admin-form__checks";
      control.dataset.fieldName = field.name;
      (field.options || []).forEach((option) => {
        const item = document.createElement("label");
        const checkbox = document.createElement("input");
        const text = document.createElement("span");

        checkbox.type = "checkbox";
        checkbox.name = field.name;
        checkbox.value = option.value;
        checkbox.checked = Array.isArray(field.value) && field.value.includes(option.value);
        text.textContent = translate(option.label);
        item.append(checkbox, text);
        control.append(item);
      });
    } else {
      control = document.createElement("input");
      control.type = field.type || "text";
    }

    if (field.type !== "checkboxes") {
      control.name = field.name;
    }

    if (field.type === "file") {
      control.accept = field.accept || "image/*";
      control.dataset.currentValue = field.value || "";
    } else {
      control.value = field.value ?? "";
    }

    control.required = field.type === "file" ? field.required === true && !field.value : field.required === true;

    if (field.min !== undefined) {
      control.min = field.min;
    }

    if (field.step !== undefined) {
      control.step = field.step;
    }

    label.append(title, control);
    return label;
  }

  async function collectFormData(formElement, fields, data) {
    for (const field of fields) {
      const control = formElement.elements[field.name] || formElement.querySelector(`[data-field-name="${field.name}"]`);

      if (field.type === "checkboxes") {
        const values = Array.from(formElement.querySelectorAll(`input[name="${field.name}"]:checked`)).map((input) => input.value);
        data[field.name] = values;

        if (field.required && !values.length) {
          return `Выберите значение для поля "${field.label || field.name}".`;
        }

        continue;
      }

      const value = String(control.value || "").trim();

      if (field.type === "file") {
        if (control.files && control.files[0]) {
          data[field.name] = await readFileAsDataUrl(control.files[0]);
        } else {
          data[field.name] = control.dataset.currentValue || "";
        }

        if (field.required && !data[field.name]) {
          return `Выберите файл для поля "${field.label || field.name}".`;
        }

        continue;
      }

      if (field.required && !value) {
        return `Заполните поле "${field.label || field.name}".`;
      }

      if (field.type === "number" && value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
          return `Поле "${field.label || field.name}" должно быть числом.`;
        }

        data[field.name] = number;
      } else {
        data[field.name] = value;
      }
    }

    return "";
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  window.EurasiaAdminUI = {
    form,
    confirm: confirmModal,
    notice
  };
})();
