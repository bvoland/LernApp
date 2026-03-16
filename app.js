const PARENT_PIN = "0922";
const DEFAULT_REWARD_TARGET = 95;
const STORAGE_KEY = "mathe-mission-state";
const HISTORY_STORAGE_KEY = "mathe-mission-history";
const OPERATIONS = ["+", "-", "*", "/"];

const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const nextRoundBtn = document.getElementById("next-round-btn");
const unlockBtn = document.getElementById("unlock-btn");
const parentPinInput = document.getElementById("parent-pin");
const pinFeedback = document.getElementById("pin-feedback");
const settingsState = document.getElementById("settings-state");
const settingsFields = document.getElementById("settings-fields");
const childNameInput = document.getElementById("child-name");
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
const earnedToday = document.getElementById("earned-today");
const earnedTotal = document.getElementById("earned-total");
const potentialMinutes = document.getElementById("potential-minutes");

const state = {
  round: 1,
  questionsPerRound: 20,
  rewardTarget: DEFAULT_REWARD_TARGET,
  questions: [],
  isRoundActive: false,
  settingsUnlocked: false,
  history: [],
  api: null,
  storageMode: "local"
};

const NUMBER_RANGES = {
  small: { min: 0, max: 20 },
  medium: { min: 21, max: 100 },
  large: { min: 101, max: 1000 }
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    childNameInput.value = saved.childName || "";
    questionCountInput.value = saved.questionsPerRound || 20;
    targetPercentInput.value = saved.rewardTarget || DEFAULT_REWARD_TARGET;
    state.questionsPerRound = Number(saved.questionsPerRound) || 20;
    state.rewardTarget = Number(saved.rewardTarget) || DEFAULT_REWARD_TARGET;
    state.round = saved.round || 1;
  } catch (error) {
    console.warn("Konnte gespeicherte Einstellungen nicht laden.", error);
  }

  roundLabel.textContent = String(state.round);
  targetRate.textContent = `${state.rewardTarget}%`;
  updatePotentialMinutes();
}

function saveSettings() {
  state.questionsPerRound = Math.min(40, Math.max(5, Number(questionCountInput.value) || 20));
  state.rewardTarget = Math.min(100, Math.max(50, Number(targetPercentInput.value) || DEFAULT_REWARD_TARGET));
  questionCountInput.value = String(state.questionsPerRound);
  targetPercentInput.value = String(state.rewardTarget);
  targetRate.textContent = `${state.rewardTarget}%`;
  updatePotentialMinutes();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      childName: childNameInput.value.trim(),
      questionsPerRound: state.questionsPerRound,
      rewardTarget: state.rewardTarget,
      round: state.round
    })
  );
}

function setStorageMode(mode) {
  state.storageMode = mode;
  if (mode === "cloud") {
    storageState.textContent = "Supabase aktiv";
    storageState.classList.add("unlocked");
    return;
  }

  storageState.textContent = "Nur lokal";
  storageState.classList.remove("unlocked");
}

function readLocalHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Lokale Historie konnte nicht geladen werden.", error);
    return [];
  }
}

function writeLocalHistory(entries) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRangeKey() {
  const roll = Math.random();
  if (roll < 0.4) return "small";
  if (roll < 0.8) return "medium";
  return "large";
}

function randomFromRange(rangeKey, maxCap = Number.MAX_SAFE_INTEGER) {
  const range = NUMBER_RANGES[rangeKey];
  const max = Math.min(range.max, maxCap);
  const min = Math.min(range.min, max);
  return randomInt(min, max);
}

function buildAdditionQuestion(rangeKey) {
  const left = randomFromRange(rangeKey, 950);
  const remaining = 1000 - left;
  const rightRange = remaining < 20 ? "small" : Math.random() < 0.5 ? rangeKey : pickRangeKey();
  const right = randomFromRange(rightRange, remaining);
  return { left, right, operation: "+", answer: left + right };
}

function buildSubtractionQuestion(rangeKey) {
  const left = randomFromRange(rangeKey);
  const rightRange = Math.random() < 0.65 ? rangeKey : pickRangeKey();
  const right = randomFromRange(rightRange, left);
  return { left, right, operation: "-", answer: left - right };
}

function buildMultiplicationQuestion(rangeKey) {
  const factorsByRange = {
    small: { leftMin: 1, leftMax: 10, rightMin: 1, rightMax: 10 },
    medium: { leftMin: 2, leftMax: 12, rightMin: 2, rightMax: 12 },
    large: { leftMin: 5, leftMax: 20, rightMin: 2, rightMax: 12 }
  };

  const range = factorsByRange[rangeKey];
  const left = randomInt(range.leftMin, range.leftMax);
  const maxRight = Math.min(range.rightMax, Math.floor(1000 / left));
  const right = randomInt(range.rightMin, Math.max(range.rightMin, maxRight));
  return { left, right, operation: "*", answer: left * right };
}

function buildDivisionQuestion(rangeKey) {
  const divisorsByRange = {
    small: { divisorMin: 1, divisorMax: 10, resultMin: 1, resultMax: 10 },
    medium: { divisorMin: 2, divisorMax: 12, resultMin: 2, resultMax: 12 },
    large: { divisorMin: 2, divisorMax: 12, resultMin: 5, resultMax: 20 }
  };

  const range = divisorsByRange[rangeKey];
  const right = randomInt(range.divisorMin, range.divisorMax);
  const maxResult = Math.min(range.resultMax, Math.floor(1000 / right));
  const result = randomInt(range.resultMin, Math.max(range.resultMin, maxResult));
  return { left: right * result, right, operation: "/", answer: result };
}

function questionKey(question) {
  return `${question.operation}:${question.left}:${question.right}`;
}

function buildQuestion(usedKeys) {
  let attempts = 0;

  while (attempts < 200) {
    const operation = OPERATIONS[randomInt(0, OPERATIONS.length - 1)];
    const rangeKey = pickRangeKey();
    let question;

    if (operation === "+") question = buildAdditionQuestion(rangeKey);
    else if (operation === "-") question = buildSubtractionQuestion(rangeKey);
    else if (operation === "*") question = buildMultiplicationQuestion(rangeKey);
    else question = buildDivisionQuestion(rangeKey);

    const key = questionKey(question);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return question;
    }

    attempts += 1;
  }

  throw new Error("Konnte keine eindeutige Aufgabe fuer diese Runde erzeugen.");
}

function getOperationSymbol(operation) {
  if (operation === "*") return "x";
  if (operation === "/") return ":";
  return operation;
}

function getGreeting() {
  const name = childNameInput.value.trim();
  return name ? `${name},` : "Los geht's,";
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
  if (question) {
    question.userAnswer = event.target.value;
  }
}

function updateStatus(message) {
  statusBanner.textContent = message;
}

function formatHistoryDate(isoString) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(isoString));
}

function formatMinutes(minutes) {
  return `${minutes.toFixed(1).replace(".", ",")} Min`;
}

function calculateEarnedMinutes(questionCount) {
  return Math.round((questionCount / 10) * 10) / 10;
}

function updatePotentialMinutes() {
  const questionCount = Math.min(40, Math.max(5, Number(questionCountInput.value) || state.questionsPerRound || 20));
  potentialMinutes.textContent = formatMinutes(calculateEarnedMinutes(questionCount));
  timerPill.textContent = potentialMinutes.textContent;
}

function localDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateMinuteSummary() {
  const todayKey = localDateKey(Date.now());
  const todayMinutes = state.history
    .filter((entry) => localDateKey(entry.created_at) === todayKey)
    .reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);
  const totalMinutes = state.history.reduce((sum, entry) => sum + Number(entry.earned_minutes || 0), 0);

  earnedToday.textContent = formatMinutes(todayMinutes);
  earnedTotal.textContent = formatMinutes(totalMinutes);
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!state.history.length) {
    historyList.innerHTML = '<p class="empty-history">Noch keine gespeicherten Runden.</p>';
    updateMinuteSummary();
    return;
  }

  state.history.slice(0, 10).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-main">
        <strong>${entry.child_name || "Kind"} - Runde ${entry.round_number}</strong>
        <span>${entry.correct_total}/${entry.questions_total} richtig (${entry.score_percent}%)</span>
      </div>
      <div class="history-meta">
        <span>${entry.reward_unlocked ? "Minuten gutgeschrieben" : "Keine Minuten"}</span>
        <span>${formatMinutes(Number(entry.earned_minutes || 0))}</span>
        <span>${formatHistoryDate(entry.created_at)}</span>
      </div>
    `;
    historyList.append(item);
  });

  updateMinuteSummary();
}

function createRound() {
  saveSettings();
  const usedKeys = new Set();

  try {
    state.questions = Array.from({ length: state.questionsPerRound }, (_, index) => ({
      id: index + 1,
      ...buildQuestion(usedKeys),
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
  updateStatus(`${getGreeting()} loese jetzt ${state.questionsPerRound} Aufgaben. Bei mindestens ${state.rewardTarget}% bekommst du ${formatMinutes(calculateEarnedMinutes(state.questionsPerRound))} gutgeschrieben.`);
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
      return;
    }

    card.classList.add("wrong");
    feedback.textContent = `Richtige Antwort: ${question.answer}`;
  });
}

function currentRoundPayload(correct, percent, earnedMinutes) {
  return {
    child_name: childNameInput.value.trim() || null,
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
  const mergedHistory = [entry, ...state.history].slice(0, 50);
  state.history = mergedHistory;
  writeLocalHistory(mergedHistory);
  renderHistory();

  if (!state.api || state.storageMode !== "cloud") {
    return;
  }

  try {
    await state.api.createLearningRound(entry);
    const latest = await state.api.listLearningRounds();
    state.history = latest;
    writeLocalHistory(latest);
    renderHistory();
    setStorageMode("cloud");
  } catch (error) {
    console.warn("Supabase-Speicherung fehlgeschlagen, lokaler Fallback bleibt aktiv.", error);
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
    rewardText.textContent = `Heute wurden gerade ${formatMinutes(earnedMinutes)} gutgeschrieben.`;
    overlayMessage.textContent = `Starke Runde. Die erspielten Minuten koennt ihr jetzt selbst fuer Medienzeit verwenden.`;
    updateStatus(`Geschafft. ${correct} von ${state.questions.length} richtig. ${formatMinutes(earnedMinutes)} wurden dem Minutenkonto hinzugefuegt.`);
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
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("Let's get ready to rumble!");
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function createLocalApi() {
  return {
    async listLearningRounds() {
      return readLocalHistory();
    },
    async createLearningRound(entry) {
      const current = readLocalHistory();
      writeLocalHistory([entry, ...current]);
    }
  };
}

function createSupabaseApi(cfg) {
  const root = cfg.supabaseUrl.replace(/\/+$/, "");
  const base = root + "/rest/v1/learning_rounds";

  async function request(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options && options.headers ? options.headers : {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error("HTTP " + response.status + ": " + text);
    }

    return response.status === 204 ? null : response.json();
  }

  return {
    async listLearningRounds() {
      const query =
        "?select=id,created_at,child_name,round_number,questions_total,correct_total,score_percent,reward_unlocked,reward_target,earned_minutes" +
        "&order=created_at.desc" +
        "&limit=50";
      const data = await request(base + query, { method: "GET" });
      return Array.isArray(data) ? data : [];
    },
    async createLearningRound(entry) {
      await request(base, {
        method: "POST",
        body: JSON.stringify([entry])
      });
    }
  };
}

async function loadHistory() {
  state.history = readLocalHistory();
  renderHistory();

  const cfg = window.APP_CONFIG || {};
  const hasSupabase = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  state.api = hasSupabase ? createSupabaseApi(cfg) : createLocalApi();

  if (!hasSupabase) {
    setStorageMode("local");
    return;
  }

  try {
    const rows = await state.api.listLearningRounds();
    if (rows.length) {
      state.history = rows;
      writeLocalHistory(rows);
      renderHistory();
    }
    setStorageMode("cloud");
  } catch (error) {
    console.warn("Supabase noch nicht verfuegbar, lokaler Speicher bleibt aktiv.", error);
    state.api = createLocalApi();
    setStorageMode("local");
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service Worker konnte nicht registriert werden.", error);
      });
    });
  }
}

startBtn.addEventListener("click", createRound);
submitBtn.addEventListener("click", evaluateRound);
nextRoundBtn.addEventListener("click", createRound);
unlockBtn.addEventListener("click", toggleSettingsLock);
parentPinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    toggleSettingsLock();
  }
});

[childNameInput, questionCountInput, targetPercentInput].forEach((element) => {
  element.addEventListener("change", saveSettings);
  element.addEventListener("input", updatePotentialMinutes);
});

loadSettings();
setSettingsLock(false);
rewardText.textContent = "Ab der Zielquote werden Minuten gutgeschrieben. Je 10 Aufgaben gibt es 1 Minute.";
overlayMessage.textContent = "Neue Minuten werden nach jeder erfolgreichen Runde automatisch dem Tageskonto gutgeschrieben.";
updatePotentialMinutes();
void loadHistory();
registerServiceWorker();
