// Referências para elementos HTML usados no app
const todoForm = document.getElementById("todoForm");
const taskInput = document.getElementById("taskInput");
const taskCategory = document.getElementById("taskCategory");
const taskPriority = document.getElementById("taskPriority");
const taskDate = document.getElementById("taskDate");
const todoList = document.getElementById("todoList");
const taskCounter = document.getElementById("taskCounter");
const emptyState = document.getElementById("emptyState");
const filters = document.getElementById("filters");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const deleteModal = document.getElementById("deleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// Chaves usadas no localStorage
const TASKS_KEY = "taskflow_advanced_tasks";
const THEME_KEY = "taskflow_advanced_theme";

// Estado da aplicação em memória
let tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
let currentFilter = "all";
let editingTaskId = null;
let taskToDelete = null;
let dragStartId = null;

// Salva a lista de tarefas no localStorage
function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// Salva o tema atual no localStorage
function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// Carrega o tema salvo e aplica na interface
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "light") {
        document.body.classList.add("light");
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove("light");
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// Converte a data do formato yyyy-mm-dd para dd/mm/yyyy
function formatDate(dateString) {
    if (!dateString) return "Sem prazo";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
}

// Escapa texto para evitar injeção de HTML nas tarefas
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Aplica filtros por status e busca de texto
function getFilteredTasks() {
    let filtered = tasks;

    if (currentFilter === "pending") {
        filtered = filtered.filter((task) => !task.done);
    }

    if (currentFilter === "done") {
        filtered = filtered.filter((task) => task.done);
    }

    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm) {
        filtered = filtered.filter((task) =>
            task.text.toLowerCase().includes(searchTerm) ||
            task.category.toLowerCase().includes(searchTerm) ||
            task.priority.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

// Atualiza o contador de tarefas e a barra de progresso visual
function updateCounter() {
    const total = tasks.length;
    const done = tasks.filter((task) => task.done).length;
    const pending = total - done;

    taskCounter.textContent = `${total} tarefa(s) • ${pending} pendente(s) • ${done} concluída(s)`;

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
}

// Constrói a lista de tarefas visível na página
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    todoList.innerHTML = "";

    if (filteredTasks.length === 0) {
        emptyState.classList.add("show");
    } else {
        emptyState.classList.remove("show");
    }

    filteredTasks.forEach((task) => {
        const li = document.createElement("li");
        li.className = `todo-item ${task.done ? "done" : ""}`;
        li.dataset.id = String(task.id);
        li.draggable = true;

        const isEditing = editingTaskId === task.id;

        li.innerHTML = `
      <button class="todo-check-btn" type="button" data-action="toggle" data-id="${task.id}" aria-label="Marcar tarefa">
        <span class="todo-check"></span>
      </button>

      <div class="todo-main">
        <div class="todo-top-line">
          ${isEditing
                ? `<input class="todo-edit-input" type="text" value="${escapeHtml(task.text)}" data-id="${task.id}" />`
                : `<p class="todo-text">${escapeHtml(task.text)}</p>`
            }
        </div>

        <div class="todo-meta">
          <span class="meta-badge">${escapeHtml(task.category)}</span>
          <span class="meta-badge priority-${task.priority}">${escapeHtml(task.priority)}</span>
          <span class="meta-badge">${formatDate(task.date)}</span>
        </div>
      </div>

      <div class="todo-actions">
        <button class="icon-btn drag" type="button" aria-label="Arrastar">
          <i class="fa-solid fa-grip-lines"></i>
        </button>

        <button class="icon-btn edit" type="button" data-action="${isEditing ? "save" : "edit"}" data-id="${task.id}" aria-label="Editar tarefa">
          <i class="fa-solid ${isEditing ? "fa-check" : "fa-pen"}"></i>
        </button>

        <button class="icon-btn delete" type="button" data-action="delete" data-id="${task.id}" aria-label="Excluir tarefa">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

        todoList.appendChild(li);

        if (isEditing) {
            const input = li.querySelector(".todo-edit-input");
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);

            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    saveEditedTask(task.id, input.value.trim());
                }

                if (event.key === "Escape") {
                    editingTaskId = null;
                    renderTasks();
                }
            });

            input.addEventListener("blur", () => {
                saveEditedTask(task.id, input.value.trim());
            });
        }

        li.addEventListener("dragstart", () => {
            dragStartId = task.id;
            li.classList.add("dragging");
        });

        li.addEventListener("dragend", () => {
            li.classList.remove("dragging");
            dragStartId = null;
        });

        li.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        li.addEventListener("drop", () => {
            if (dragStartId === null || dragStartId === task.id) return;
            reorderTasks(dragStartId, task.id);
        });
    });

    updateCounter();
}

function reorderTasks(startId, targetId) {
    const startIndex = tasks.findIndex((task) => task.id === startId);
    const targetIndex = tasks.findIndex((task) => task.id === targetId);

    if (startIndex === -1 || targetIndex === -1) return;

    const [movedTask] = tasks.splice(startIndex, 1);
    tasks.splice(targetIndex, 0, movedTask);

    saveTasks();
    renderTasks();
}

function addTask(taskText) {
    const newTask = {
        id: Date.now(),
        text: taskText,
        done: false,
        category: taskCategory.value,
        priority: taskPriority.value,
        date: taskDate.value
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
}

function toggleTask(taskId) {
    tasks = tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
    );

    saveTasks();
    renderTasks();
}

function startEditTask(taskId) {
    editingTaskId = taskId;
    renderTasks();
}

function saveEditedTask(taskId, newText) {
    if (!newText) {
        editingTaskId = null;
        renderTasks();
        return;
    }

    tasks = tasks.map((task) =>
        task.id === taskId ? { ...task, text: newText } : task
    );

    editingTaskId = null;
    saveTasks();
    renderTasks();
}

// Abre o modal de confirmação para excluir uma tarefa
function openDeleteModal(taskId) {
    taskToDelete = taskId;
    deleteModal.classList.add("show");
}

// Fecha o modal de exclusão sem remover tarefa
function closeDeleteModal() {
    taskToDelete = null;
    deleteModal.classList.remove("show");
}

// Remove a tarefa selecionada da lista
function deleteTask(taskId) {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
}

// Remove todas as tarefas marcadas como concluídas
function clearDoneTasks() {
    tasks = tasks.filter((task) => !task.done);
    saveTasks();
    renderTasks();
}

// Manipula o envio do formulário para adicionar uma nova tarefa
todoForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();
    if (!text) return;

    addTask(text);
    taskInput.value = "";
    taskDate.value = "";
    taskPriority.value = "Média";
    taskCategory.value = "Estudos";
    taskInput.focus();
});

// Trata os cliques nos botões da lista de tarefas
todoList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const taskId = Number(button.dataset.id);

    if (action === "toggle") {
        toggleTask(taskId);
    }

    if (action === "delete") {
        openDeleteModal(taskId);
    }

    if (action === "edit") {
        startEditTask(taskId);
    }

    if (action === "save") {
        const input = document.querySelector(`.todo-edit-input[data-id="${taskId}"]`);
        saveEditedTask(taskId, input ? input.value.trim() : "");
    }
});

// Altera o filtro ativo e atualiza a lista de tarefas
filters.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-btn");
    if (!button) return;

    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderTasks();
});

// Atualiza a lista enquanto o usuário digita na busca
searchInput.addEventListener("input", renderTasks);

// Limpa as tarefas concluídas
clearDoneBtn.addEventListener("click", () => {
    clearDoneTasks();
});

// Alterna entre tema claro e escuro
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");
    themeToggle.innerHTML = isLight
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';

    saveTheme(isLight ? "light" : "dark");
});

// Eventos do modal de confirmação de exclusão
cancelDeleteBtn.addEventListener("click", closeDeleteModal);

confirmDeleteBtn.addEventListener("click", () => {
    if (taskToDelete !== null) {
        deleteTask(taskToDelete);
    }
    closeDeleteModal();
});

deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
});

// Inicializa o app carregando o tema e exibindo as tarefas em tela
loadTheme();
renderTasks();