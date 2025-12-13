import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0GrHzgKBy6hp4yJagm-oBak3I0-UdyuA",
  authDomain: "webhome-1b778.firebaseapp.com",
  projectId: "webhome-1b778",
  storageBucket: "webhome-1b778.firebasestorage.app",
  messagingSenderId: "1034336329224",
  appId: "1:1034336329224:web:4459f93d38f3d4ef16fbbd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.db = db;
window.auth = auth;
window.provider = provider;
window.signInWithPopup = signInWithPopup;

const taskListEl = document.getElementById("taskList");
const bar = document.getElementById("progressBar");
const btnAdd = document.getElementById("btnAddTask");
const modalOverlay = document.getElementById("taskModalOverlay");
const taskForm = document.getElementById("taskForm");
const modalClose = document.getElementById("modalClose");
const btnCancel = document.getElementById("btnCancel");
const contextMenu = document.getElementById("contextMenu");
const menuEdit = document.getElementById("menuEdit");
const menuDelete = document.getElementById("menuDelete");
const searchInput = document.getElementById("searchInput");

let tasks = [];
let currentTaskRightClicked = null;
let isEditing = false;
let editingTaskId = null;
const TASKS_DOC = "user-tasks";

function showModal(isEditMode = false) {
  if (!modalOverlay) return;
  modalOverlay.classList.add("active");
  const title = document.querySelector(".modal-header h2");
  const submitBtn = document.querySelector(".btn-submit");
  if (isEditMode) {
    title.innerText = "Edit Task";
    submitBtn.innerText = "Save Changes";
    isEditing = true;
  } else {
    title.innerText = "Add New Task";
    submitBtn.innerText = "Add Task";
    taskForm.reset();
    isEditing = false;
    editingTaskId = null;
  }
  document.getElementById("taskName").focus();
}

function openEditModal(task) {
  if (!taskForm) return;
  document.getElementById("taskName").value = task.name;
  document.getElementById("taskUrl").value = task.url;
  document.getElementById("taskIcon").value = task.icon || "";
  editingTaskId = task.id;
  showModal(true);
}

function hideModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("active");
  taskForm.reset();
  isEditing = false;
  editingTaskId = null;
}

function showContextMenu(e, task) {
  if (!contextMenu) return;
  currentTaskRightClicked = task;
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.classList.add("active");
}

function hideContextMenu() {
  if (!contextMenu) return;
  contextMenu.classList.remove("active");
  currentTaskRightClicked = null;
}

async function saveTasks() {
  renderTasks();
  saveTasksToLocalStorage();
  if (!auth.currentUser) return;
  try {
    const docRef = doc(db, "homepage", TASKS_DOC);
    await setDoc(docRef, {
      tasks: tasks,
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Sync failed:", e);
  }
}

function deleteTask(idToDelete) {
  tasks = tasks.filter((task) => task.id !== idToDelete);
  saveTasks();
}

function renderTasks() {
  if (!taskListEl) return;
  taskListEl.innerHTML = "";
  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.checked ? "done" : ""}`;
    item.setAttribute("data-id", task.id);
    item.innerHTML = `
            <div class="task-left">
                <span class="drag-handle" style="cursor: grab; padding-right: 8px; color: #666;">⋮⋮</span>
                <img src="${task.icon}" class="task-icon" onerror="this.src='https://www.google.com/s2/favicons?domain=example.com&sz=32'">
                <a href="${task.url}" class="task-link" target="_blank" draggable="false">${task.name}</a>
            </div>
            <div class="task-actions">
                <input type="checkbox" ${task.checked ? "checked" : ""}>
            </div>
        `;
    item.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "A") return;
      const link = item.querySelector(".task-link");
      if (link && link.href) link.click();
    });
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => {
      task.checked = checkbox.checked;
      saveTasks();
    });
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e, task);
    });
    taskListEl.appendChild(item);
  });
  updateProgressBar();
}

function updateProgressBar() {
  if (!bar) return;
  const total = tasks.length;
  const done = tasks.filter((t) => t.checked).length;
  bar.style.width = total === 0 ? "0%" : (done / total) * 100 + "%";
}

function saveTasksToLocalStorage() {
  localStorage.setItem("homepage-tasks", JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
  const saved = localStorage.getItem("homepage-tasks");
  tasks = saved ? JSON.parse(saved) : [];
  renderTasks();
}

async function loadTasks() {
  try {
    const docRef = doc(db, "homepage", TASKS_DOC);
    let isFirstLoad = true;
    onSnapshot(docRef, (docSnap) => {
      tasks =
        docSnap.exists() && docSnap.data().tasks ? docSnap.data().tasks : [];
      renderTasks();
      if (isFirstLoad) {
        checkAutoReset();
        isFirstLoad = false;
      }
    });
  } catch (e) {
    loadTasksFromLocalStorage();
  }
}

function checkAutoReset() {
  const last = localStorage.getItem("lastResetDate");
  const now = new Date();
  const target = new Date(now);
  target.setHours(7, 0, 0, 0);
  if (now < target) target.setDate(target.getDate() - 1);
  const lastTime = last ? new Date(last) : new Date(0);
  if (lastTime < target) {
    window.manualReset(false);
  }
}

window.manualReset = function (showConfirm = true) {
  if (!showConfirm || confirm("Reset all tasks unchecked?")) {
    tasks.forEach((t) => (t.checked = false));
    saveTasks();
    localStorage.setItem("lastResetDate", new Date().toISOString());
  }
};

function updateClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  clockEl.innerText = `${h}:${m < 10 ? "0" + m : m}`;
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

document.addEventListener("DOMContentLoaded", async () => {
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();
        if (query)
          window.location.href = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) hideContextMenu();
  });

  if (menuDelete) {
    menuDelete.addEventListener("click", () => {
      if (
        currentTaskRightClicked &&
        confirm(`Delete "${currentTaskRightClicked.name}"?`)
      ) {
        deleteTask(currentTaskRightClicked.id);
      }
      hideContextMenu();
    });
  }

  if (menuEdit) {
    menuEdit.addEventListener("click", () => {
      if (currentTaskRightClicked) openEditModal(currentTaskRightClicked);
      hideContextMenu();
    });
  }

  if (taskForm) {
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

      if (isEditing && editingTaskId) {
        const taskIndex = tasks.findIndex((t) => t.id === editingTaskId);
        if (taskIndex > -1) {
          tasks[taskIndex].name = name;
          tasks[taskIndex].url = url;
          tasks[taskIndex].icon = icon;
        }
      } else {
        tasks.push({
          id: Date.now().toString(),
          name,
          url,
          icon,
          checked: false,
        });
      }
      saveTasks();
      hideModal();
    });

    if (modalClose) modalClose.addEventListener("click", hideModal);
    if (btnCancel) btnCancel.addEventListener("click", hideModal);
    if (modalOverlay)
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) hideModal();
      });
    if (btnAdd) btnAdd.addEventListener("click", () => showModal(false));
  }

  if (taskListEl && typeof Sortable !== "undefined") {
    new Sortable(taskListEl, {
      animation: 150,
      ghostClass: "sortable-ghost",
      handle: ".drag-handle",
      onEnd: function (evt) {
        const itemEls = taskListEl.querySelectorAll(".task-item");
        const newOrderIds = Array.from(itemEls).map((el) =>
          el.getAttribute("data-id"),
        );
        const reorderedTasks = newOrderIds
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t) => t !== undefined);
        tasks = reorderedTasks;
        saveTasks();
      },
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("✅ Logged in");
      await loadTasks();
    } else {
      console.log("⚠️ Not logged in");
      loadTasksFromLocalStorage();
    }
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkAutoReset, 60000);
  });
});
