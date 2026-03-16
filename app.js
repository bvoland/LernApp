const PARENT_PIN = "0922";
const DEFAULT_REWARD_TARGET = 95;
const APP_VERSION = "v2026.03.16-3";
const STORAGE_KEY = "mathe-mission-state";
const HISTORY_STORAGE_KEY = "mathe-mission-history";
const REDEMPTION_STORAGE_KEY = "mathe-mission-redemptions";
const PROFILES_STORAGE_KEY = "mathe-mission-profiles";
const DEFAULT_PROFILES = [
  { name: "Lukas", currentGrade: 3, minGrade: 3, maxGrade: 3, grade1Range: 10, grade1Operation: "mixed" },
  { name: "Amelie", currentGrade: 1, minGrade: 1, maxGrade: 3, grade1Range: 10, grade1Operation: "mixed" },
  { name: "Kathi", currentGrade: 3, minGrade: 3, maxGrade: 3, grade1Range: 10, grade1Operation: "mixed" },
  { name: "Benny", currentGrade: 3, minGrade: 3, maxGrade: 3, grade1Range: 10, grade1Operation: "mixed" }
];

const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const nextRoundBtn = document.getElementById("next-round-btn");
const unlockBtn = document.getElementById("unlock-btn");
const redeemBtn = document.getElementById("redeem-btn");
const addChildBtn = document.getElementById("add-child-btn");
const parentPinInput = document.getElementById("parent-pin");
const pinFeedback = document.getElementById("pin-feedback");
const settingsState = document.getElementById("settings-state");
const settingsFields = document.getElementById("settings-fields");
const childNameInput = document.getElementById("child-name");
const childSelect = document.getElementById("child-select");
const childGradeSelect = document.getElementById("child-grade");
const grade1Settings = document.getElementById("grade1-settings");
const grade1RangeSelect = document.getElementById("grade1-range");
const grade1OperationSelect = document.getElementById("grade1-operation");
const questionCountInput = document.getElementById("question-count");
const targetPercentInput = document.getElementById("target-percent");
const quizForm = document.getElementById("quiz-form");
const roundLabel = document.getElementById("round-label");
const correctCount = document.getElementById("correct-count");
const scoreRate = document.getElementById("score-rate");
const targetRate = document.getElementById("target-rate");
const statusBanner = document.getElementById("status-banner");
const rewardText = document.getElementById("reward-text");
const timerPill = document.getElementById("timer-pill");
const overlayMessage = document.getElementById("overlay-message");
const historyList = document.getElementById("history-list");
const storageState = document.getElementById("storage-state");
const availableMinutes = document.getElementById("available-minutes");
const earnedToday = document.getElementById("earned-today");
const earnedTotal = document.getElementById("earned-total");
const potentialMinutes = document.getElementById("potential-minutes");
const statsDayTotal = document.getElementById("stats-day-total");
const statsDayCorrect = document.getElementById("stats-day-correct");
const statsDayError = document.getElementById("stats-day-error");
const statsMonthTotal = document.getElementById("stats-month-total");
const statsMonthCorrect = document.getElementById("stats-month-correct");
const statsMonthError = document.getElementById("stats-month-error");
const statsAllTotal = document.getElementById("stats-all-total");
const statsAllCorrect = document.getElementById("stats-all-correct");
const statsAllError = document.getElementById("stats-all-error");
const gradeBadge = document.getElementById("grade-badge");
const statsCopy = document.getElementById("stats-copy");
const childrenOverview = document.getElementById("children-overview");
const appVersionText = document.getElementById("app-version");
const refreshAppBtn = document.getElementById("refresh-app-btn");
const dataSourceText = document.getElementById("data-source");

const state = {
  round: 1,
  questionsPerRound: 20,
  rewardTarget: DEFAULT_REWARD_TARGET,
  selectedChild: "Lukas",
  profiles: [],
  questions: [],
  isRoundActive: false,
  settingsUnlocked: false,
  history: [],
  redemptions: [],
  api: null,
  storageMode: "local"
};

function getProfile(name) {
  return state.profiles.find((profile) => profile.name === name) || {
    name,
    currentGrade: 3,
    minGrade: 3,
    maxGrade: 3,
    grade1Range: 10,
    grade1Operation: "mixed"
  };
}

function currentGrade() {
  return Number(getProfile(state.selectedChild).currentGrade || 3);
}

function readStorageArray(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn(`Lokaler Speicher fuer ${key} konnte nicht geladen werden.`, error);
    return [];
  }
}

function writeStorageArray(key, entries, limit = 200) {
  localStorage.setItem(key, JSON.stringify(entries.slice(0, limit)));
}

function loadProfiles() {
  const saved = readStorageArray(PROFILES_STORAGE_KEY);
  const profileMap = new Map(
    DEFAULT_PROFILES.map((profile) => [profile.name, { ...profile }])
  );

  saved.forEach((profile) => {
    profileMap.set(profile.name, {
      name: profile.name,
      currentGrade: Number(profile.currentGrade || profile.grade) || 3,
      minGrade: Number(profile.minGrade) || 1,
      maxGrade: Number(profile.maxGrade) || 3,
      grade1Range: Number(profile.grade1Range) || 10,
      grade1Operation: profile.grade1Operation || "mixed"
    });
  });

  state.profiles = Array.from(profileMap.values());
  writeStorageArray(PROFILES_STORAGE_KEY, state.profiles, 50);
}

function saveProfiles() {
  writeStorageArray(PROFILES_STORAGE_KEY, state.profiles, 50);
}

function renderChildOptions() {
  childSelect.innerHTML = "";
  state.profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = `${profile.name} (${profile.currentGrade}. Klasse)`;
    childSelect.append(option);
  });
  childSelect.value = state.selectedChild;
  renderGradeOptions();
  renderGrade1Settings();
  gradeBadge.textContent = `${currentGrade()}. Klasse`;
  statsCopy.textContent = `Lernfortschritt von ${state.selectedChild} fuer heute, diesen Monat und insgesamt.`;
}

function renderGradeOptions() {
  const profile = getProfile(state.selectedChild);
  childGradeSelect.innerHTML = "";
  for (let grade = profile.minGrade; grade <= profile.maxGrade; grade += 1) {
    const option = document.createElement("option");
    option.value = String(grade);
    option.textContent = `${grade}. Klasse`;
    childGradeSelect.append(option);
  }
  childGradeSelect.value = String(profile.currentGrade);
}

function renderGrade1Settings() {
  const profile = getProfile(state.selectedChild);
  const isGrade1 = Number(profile.currentGrade) === 1;
  grade1Settings.hidden = !isGrade1;
  grade1RangeSelect.value = String(profile.grade1Range || 10);
  grade1OperationSelect.value = profile.grade1Operation || "mixed";
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    questionCountInput.value = saved.questionsPerRound || 20;
    targetPercentInput.value = saved.rewardTarget || DEFAULT_REWARD_TARGET;
    state.questionsPerRound = Number(saved.questionsPerRound) || 20;
    state.rewardTarget = Number(saved.rewardTarget) || DEFAULT_REWARD_TARGET;
    state.round = saved.round || 1;
    state.selectedChild = saved.selectedChild || DEFAULT_PROFILES[0].name;
  } catch (error) {
    console.warn("Konnte gespeicherte Einstellungen nicht laden.", error);
  }

  roundLabel.textContent = String(state.round);
  targetRate.textContent = `${state.rewardTarget}%`;
}

function saveSettings() {
  state.questionsPerRound = Math.min(40, Math.max(5, Number(questionCountInput.value) || 20));
  state.rewardTarget = Math.min(100, Math.max(50, Number(targetPercentInput.value) || DEFAULT_REWARD_TARGET));
  questionCountInput.value = String(state.questionsPerRound);
  targetPercentInput.value = String(state.rewardTarget);
  targetRate.textContent = `${state.rewardTarget}%`;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      questionsPerRound: state.questionsPerRound,
      rewardTarget: state.rewardTarget,
      round: state.round,
      selectedChild: state.selectedChild
    })
  );
}

function setStorageMode(mode) {
  state.storageMode = mode;
  if (mode === "cloud") {
    storageState.textContent = "Supabase aktiv";
    storageState.classList.add("unlocked");
    if (dataSourceText) {
      dataSourceText.textContent = "Datenquelle: Supabase, sichtbar auf allen Geraeten";
    }
    return;
  }
  storageState.textContent = "Nur lokal";
  storageState.classList.remove("unlocked");
  if (dataSourceText) {
    dataSourceText.textContent = "Datenquelle: nur dieses Geraet";
  }
}

function formatHistoryDate(isoString) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(isoString));
}

function formatMinutes(minutes) {
  return `${Number(minutes).toFixed(1).replace(".", ",")} Min`;
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function calculateEarnedMinutes(questionCount) {
  return Math.round((questionCount / 10) * 10) / 10;
}

function updatePotentialMinutes() {
  const questionCount = Math.min(40, Math.max(5, Number(questionCountInput.value) || state.questionsPerRound || 20));
  potentialMinutes.textContent = formatMinutes(calculateEarnedMinutes(questionCount));
  timerPill.textContent = formatMinutes(getAvailableMinutes());
}

function localDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function childHistory() {
  return state.history.filter((entry) => (entry.child_name || DEFAULT_PROFILES[0].name) === state.selectedChild);
}

function childRedemptions() {
  return state.redemptions.filter((entry) => (entry.child_name || DEFAULT_PROFILES[0].name) === state.selectedChild);
}

function availableMinutesForChild(childName) {
  const earned = state.history
    .filter((entry) => (entry.child_name || DEFAULT_PROFILES[0].name) === childName)
    .reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);
  const redeemed = state.redemptions
    .filter((entry) => (entry.child_name || DEFAULT_PROFILES[0].name) === childName)
    .reduce((sum, entry) => sum + Number(entry.minutes_redeemed || 0), 0);
  return Math.max(0, earned - redeemed);
}

function getAvailableMinutes() {
  const earned = childHistory().reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);
  const redeemed = childRedemptions().reduce((sum, entry) => sum + Number(entry.minutes_redeemed || 0), 0);
  return Math.max(0, earned - redeemed);
}

function buildStats(entries) {
  const totalQuestions = entries.reduce((sum, entry) => sum + Number(entry.questions_total || 0), 0);
  const totalCorrect = entries.reduce((sum, entry) => sum + Number(entry.correct_total || 0), 0);
  const errorPercent = totalQuestions ? ((totalQuestions - totalCorrect) / totalQuestions) * 100 : 0;
  return { totalQuestions, totalCorrect, errorPercent };
}

function updateAnalytics() {
  const today = localDateKey(Date.now());
  const month = monthKey(Date.now());
  const entries = childHistory();
  const dayStats = buildStats(entries.filter((entry) => localDateKey(entry.created_at) === today));
  const monthStats = buildStats(entries.filter((entry) => monthKey(entry.created_at) === month));
  const allStats = buildStats(entries);

  statsDayTotal.textContent = String(dayStats.totalQuestions);
  statsDayCorrect.textContent = String(dayStats.totalCorrect);
  statsDayError.textContent = formatPercent(dayStats.errorPercent);
  statsMonthTotal.textContent = String(monthStats.totalQuestions);
  statsMonthCorrect.textContent = String(monthStats.totalCorrect);
  statsMonthError.textContent = formatPercent(monthStats.errorPercent);
  statsAllTotal.textContent = String(allStats.totalQuestions);
  statsAllCorrect.textContent = String(allStats.totalCorrect);
  statsAllError.textContent = formatPercent(allStats.errorPercent);
}

function updateMinuteSummary() {
  const todayKey = localDateKey(Date.now());
  const entries = childHistory();
  const todayMinutes = entries
    .filter((entry) => localDateKey(entry.created_at) === todayKey)
    .reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);
  const totalMinutes = entries.reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);
  const available = getAvailableMinutes();

  availableMinutes.textContent = formatMinutes(available);
  earnedToday.textContent = formatMinutes(todayMinutes);
  earnedTotal.textContent = formatMinutes(totalMinutes);
  timerPill.textContent = formatMinutes(available);
}

function renderChildrenOverview() {
  if (!childrenOverview) return;
  childrenOverview.innerHTML = "";

  state.profiles.forEach((profile) => {
    const item = document.createElement("article");
    item.className = "analytics-card";
    item.innerHTML = `
      <h3>${profile.name}</h3>
      <p>Klasse: <strong>${profile.currentGrade}. Klasse</strong></p>
      <p>Verfuegbar: <strong>${formatMinutes(availableMinutesForChild(profile.name))}</strong></p>
    `;
    childrenOverview.append(item);
  });
}

function renderHistory() {
  historyList.innerHTML = "";
  const combined = [
    ...childHistory().map((entry) => ({ type: "round", ...entry })),
    ...childRedemptions().map((entry) => ({ type: "redeem", ...entry }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!combined.length) {
    historyList.innerHTML = `<p class="empty-history">Noch keine gespeicherten Runden fuer ${state.selectedChild}.</p>`;
    updateMinuteSummary();
    updateAnalytics();
    renderChildrenOverview();
    return;
  }

  combined.slice(0, 12).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";

    if (entry.type === "redeem") {
      item.innerHTML = `
        <div class="history-main">
          <strong>${entry.child_name} - Minuten eingeloest</strong>
          <span>${formatMinutes(Number(entry.minutes_redeemed || 0))}</span>
        </div>
        <div class="history-meta">
          <span>Elternfreigabe</span>
          <span>${formatHistoryDate(entry.created_at)}</span>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="history-main">
          <strong>${entry.child_name} - Runde ${entry.round_number}</strong>
          <span>${entry.correct_total}/${entry.questions_total} richtig (${entry.score_percent}%)</span>
        </div>
        <div class="history-meta">
          <span>${entry.reward_unlocked ? "Minuten gutgeschrieben" : "Keine Minuten"}</span>
          <span>${formatMinutes(Number(entry.earned_minutes || 0))}</span>
          <span>${formatHistoryDate(entry.created_at)}</span>
        </div>
      `;
    }

    historyList.append(item);
  });

  updateMinuteSummary();
  updateAnalytics();
  renderChildrenOverview();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildQuestionForGrade(grade, usedKeys) {
  let attempts = 0;
  while (attempts < 200) {
    let question;

    if (grade === 1) {
      const profile = getProfile(state.selectedChild);
      const limit = Number(profile.grade1Range) || 10;
      const mode = profile.grade1Operation || "mixed";
      const operation = mode === "add" ? "+" : mode === "sub" ? "-" : Math.random() < 0.5 ? "+" : "-";

      if (operation === "+") {
        const left = randomInt(0, limit);
        const right = randomInt(0, limit - left);
        question = { left, right, operation: "+", answer: left + right };
      } else {
        const left = randomInt(0, limit);
        const right = randomInt(0, left);
        question = { left, right, operation: "-", answer: left - right };
      }
    } else if (grade === 2) {
      const ops = ["+", "-", "*", "/"];
      const operation = ops[randomInt(0, ops.length - 1)];
      if (operation === "+") {
        const left = randomInt(0, 80);
        const right = randomInt(0, 100 - left);
        question = { left, right, operation, answer: left + right };
      } else if (operation === "-") {
        const left = randomInt(0, 100);
        const right = randomInt(0, left);
        question = { left, right, operation, answer: left - right };
      } else if (operation === "*") {
        const left = randomInt(1, 10);
        const right = randomInt(1, 10);
        question = { left, right, operation, answer: left * right };
      } else {
        const right = randomInt(1, 10);
        const answer = randomInt(1, 10);
        question = { left: right * answer, right, operation, answer };
      }
    } else {
      const rangeKeyRoll = Math.random();
      const rangeKey = rangeKeyRoll < 0.4 ? "small" : rangeKeyRoll < 0.8 ? "medium" : "large";
      const operationRoll = Math.random();
      const operation =
        operationRoll < 0.2 ? "+" :
        operationRoll < 0.4 ? "-" :
        operationRoll < 0.7 ? "*" :
        "/";
      if (operation === "+") question = buildAdditionQuestion(rangeKey);
      else if (operation === "-") question = buildSubtractionQuestion(rangeKey);
      else if (operation === "*") question = buildMultiplicationQuestion(rangeKey);
      else question = buildDivisionQuestion(rangeKey);
    }

    const key = `${question.operation}:${question.left}:${question.right}`;
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return question;
    }
    attempts += 1;
  }
  throw new Error("Konnte keine eindeutige Aufgabe fuer diese Runde erzeugen.");
}

const NUMBER_RANGES = {
  small: { min: 0, max: 20 },
  medium: { min: 21, max: 100 },
  large: { min: 101, max: 1000 }
};

function randomFromRange(rangeKey, maxCap = Number.MAX_SAFE_INTEGER) {
  const range = NUMBER_RANGES[rangeKey];
  const max = Math.min(range.max, maxCap);
  const min = Math.min(range.min, max);
  return randomInt(min, max);
}

function buildAdditionQuestion(rangeKey) {
  const left = randomFromRange(rangeKey, 950);
  const remaining = 1000 - left;
  const rightRange = remaining < 20 ? "small" : Math.random() < 0.5 ? rangeKey : ["small", "medium", "large"][randomInt(0, 2)];
  const right = randomFromRange(rightRange, remaining);
  return { left, right, operation: "+", answer: left + right };
}

function buildSubtractionQuestion(rangeKey) {
  const left = randomFromRange(rangeKey);
  const right = randomFromRange(Math.random() < 0.65 ? rangeKey : ["small", "medium", "large"][randomInt(0, 2)], left);
  return { left, right, operation: "-", answer: left - right };
}

function buildMultiplicationQuestion(rangeKey) {
  const map = {
    small: { leftMin: 1, leftMax: 10, rightMin: 1, rightMax: 10 },
    medium: { leftMin: 2, leftMax: 12, rightMin: 2, rightMax: 12 },
    large: { leftMin: 5, leftMax: 20, rightMin: 2, rightMax: 12 }
  };
  const range = map[rangeKey];
  const left = randomInt(range.leftMin, range.leftMax);
  const maxRight = Math.min(range.rightMax, Math.floor(1000 / left));
  const right = randomInt(range.rightMin, Math.max(range.rightMin, maxRight));
  return { left, right, operation: "*", answer: left * right };
}

function buildDivisionQuestion(rangeKey) {
  const map = {
    small: { divisorMin: 1, divisorMax: 10, resultMin: 1, resultMax: 10 },
    medium: { divisorMin: 2, divisorMax: 12, resultMin: 2, resultMax: 12 },
    large: { divisorMin: 2, divisorMax: 12, resultMin: 5, resultMax: 20 }
  };
  const range = map[rangeKey];
  const right = randomInt(range.divisorMin, range.divisorMax);
  const maxResult = Math.min(range.resultMax, Math.floor(1000 / right));
  const answer = randomInt(range.resultMin, Math.max(range.resultMin, maxResult));
  return { left: right * answer, right, operation: "/", answer };
}

function getOperationSymbol(operation) {
  if (operation === "*") return "x";
  if (operation === "/") return ":";
  return operation;
}

function getGreeting() {
  return `${state.selectedChild},`;
}

function renderQuestions() {
  quizForm.innerHTML = "";
  state.questions.forEach((question) => {
    const card = document.createElement("label");
    card.className = "question-card";
    card.dataset.id = String(question.id);
    const top = document.createElement("div");
    top.className = "question-top";
    const title = document.createElement("span");
    title.className = "question-label";
    title.textContent = `${question.id}. ${question.left} ${getOperationSymbol(question.operation)} ${question.right} =`;
    const feedback = document.createElement("span");
    feedback.className = "question-feedback";
    feedback.textContent = "Noch offen";
    const input = document.createElement("input");
    input.type = "number";
    input.className = "question-input";
    input.inputMode = "numeric";
    input.placeholder = "Antwort";
    input.dataset.id = String(question.id);
    input.addEventListener("input", handleAnswerInput);
    top.append(title, feedback);
    card.append(top, input);
    quizForm.append(card);
  });
}

function handleAnswerInput(event) {
  const id = Number(event.target.dataset.id);
  const question = state.questions.find((item) => item.id === id);
  if (question) question.userAnswer = event.target.value;
}

function createRound() {
  saveSettings();
  const usedKeys = new Set();
  const grade = currentGrade();

  try {
    state.questions = Array.from({ length: state.questionsPerRound }, (_, index) => ({
      id: index + 1,
      ...buildQuestionForGrade(grade, usedKeys),
      userAnswer: "",
      isCorrect: null
    }));
  } catch (error) {
    console.warn("Runde konnte nicht erzeugt werden.", error);
    updateStatus("Diese Runde konnte gerade nicht vorbereitet werden. Bitte noch einmal auf 'Neue Runde starten' tippen.");
    return;
  }

  state.isRoundActive = true;
  renderQuestions();
  correctCount.textContent = "0";
  scoreRate.textContent = "0%";
  submitBtn.disabled = false;
  nextRoundBtn.hidden = true;
  speakRoundIntro();
  updateStatus(`${getGreeting()} loese jetzt ${state.questionsPerRound} Aufgaben fuer die ${grade}. Klasse. Bei mindestens ${state.rewardTarget}% bekommst du ${formatMinutes(calculateEarnedMinutes(state.questionsPerRound))} gutgeschrieben.`);
}

function updateQuestionFeedback() {
  state.questions.forEach((question) => {
    const card = quizForm.querySelector(`[data-id="${question.id}"]`);
    if (!card) return;
    const feedback = card.querySelector(".question-feedback");
    card.classList.remove("correct", "wrong");
    if (question.isCorrect) {
      card.classList.add("correct");
      feedback.textContent = "Richtig";
    } else {
      card.classList.add("wrong");
      feedback.textContent = `Richtige Antwort: ${question.answer}`;
    }
  });
}

function currentRoundPayload(correct, percent, earnedMinutes) {
  return {
    child_name: state.selectedChild,
    grade_level: currentGrade(),
    round_number: state.round,
    questions_total: state.questions.length,
    correct_total: correct,
    score_percent: percent,
    reward_unlocked: earnedMinutes > 0,
    reward_target: state.rewardTarget,
    earned_minutes: earnedMinutes,
    question_set: state.questions.map((question) => ({
      left: question.left,
      right: question.right,
      operation: question.operation,
      answer: question.answer,
      userAnswer: question.userAnswer,
      isCorrect: question.isCorrect
    })),
    created_at: new Date().toISOString()
  };
}

async function saveRoundResult(entry) {
  state.history = [entry, ...state.history].slice(0, 200);
  writeStorageArray(HISTORY_STORAGE_KEY, state.history, 200);
  renderHistory();
  if (!state.api || state.storageMode !== "cloud") return;
  try {
    await state.api.createLearningRound(entry);
    const data = await state.api.listAll();
    state.history = data.rounds;
    state.redemptions = data.redemptions;
    writeStorageArray(HISTORY_STORAGE_KEY, state.history, 200);
    writeStorageArray(REDEMPTION_STORAGE_KEY, state.redemptions, 200);
    renderHistory();
    setStorageMode("cloud");
  } catch (error) {
    console.warn("Supabase-Speicherung fehlgeschlagen.", error);
    setStorageMode("local");
  }
}

async function saveRedemption(entry) {
  state.redemptions = [entry, ...state.redemptions].slice(0, 200);
  writeStorageArray(REDEMPTION_STORAGE_KEY, state.redemptions, 200);
  renderHistory();
  if (!state.api || state.storageMode !== "cloud") return;
  try {
    await state.api.createRedemption(entry);
    const data = await state.api.listAll();
    state.history = data.rounds;
    state.redemptions = data.redemptions;
    writeStorageArray(HISTORY_STORAGE_KEY, state.history, 200);
    writeStorageArray(REDEMPTION_STORAGE_KEY, state.redemptions, 200);
    renderHistory();
    setStorageMode("cloud");
  } catch (error) {
    console.warn("Supabase-Speicherung der Einloesung fehlgeschlagen.", error);
    setStorageMode("local");
  }
}

function evaluateRound() {
  if (!state.isRoundActive) return;
  let correct = 0;
  state.questions.forEach((question) => {
    const numericAnswer = Number(question.userAnswer);
    question.isCorrect = question.userAnswer !== "" && numericAnswer === question.answer;
    if (question.isCorrect) correct += 1;
  });

  const percent = Math.round((correct / state.questions.length) * 100);
  const earnedMinutes = percent >= state.rewardTarget ? calculateEarnedMinutes(state.questions.length) : 0;
  void saveRoundResult(currentRoundPayload(correct, percent, earnedMinutes));

  correctCount.textContent = String(correct);
  scoreRate.textContent = `${percent}%`;
  state.isRoundActive = false;
  updateQuestionFeedback();
  submitBtn.disabled = true;
  nextRoundBtn.hidden = false;

  if (earnedMinutes > 0) {
    rewardText.textContent = `${state.selectedChild} hat gerade ${formatMinutes(earnedMinutes)} gutgeschrieben bekommen.`;
    overlayMessage.textContent = "Die Minuten bleiben angespart, bis ihr sie mit Elternfreigabe einloest.";
    updateStatus(`Geschafft. ${correct} von ${state.questions.length} richtig. ${formatMinutes(earnedMinutes)} wurden ${state.selectedChild} gutgeschrieben.`);
  } else {
    rewardText.textContent = "Diese Runde war noch unter der Zielquote.";
    overlayMessage.textContent = `Es wurden keine Minuten gutgeschrieben. Noch einmal versuchen und mindestens ${state.rewardTarget}% erreichen.`;
    updateStatus(`Diese Runde reicht noch nicht. ${correct} von ${state.questions.length} richtig. Ab ${state.rewardTarget}% gibt es Minuten.`);
  }

  state.round += 1;
  roundLabel.textContent = String(state.round);
  saveSettings();
}

function unlockSettings() {
  if (parentPinInput.value.trim() !== PARENT_PIN) {
    pinFeedback.textContent = "PIN falsch. Einstellungen bleiben gesperrt.";
    parentPinInput.value = "";
    setSettingsLock(false);
    return;
  }
  parentPinInput.value = "";
  pinFeedback.textContent = "Einstellungen sind entsperrt.";
  setSettingsLock(true);
}

function setSettingsLock(isUnlocked) {
  state.settingsUnlocked = isUnlocked;
  settingsFields.disabled = !isUnlocked;
  settingsState.textContent = isUnlocked ? "Entsperrt" : "Gesperrt";
  settingsState.classList.toggle("unlocked", isUnlocked);
  unlockBtn.textContent = isUnlocked ? "Sperren" : "Freischalten";
}

function toggleSettingsLock() {
  if (state.settingsUnlocked) {
    pinFeedback.textContent = "Einstellungen wieder gesperrt.";
    setSettingsLock(false);
    return;
  }
  unlockSettings();
}

function speakRoundIntro() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("Let's get ready to rumble!");
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

async function redeemMinutes() {
  const available = getAvailableMinutes();
  if (available <= 0) {
    updateStatus(`Fuer ${state.selectedChild} sind aktuell keine Minuten zum Einloesen vorhanden.`);
    return;
  }
  const enteredPin = window.prompt(`Eltern-PIN zum Einloesen fuer ${state.selectedChild} eingeben:`);
  if (enteredPin !== PARENT_PIN) {
    updateStatus("Einloesen abgebrochen: Eltern-PIN war nicht korrekt.");
    return;
  }
  const entry = {
    child_name: state.selectedChild,
    minutes_redeemed: available,
    created_at: new Date().toISOString()
  };
  await saveRedemption(entry);
  rewardText.textContent = `${formatMinutes(available)} wurden fuer ${state.selectedChild} eingeloest.`;
  overlayMessage.textContent = "Die Lernstatistik bleibt erhalten. Nur das verfuegbare Minutenkonto dieses Kindes wurde zurueckgesetzt.";
  updateStatus(`Einloesung bestaetigt. ${formatMinutes(available)} wurden vom verfuegbaren Minutenkonto von ${state.selectedChild} abgezogen.`);
}

function selectChild(name) {
  state.selectedChild = name;
  renderChildOptions();
  renderHistory();
  updatePotentialMinutes();
  saveSettings();
}

function addChild() {
  const name = childNameInput.value.trim();
  if (!name) return;
  if (!state.profiles.some((profile) => profile.name === name)) {
    state.profiles.push({ name, currentGrade: 1, minGrade: 1, maxGrade: 3, grade1Range: 10, grade1Operation: "mixed" });
    saveProfiles();
  }
  childNameInput.value = "";
  selectChild(name);
}

function updateChildGrade() {
  const profile = getProfile(state.selectedChild);
  const nextGrade = Number(childGradeSelect.value) || profile.currentGrade || 3;
  profile.currentGrade = Math.min(profile.maxGrade, Math.max(profile.minGrade, nextGrade));
  saveProfiles();
  renderChildOptions();
  updateStatus(`${state.selectedChild} ist jetzt fuer Aufgaben der ${profile.currentGrade}. Klasse freigegeben.`);
}

function updateGrade1Settings() {
  const profile = getProfile(state.selectedChild);
  profile.grade1Range = Number(grade1RangeSelect.value) || 10;
  profile.grade1Operation = grade1OperationSelect.value || "mixed";
  saveProfiles();
  renderGrade1Settings();
  updateStatus(`Die 1.-Klasse-Uebung fuer ${state.selectedChild} wurde angepasst.`);
}

function createLocalApi() {
  return {
    async listAll() {
      return {
        rounds: readStorageArray(HISTORY_STORAGE_KEY),
        redemptions: readStorageArray(REDEMPTION_STORAGE_KEY)
      };
    },
    async createLearningRound(entry) {
      writeStorageArray(HISTORY_STORAGE_KEY, [entry, ...readStorageArray(HISTORY_STORAGE_KEY)], 200);
    },
    async createRedemption(entry) {
      writeStorageArray(REDEMPTION_STORAGE_KEY, [entry, ...readStorageArray(REDEMPTION_STORAGE_KEY)], 200);
    }
  };
}

function createSupabaseApi(cfg) {
  const root = cfg.supabaseUrl.replace(/\/+$/, "");
  const roundsBase = `${root}/rest/v1/learning_rounds`;
  const redemptionsBase = `${root}/rest/v1/learning_minute_redemptions`;

  async function request(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options && options.headers ? options.headers : {})
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    async listAll() {
      const roundsQuery =
        "?select=id,created_at,child_name,grade_level,round_number,questions_total,correct_total,score_percent,reward_unlocked,reward_target,earned_minutes" +
        "&order=created_at.desc&limit=200";
      const redemptionsQuery =
        "?select=id,created_at,child_name,minutes_redeemed" +
        "&order=created_at.desc&limit=200";
      const [rounds, redemptions] = await Promise.all([
        request(roundsBase + roundsQuery, { method: "GET" }),
        request(redemptionsBase + redemptionsQuery, { method: "GET" })
      ]);
      return {
        rounds: Array.isArray(rounds) ? rounds : [],
        redemptions: Array.isArray(redemptions) ? redemptions : []
      };
    },
    async createLearningRound(entry) {
      await request(roundsBase, { method: "POST", body: JSON.stringify([entry]) });
    },
    async createRedemption(entry) {
      await request(redemptionsBase, { method: "POST", body: JSON.stringify([entry]) });
    }
  };
}

async function loadHistory() {
  state.history = readStorageArray(HISTORY_STORAGE_KEY);
  state.redemptions = readStorageArray(REDEMPTION_STORAGE_KEY);
  renderHistory();

  const cfg = window.APP_CONFIG || {};
  const hasSupabase = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  state.api = hasSupabase ? createSupabaseApi(cfg) : createLocalApi();
  if (!hasSupabase) {
    setStorageMode("local");
    return;
  }
  try {
    const data = await state.api.listAll();
    state.history = data.rounds;
    state.redemptions = data.redemptions;
    writeStorageArray(HISTORY_STORAGE_KEY, state.history, 200);
    writeStorageArray(REDEMPTION_STORAGE_KEY, state.redemptions, 200);
    renderHistory();
    setStorageMode("cloud");
  } catch (error) {
    console.warn("Supabase noch nicht verfuegbar, lokaler Speicher bleibt aktiv.", error);
    state.api = createLocalApi();
    setStorageMode("local");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service Worker konnte nicht registriert werden.", error);
    });
  });
}

function renderAppVersion() {
  if (!appVersionText) return;
  appVersionText.textContent = `Version: ${APP_VERSION}`;
  void loadVersionMetadata();
}

async function loadVersionMetadata() {
  if (!appVersionText) return;
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const extra = data.updatedAt ? ` | Stand: ${data.updatedAt}` : "";
    appVersionText.textContent = `Version: ${data.version || APP_VERSION}${extra}`;
  } catch (error) {
    console.warn("Version konnte nicht geladen werden.", error);
  }
}

async function clearAppCacheAndReload() {
  if (refreshAppBtn) {
    refreshAppBtn.disabled = true;
    refreshAppBtn.textContent = "Aktualisiere...";
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("Cache konnte nicht vollstaendig geleert werden.", error);
  }

  window.location.reload();
}

startBtn.addEventListener("click", createRound);
submitBtn.addEventListener("click", evaluateRound);
nextRoundBtn.addEventListener("click", createRound);
unlockBtn.addEventListener("click", toggleSettingsLock);
redeemBtn.addEventListener("click", () => { void redeemMinutes(); });
addChildBtn.addEventListener("click", addChild);
childSelect.addEventListener("change", (event) => selectChild(event.target.value));
childGradeSelect.addEventListener("change", updateChildGrade);
grade1RangeSelect.addEventListener("change", updateGrade1Settings);
grade1OperationSelect.addEventListener("change", updateGrade1Settings);
refreshAppBtn.addEventListener("click", () => {
  void clearAppCacheAndReload();
});
parentPinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    toggleSettingsLock();
  }
});

[questionCountInput, targetPercentInput].forEach((element) => {
  element.addEventListener("change", saveSettings);
  element.addEventListener("input", updatePotentialMinutes);
});

loadProfiles();
loadSettings();
if (!state.profiles.some((profile) => profile.name === state.selectedChild)) {
  state.selectedChild = state.profiles[0].name;
}
renderChildOptions();
setSettingsLock(false);
rewardText.textContent = "Ab der Zielquote werden Minuten gutgeschrieben. Je 10 Aufgaben gibt es 1 Minute.";
overlayMessage.textContent = "Neue Minuten werden nach jeder erfolgreichen Runde automatisch dem Tageskonto gutgeschrieben.";
updatePotentialMinutes();
void loadHistory();
renderAppVersion();
registerServiceWorker();
