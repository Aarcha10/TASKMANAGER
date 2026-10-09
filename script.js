
/* FLOWSTATE TASK MANAGER */

const $ = id => document.getElementById(id);

let tasks = [];

try {
    const saved = JSON.parse(localStorage.getItem("flowstateTasks"));
    if (Array.isArray(saved)) tasks = saved;
} catch (e) {
    tasks = [];
}

// Today's date
$("today").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

function localDate(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

// Add a task
$("taskForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = $("taskInput").value.trim();
    if (!name) return;

    tasks.unshift({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        name: name,
        priority: $("priority").value,
        dueDate: $("dueDate").value,
        completed: false
    });

    saveTasks();
    $("taskForm").reset();
    $("priority").value = "Medium";
    $("taskInput").focus();
});

// Save tasks
function saveTasks() {
    try {
        localStorage.setItem("flowstateTasks", JSON.stringify(tasks));
    } catch (e) {
        alert("Could not save tasks in this browser.");
    }
    renderTasks();
}

// Complete a task
function toggleTask(id) {
    tasks = tasks.map(task =>
        task.id === id
            ? { ...task, completed: !task.completed }
            : task
    );
    saveTasks();
}

// Delete a task
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
}

// Remove completed tasks
$("clearCompleted").addEventListener("click", function () {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
});

// Search and filters
$("searchInput").addEventListener("input", renderTasks);
$("filter").addEventListener("change", renderTasks);

function renderTasks() {
    const list = $("taskList");
    list.replaceChildren();

    const query = $("searchInput").value.toLowerCase().trim();
    const filter = $("filter").value;
    const today = localDate(new Date());

    const filtered = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(query);
        let matchesFilter = true;

        if (filter === "Pending") {
            matchesFilter = !task.completed;
        } else if (filter === "Completed") {
            matchesFilter = task.completed;
        } else if (filter === "High") {
            matchesFilter = task.priority === "High" && !task.completed;
        } else if (filter === "Today") {
            matchesFilter = task.dueDate === today && !task.completed;
        }

        return matchesSearch && matchesFilter;
    });

    filtered.forEach(task => {
        const card = document.createElement("article");
        card.className = "task-item" + (task.completed ? " done" : "");

        const check = document.createElement("button");
        check.className = "check-btn";
        check.textContent = task.completed ? "✓" : "";
        check.setAttribute("aria-label", "Toggle task completion");
        check.addEventListener("click", () => toggleTask(task.id));

        const content = document.createElement("div");
        content.className = "task-content";

        const name = document.createElement("p");
        name.className = "task-name";
        name.textContent = task.name;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priority = document.createElement("span");
        priority.className = "priority " + task.priority;
        priority.textContent = task.priority;
        meta.appendChild(priority);

        if (task.dueDate) {
            const date = document.createElement("span");
            date.textContent = "📅 " +
                new Date(task.dueDate + "T00:00:00")
                    .toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                    });

            if (task.dueDate < today && !task.completed) {
                date.className = "overdue";
                date.textContent = "⚠ Overdue · " + date.textContent;
            }

            meta.appendChild(date);
        }

        content.append(name, meta);

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete task");
        remove.addEventListener("click", () => deleteTask(task.id));

        card.append(check, content, remove);
        list.appendChild(card);
    });

    // Dashboard statistics
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.length - completed;
    const percentage = tasks.length
        ? Math.round(completed / tasks.length * 100)
        : 0;

    $("total").textContent = tasks.length;
    $("completed").textContent = completed;
    $("pending").textContent = pending;
    $("progressText").textContent = percentage + "%";
    $("progressBar").style.width = percentage + "%";

    if (!tasks.length) {
        $("motivation").textContent = "Every small step counts.";
    } else if (percentage === 100) {
        $("motivation").textContent = "Amazing! You did it! 🎉";
    } else if (percentage >= 50) {
        $("motivation").textContent = "You're making great progress! ✨";
    } else {
        $("motivation").textContent = "Start small. Build momentum.";
    }

    $("emptyState").style.display = filtered.length ? "none" : "block";

    if (tasks.length && !filtered.length) {
        $("emptyState").querySelector("h3").textContent = "No matching tasks";
        $("emptyState").querySelector("p").textContent =
            "Try another search or filter.";
    } else {
        $("emptyState").querySelector("h3").textContent = "A fresh start!";
        $("emptyState").querySelector("p").textContent =
            "Add your first task and make it happen.";
    }
}

// Dark mode
$("themeBtn").addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");
    this.textContent = dark ? "☀ Light" : "☾ Theme";

    try {
        localStorage.setItem("flowstateDark", String(dark));
    } catch (e) {}
});

try {
    if (localStorage.getItem("flowstateDark") === "true") {
        document.body.classList.add("dark");
        $("themeBtn").textContent = "☀ Light";
    }
} catch (e) {}


/* FOCUS MODE: POMODORO TIMER */

let mode = "focus";
let duration = 25 * 60;
let timeLeft = duration;
let running = false;
let deadline = 0;
let timerInterval = null;

function displayTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    $("timer").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    const progress = (duration - timeLeft) / duration;
    const degrees = Math.max(0, Math.min(360, progress * 360));

    $("timerCircle").style.background =
        `conic-gradient(var(--accent) ${degrees}deg, var(--soft) ${degrees}deg)`;

    document.title = running
        ? $("timer").textContent + " | FlowState"
        : "FlowState - Task Manager";
}

function updateTimer() {
    timeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    displayTimer();

    if (timeLeft === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        running = false;

        $("focusTip").textContent = mode === "focus"
            ? "🎉 Focus session complete! Time for a break."
            : "✨ Break complete! You're ready to focus again.";

        // Prepare the next session
        setMode(mode === "focus" ? "break" : "focus");

        $("timerStatus").textContent = "SESSION COMPLETE!";
        $("focusTip").textContent = mode === "break"
            ? "🎉 Great work! Your 5-minute break is ready."
            : "✨ Break finished! Your next focus session is ready.";

        $("startTimer").textContent =
            "▶ Start " + (mode === "focus" ? "focus" : "break");
    }
}

function startTimer() {
    if (running) {
        // Pause
        clearInterval(timerInterval);
        timerInterval = null;
        running = false;

        $("startTimer").textContent = "▶ Resume";
        $("timerStatus").textContent = "PAUSED";
        document.title = "FlowState - Task Manager";
        return;
    }

    if (timeLeft <= 0) timeLeft = duration;

    running = true;
    deadline = Date.now() + timeLeft * 1000;

    $("startTimer").textContent = "Ⅱ Pause";
    $("timerStatus").textContent = mode === "focus"
        ? "DEEP WORK IN PROGRESS"
        : "TAKE A BREATHER";

    timerInterval = setInterval(updateTimer, 250);
    updateTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    running = false;
    timeLeft = duration;

    $("startTimer").textContent =
        "▶ Start " + (mode === "focus" ? "focus" : "break");

    $("timerStatus").textContent =
        mode === "focus" ? "READY TO FOCUS" : "READY TO RELAX";

    $("focusTip").textContent = mode === "focus"
        ? "💡 Put distractions away and give yourself 25 minutes."
        : "☕ Stretch, hydrate, and give your mind a rest.";

    displayTimer();
}

function setMode(newMode) {
    clearInterval(timerInterval);
    timerInterval = null;
    running = false;
    mode = newMode;

    duration = mode === "focus" ? 25 * 60 : 5 * 60;
    timeLeft = duration;

    $("focusMode").classList.toggle("active", mode === "focus");
    $("breakMode").classList.toggle("active", mode === "break");

    $("startTimer").textContent =
        "▶ Start " + (mode === "focus" ? "focus" : "break");

    $("timerStatus").textContent =
        mode === "focus" ? "READY TO FOCUS" : "READY TO RELAX";

    $("focusTip").textContent = mode === "focus"
        ? "💡 Put distractions away and give yourself 25 minutes."
        : "☕ Stretch, hydrate, and give your mind a rest.";

    displayTimer();
}

$("startTimer").addEventListener("click", startTimer);
$("resetTimer").addEventListener("click", resetTimer);
$("focusMode").addEventListener("click", () => setMode("focus"));
$("breakMode").addEventListener("click", () => setMode("break"));

// Initial display
renderTasks();
displayTimer();
