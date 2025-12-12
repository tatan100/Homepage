import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const SEARCH_URL = "https://search.brave.com/search?q=";
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = SEARCH_URL + encodeURIComponent(query);
      searchInput.value = "";
    }
  }
});

function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  document.getElementById("clock").innerText = `${h}:${m < 10 ? "0" + m : m}`;
  document.getElementById("ampm").innerText = ampm;
  const h24 = now.getHours();
  let greet = "Good evening!";
  if (h24 >= 5 && h24 < 12) greet = "Good morning!";
  else if (h24 >= 12 && h24 < 18) greet = "Good afternoon!";
  document.getElementById("greeting").innerText = greet;

  document.getElementById("dateDisplay").innerText = now.toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  );
}

const taskListEl = document.getElementById("taskList");
const bar = document.getElementById("progressBar");
const btnAdd = document.getElementById("btnAddTask");
const modalOverlay = document.getElementById("taskModalOverlay");
const taskForm = document.getElementById("taskForm");
const modalClose = document.getElementById("modalClose");
const btnCancel = document.getElementById("btnCancel");

let tasks = [];
const TASKS_DOC = "user-tasks";

async function loadTasks() {
  try {
    if (!window.db) {
      console.error("Firebase not initialized");
      return;
    }

    const docRef = doc(window.db, "homepage", TASKS_DOC);
    let isFirstLoad = true;

    onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          tasks = data.tasks || [];
          console.log("Tasks loaded from Firebase:", tasks.length);
        } else {
          console.log("No tasks found, starting fresh");
          tasks = [];
        }
        renderTasks();

        if (isFirstLoad) {
          checkAutoReset();
          isFirstLoad = false;
        }
      },
      (error) => {
        console.error("Error in snapshot listener:", error);
        loadTasksFromLocalStorage();
      },
    );
  } catch (e) {
    console.error("Failed to load tasks from Firebase:", e);
    loadTasksFromLocalStorage();
  }
}

function loadTasksFromLocalStorage() {
  const saved = localStorage.getItem("homepage-tasks");
  if (saved) {
    try {
      tasks = JSON.parse(saved);
      console.log("Tasks loaded from localStorage (fallback)");
    } catch (e) {
      tasks = [];
    }
  } else {
    tasks = [];
  }
  renderTasks();
}

async function saveTasks() {
  try {
    if (!window.db) {
      console.error("Firebase not initialized, saving to localStorage");
      saveTasksToLocalStorage();
      return;
    }

    const docRef = doc(window.db, "homepage", TASKS_DOC);
    await setDoc(docRef, {
      tasks: tasks,
      lastUpdated: new Date().toISOString(),
    });
    console.log("Tasks saved to Firebase");
    saveTasksToLocalStorage();
  } catch (e) {
    console.error("Failed to save tasks to Firebase:", e);
    saveTasksToLocalStorage();
    renderTasks();
  }
}

function saveTasksToLocalStorage() {
  localStorage.setItem("homepage-tasks", JSON.stringify(tasks));
  console.log("Tasks saved to localStorage (backup)");
}

function renderTasks() {
  taskListEl.innerHTML = "";
  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.checked ? "done" : ""}`;
    item.innerHTML = `
            <div class="task-left">
                <img src="${task.icon}" class="task-icon" onerror="this.src='https://www.google.com/s2/favicons?domain=example.com&sz=32'">
                <a href="${task.url}" class="task-link" target="_blank">${task.name}</a>
            </div>
            <div class="task-actions">
                <input type="checkbox" ${task.checked ? "checked" : ""}>
                <button class="btn-delete" data-id="${task.id}" aria-label="Delete task">🗑️</button>
            </div>
        `;
    item.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      if (e.target.tagName === "A") return;
      const link = item.querySelector(".task-link");
      if (link && link.href) link.click();
    });
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => {
      task.checked = checkbox.checked;
      saveTasks();
    });
    const deleteBtn = item.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete task "${task.name}"?`)) deleteTask(task.id);
    });
    taskListEl.appendChild(item);
  });
  updateProgressBar();
}

function updateProgressBar() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.checked).length;
  bar.style.width = total === 0 ? "0%" : (done / total) * 100 + "%";
}

function showModal() {
  modalOverlay.classList.add("active");
  document.getElementById("taskName").focus();
}

function hideModal() {
  modalOverlay.classList.remove("active");
  taskForm.reset();
}

function addNewTask() {
  showModal();
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("taskName").value.trim();
  const url = document.getElementById("taskUrl").value.trim();
  const iconUrl = document.getElementById("taskIcon").value.trim();
  if (!name || !url) return;
  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    domain = "google.com";
  }
  const icon =
    iconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const newTask = {
    id: Date.now().toString(),
    name,
    url,
    icon,
    checked: false,
  };
  tasks.push(newTask);
  saveTasks();
  hideModal();
});

modalClose.addEventListener("click", hideModal);
btnCancel.addEventListener("click", hideModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideModal();
});

if (btnAdd) {
  btnAdd.addEventListener("click", addNewTask);
}

function deleteTask(idToDelete) {
  tasks = tasks.filter((task) => task.id !== idToDelete);
  saveTasks();
}

window.manualReset = function (showConfirm = true) {
  if (!showConfirm || confirm("Reset all tasks unchecked?")) {
    tasks.forEach((t) => (t.checked = false));
    saveTasks();
    localStorage.setItem("lastResetDate", new Date().toISOString());
  }
};

function checkAutoReset() {
  const last = localStorage.getItem("lastResetDate");
  const now = new Date();
  const target = new Date(now);
  target.setHours(7, 0, 0, 0);

  if (now < target) target.setDate(target.getDate() - 1);

  const lastTime = last ? new Date(last) : new Date(0);

  if (lastTime < target) {
    console.log("Auto resetting tasks...");
    window.manualReset(false);
    localStorage.setItem("lastResetDate", now.toISOString());
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setTimeout(async () => {
    await loadTasks();
    setInterval(checkAutoReset, 60000);

    updateClock();
    setInterval(updateClock, 1000);
  }, 500);
});
