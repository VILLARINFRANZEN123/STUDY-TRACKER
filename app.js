const app = document.getElementById("app");
const navButtons = document.querySelectorAll("nav button");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => renderView(btn.dataset.view));
});

function renderView(view) {
  app.innerHTML = ""; // clear
  if (view === "dashboard") renderDashboard();
  if (view === "subjects") renderSubjects();
  if (view === "timer") renderTimer();
  if (view === "resources") renderResources();
  if (view === "stats") renderStats();
  if (view === "goals") renderGoals();
}

/* Dashboard */
function renderDashboard() {
  app.innerHTML = `<h2>Dashboard</h2>`;
  if (subjects.length === 0) {
    app.innerHTML += `<p>No subjects yet.</p>`;
  } else {
    subjects.forEach(s => {
      app.innerHTML += `<div class="card">${s.name} - ${s.progress}% complete</div>`;
    });
  }
}

/* Subjects */
function renderSubjects() {
  app.innerHTML = `<h2>Subjects</h2>
    <div class="card">
      <label for="newSubject">Add a new subject:</label>
      <input type="text" id="newSubject" placeholder="e.g. Chemistry">
      <button onclick="addSubject()">Add Subject</button>
    </div>`;

  if (subjects.length === 0) {
    app.innerHTML += `<p>No subjects yet.</p>`;
  } else {
    subjects.forEach(s => {
      app.innerHTML += `<div class="card">${s.name} 
        <button onclick="deleteSubject(${s.id})">Delete</button></div>`;
    });
  }
}

function addSubject() {
  const input = document.getElementById("newSubject").value.trim();
  if (input) {
    const newId = subjects.length ? subjects[subjects.length - 1].id + 1 : 1;
    subjects.push({ id: newId, name: input, progress: 0 });
    localStorage.setItem("subjects", JSON.stringify(subjects));
    renderSubjects();
  } else {
    alert("Please enter a subject name.");
  }
}

function deleteSubject(id) {
  const index = subjects.findIndex(s => s.id === id);
  if (index > -1) {
    subjects.splice(index, 1);
    localStorage.setItem("subjects", JSON.stringify(subjects));
    renderSubjects();
  }
}

/* Timer */
function renderTimer() {
  app.innerHTML = `<h2>Study Timer</h2>
    <div id="timer">00:00</div>
    <button onclick="startTimer()">Start</button>
    <button onclick="stopTimer()">Stop</button>
    <button onclick="resetTimer()">Reset</button>`;
}

let timerInterval, seconds = 0;
function startTimer() {
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      seconds++;
      document.getElementById("timer").textContent = formatTime(seconds);
    }, 1000);
  }
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }
function resetTimer() { seconds = 0; document.getElementById("timer").textContent = "00:00"; }

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* Resources */
function renderResources() {
  app.innerHTML = `<h2>Resources</h2>`;
  if (resources.length === 0) {
    app.innerHTML += `<p>No resources yet.</p>`;
  } else {
    resources.forEach(r => {
      app.innerHTML += `<div class="card"><a href="${r.link}" target="_blank">${r.title}</a></div>`;
    });
  }
}

/* Stats */
function renderStats() {
  app.innerHTML = `<h2>Achievements</h2>`;
  if (achievements.length === 0) {
    app.innerHTML += `<p>No achievements yet.</p>`;
  } else {
    achievements.forEach(a => {
      app.innerHTML += `<div class="card">${a.title} - ${a.unlocked ? "✅" : "🔒"}</div>`;
    });
  }
}

/* Goals */
function renderGoals() {
  app.innerHTML = `<h2>Study Goals</h2>
    <div class="card">
      <label for="goalInput">Set your weekly goal (hours):</label>
      <input type="number" id="goalInput" placeholder="e.g. 12">
      <button onclick="saveGoal()">Save Goal</button>
    </div>
    <div id="goalDisplay" class="card"></div>
    <h2>Subject Goals</h2>
    <div id="subjectGoals"></div>`;
  
  displayGoal();
  renderSubjectGoals();
}

function saveGoal() {
  const goal = document.getElementById("goalInput").value;
  if (goal && goal > 0) {
    localStorage.setItem("studyGoal", goal);
    displayGoal();
  } else {
    alert("Please enter a valid number.");
  }
}

function displayGoal() {
  const goal = localStorage.getItem("studyGoal");
  const display = document.getElementById("goalDisplay");
  if (goal) {
    display.innerHTML = `🎯 Your weekly goal: <strong>${goal} hours</strong>`;
  } else {
    display.innerHTML = "No goal set yet.";
  }
}

/* Subject Goals */
function renderSubjectGoals() {
  const container = document.getElementById("subjectGoals");
  container.innerHTML = "";
  subjects.forEach(s => {
    const savedGoals = JSON.parse(localStorage.getItem("subjectGoals")) || {};
    const currentGoal = savedGoals[s.name] || "";
    container.innerHTML += `
      <div class="card">
        <label>Goal for ${s.name} (hours):</label>
        <input type="number" id="goal-${s.id}" value="${currentGoal}" placeholder="e.g. 5">
        <button onclick="saveSubjectGoal('${s.name}', ${s.id})">Save</button>
      </div>`;
  });
}

function saveSubjectGoal(subjectName, id) {
  const input = document.getElementById(`goal-${id}`).value;
  if (input && input > 0) {
    const savedGoals = JSON.parse(localStorage.getItem("subjectGoals")) || {};
    savedGoals[subjectName] = input;
    localStorage.setItem("subjectGoals", JSON.stringify(savedGoals));
    alert(`Goal for ${subjectName} saved: ${input} hours`);
  } else {
    alert("Please enter a valid number.");
  }
}

/* Load subjects from localStorage if available */
let storedSubjects = JSON.parse(localStorage.getItem("subjects"));
if (storedSubjects) {
  subjects.splice(0, subjects.length, ...storedSubjects);
}

/* Default view */
renderView("dashboard");
