import {
  addCreatedByOption,
  getCreatedByOptions,
  removeCreatedByOption,
} from "./personnel-store.js";

const adminForm = document.querySelector("#admin-form");
const personNameInput = document.querySelector("#personName");
const messageBox = document.querySelector("#admin-message");
const personList = document.querySelector("#person-list");
const emptyState = document.querySelector("#empty-state");

renderPersonList();
adminForm.addEventListener("submit", handleSubmit);

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "form-message";

  if (type) {
    messageBox.classList.add(type);
  }
}

function renderPersonList() {
  const people = getCreatedByOptions();
  personList.innerHTML = "";
  emptyState.hidden = people.length > 0;

  for (const name of people) {
    const row = document.createElement("div");
    row.className = "person-row";

    const label = document.createElement("div");
    label.className = "person-name";
    label.textContent = name;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "刪除";
    deleteButton.addEventListener("click", () => {
      removeCreatedByOption(name);
      renderPersonList();
      setMessage(`已刪除人員：${name}`, "success");
    });

    row.append(label, deleteButton);
    personList.append(row);
  }
}

function handleSubmit(event) {
  event.preventDefault();

  const name = personNameInput.value.trim();

  if (!name) {
    setMessage("請輸入人員姓名。", "error");
    return;
  }

  const result = addCreatedByOption(name);

  if (!result.ok) {
    setMessage("這位人員已經存在。", "error");
    return;
  }

  renderPersonList();
  adminForm.reset();
  personNameInput.focus();
  setMessage(`已新增人員：${name}`, "success");
}
