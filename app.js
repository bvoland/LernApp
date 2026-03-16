const PARENT_PIN = "0922";
const REWARD_TARGET = 95;
const REWARD_SECONDS = 120;
const STORAGE_KEY = "mathe-mission-state";
const HISTORY_STORAGE_KEY = "mathe-mission-history";
const OPERATIONS = ["+", "-", "*", "/"];
const TOPICS = [
  { key: "minecraft", label: "Minecraft", searchText: "Minecraft" },
  { key: "robotik", label: "Robotik", searchText: "Robotik" },
  { key: "lego", label: "Lego", searchText: "Lego" }
];

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
const quizForm = document.getElementById("quiz-form");
const roundLabel = document.getElementById("round-label");
const correctCount = document.getElementById("correct-count");
const scoreRate = document.getElementById("score-rate");
const statusBanner = document.getElementById("status-banner");
const rewardText = document.getElementById("reward-text");
const timerPill = document.getElementById("timer-pill");
const videoShell = document.getElementById("video-shell");
const overlayMessage = document.getElementById("overlay-message");
const topicOptions = document.getElementById("topic-options");
const historyList = document.getElementById("history-list");
const storageState = document.getElementById("storage-state");

const videoInputs = {
  minecraft: document.getElementById("video-minecraft"),
  robotik: document.getElementById("video-robotik"),
  lego: document.getElementById("video-lego")
};

const state = {
  round: 1,
  questionsPerRound: 20,
  questions: [],
  isRoundActive: false,
  rewardTimer: null,
  rewardSecondsLeft: REWARD_SECONDS,
  settingsUnlocked: false,
  selectedTopic: "minecraft",
  videoCatalog: {
    minecraft: "",
    robotik: "",
    lego: ""
  },
  playerReady: false,
  pendingVideoId: "",
  activeVideoId: "",
  player: null,
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
    state.round = saved.round || 1;
    roundLabel.textContent = String(state.round);
    state.selectedTopic = saved.selectedTopic || "minecraft";
    state.videoCatalog = {
      minecraft: saved.videoCatalog?.minecraft || "",
      robotik: saved.videoCatalog?.robotik || "",
      lego: saved.videoCatalog?.lego || ""
    };
  } catch (error) {
    console.warn("Konnte gespeicherte Einstellungen nicht laden.", error);
  }

  Object.entries(videoInputs).forEach(([key, input]) => {
    input.value = state.videoCatalog[key] || "";
  });
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
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 30)));
}

function saveSettings() {
  const payload = {
    childName: childNameInput.value.trim(),
    questionsPerRound: Number(questionCountInput.value) || 20,
    round: state.round,
    selectedTopic: state.selectedTopic,
    videoCatalog: { ...state.videoCatalog }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function formatHistoryDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!state.history.length) {
    historyList.innerHTML = '<p class="empty-history">Noch keine gespeicherten Runden.</p>';
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
        <span>${entry.reward_unlocked ? "Belohnung frei" : "Noch gesperrt"}</span>
        <span>${entry.selected_topic || "-"}</span>
        <span>${formatHistoryDate(entry.created_at)}</span>
      </div>
    `;
    historyList.append(item);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRangeKey() {
  const roll = Math.random();
  if (roll < 0.4) {
    return "small";
  }
  if (roll < 0.8) {
    return "medium";
  }
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
  const left = right * result;
  return { left, right, operation: "/", answer: result };
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

    if (operation === "+") {
      question = buildAdditionQuestion(rangeKey);
    } else if (operation === "-") {
      question = buildSubtractionQuestion(rangeKey);
    } else if (operation === "*") {
      question = buildMultiplicationQuestion(rangeKey);
    } else {
      question = buildDivisionQuestion(rangeKey);
    }

    const key = questionKey(question);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return question;
    }

    attempts += 1;
  }

  throw new Error("Konnte keine eindeutige Aufgabe fuer diese Runde erzeugen.");
}

function createRound() {
  const questionCount = Math.min(40, Math.max(5, Number(questionCountInput.value) || 20));
  state.questionsPerRound = questionCount;
  const usedKeys = new Set();

  try {
    state.questions = Array.from({ length: questionCount }, (_, index) => ({
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
  resetScore();
  updateStatus(`${getGreeting()} loese jetzt ${questionCount} Aufgaben. Fuer die Belohnung brauchst du mindestens ${REWARD_TARGET} Prozent.`);
  submitBtn.disabled = false;
  nextRoundBtn.hidden = true;
  saveSettings();
}

function currentRoundPayload(correct, percent) {
  return {
    child_name: childNameInput.value.trim() || null,
    round_number: state.round,
    questions_total: state.questions.length,
    correct_total: correct,
    score_percent: percent,
    reward_unlocked: percent >= REWARD_TARGET,
    selected_topic: getSelectedTopicLabel(),
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
  const mergedHistory = [entry, ...state.history].slice(0, 30);
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

function getGreeting() {
  const name = childNameInput.value.trim();
  return name ? `${name},` : "Los geht's,";
}

function resetScore() {
  correctCount.textContent = "0";
  scoreRate.textContent = "0%";
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

function getOperationSymbol(operation) {
  if (operation === "*") {
    return "x";
  }
  if (operation === "/") {
    return ":";
  }
  return operation;
}

function handleAnswerInput(event) {
  const id = Number(event.target.dataset.id);
  const question = state.questions.find((item) => item.id === id);
  if (!question) {
    return;
  }

  question.userAnswer = event.target.value;
}

function evaluateRound() {
  if (!state.isRoundActive) {
    return;
  }

  let correct = 0;

  state.questions.forEach((question) => {
    const numericAnswer = Number(question.userAnswer);
    question.isCorrect = question.userAnswer !== "" && numericAnswer === question.answer;
    if (question.isCorrect) {
      correct += 1;
    }
  });

  const percent = Math.round((correct / state.questions.length) * 100);
  void saveRoundResult(currentRoundPayload(correct, percent));
  correctCount.textContent = String(correct);
  scoreRate.textContent = `${percent}%`;
  state.isRoundActive = false;

  updateQuestionFeedback();
  submitBtn.disabled = true;

  if (percent >= REWARD_TARGET) {
    nextRoundBtn.hidden = true;
    updateStatus(`Stark gemacht. ${correct} von ${state.questions.length} Aufgaben sind richtig. Das ${getSelectedTopicLabel()}-Video laeuft jetzt fuer 2 Minuten.`);
    startReward();
    return;
  }

  updateStatus(`Diese Runde reicht noch nicht fuer die Belohnung. ${correct} von ${state.questions.length} richtig. Noch eine Runde mit ${state.questionsPerRound} neuen Aufgaben.`);
  lockReward("Weiter ueben: Erst ab 95 Prozent wird das Video freigeschaltet.");
  nextRoundBtn.hidden = false;
}

function updateQuestionFeedback() {
  state.questions.forEach((question) => {
    const card = quizForm.querySelector(`[data-id="${question.id}"]`);
    if (!card) {
      return;
    }

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

function updateStatus(message) {
  statusBanner.textContent = message;
}

function renderTopicOptions() {
  topicOptions.innerHTML = "";

  TOPICS.forEach((topic) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic-btn";
    button.dataset.topic = topic.key;

    if (state.selectedTopic === topic.key) {
      button.classList.add("active");
    }

    const isConfigured = Boolean(state.videoCatalog[topic.key]);
    button.innerHTML = `
      <span class="topic-name">${topic.label}</span>
      <span class="topic-meta">${isConfigured ? "Video bereit" : "Noch kein Video"}</span>
    `;
    button.addEventListener("click", () => selectTopic(topic.key));
    topicOptions.append(button);
  });
}

function selectTopic(topicKey) {
  state.selectedTopic = topicKey;
  renderTopicOptions();
  saveSettings();

  if (!state.videoCatalog[topicKey]) {
    rewardText.textContent = `Fuer ${getSelectedTopicLabel()} ist noch kein Video hinterlegt.`;
  } else if (!state.rewardTimer) {
    rewardText.textContent = `${getSelectedTopicLabel()} ist ausgewaehlt. Das Video startet nach einer erfolgreichen Runde.`;
  }
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

function normalizeVideoUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("/embed/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
  } catch (error) {
    console.warn("Ungueltige Video-URL", error);
  }

  return "";
}

function extractVideoId(url) {
  const normalized = normalizeVideoUrl(url);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch (error) {
    console.warn("Konnte Video-ID nicht lesen.", error);
    return "";
  }
}

function getSelectedTopicLabel() {
  return TOPICS.find((topic) => topic.key === state.selectedTopic)?.label || "Video";
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
        "?select=id,created_at,child_name,round_number,questions_total,correct_total,score_percent,reward_unlocked,selected_topic" +
        "&order=created_at.desc" +
        "&limit=20";
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

function handleVideoInputChange(event) {
  const topicKey = event.target.id.replace("video-", "");
  state.videoCatalog[topicKey] = event.target.value.trim();
  renderTopicOptions();
  saveSettings();
}

function startReward() {
  const videoUrl = state.videoCatalog[state.selectedTopic];
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    lockReward(`Fuer ${getSelectedTopicLabel()} ist noch keine gueltige YouTube-URL eingetragen.`);
    rewardText.textContent = `Bitte im Elternbereich ein gueltiges ${getSelectedTopicLabel()}-Video hinterlegen.`;
    return;
  }

  clearInterval(state.rewardTimer);
  state.rewardSecondsLeft = REWARD_SECONDS;
  state.activeVideoId = videoId;
  state.pendingVideoId = videoId;
  videoShell.classList.add("unlocked");
  overlayMessage.textContent = "";
  rewardText.textContent = `${getSelectedTopicLabel()} laeuft jetzt fuer 2 Minuten.`;
  updateTimerText();
  playSelectedVideo();

  state.rewardTimer = window.setInterval(() => {
    state.rewardSecondsLeft -= 1;
    updateTimerText();

    if (state.rewardSecondsLeft <= 0) {
      finishRewardWindow();
    }
  }, 1000);
}

function finishRewardWindow() {
  clearInterval(state.rewardTimer);
  state.rewardTimer = null;
  pausePlayer();
  state.round += 1;
  roundLabel.textContent = String(state.round);
  saveSettings();
  lockReward(`Die 2 Minuten sind vorbei. Jetzt muessen erst wieder ${state.questionsPerRound} Aufgaben geloest werden.`);
  updateStatus(`Belohnungszeit beendet. Starte Runde ${state.round} mit ${state.questionsPerRound} neuen Aufgaben.`);
  nextRoundBtn.hidden = false;
}

function updateTimerText() {
  const minutes = String(Math.floor(state.rewardSecondsLeft / 60)).padStart(2, "0");
  const seconds = String(state.rewardSecondsLeft % 60).padStart(2, "0");
  timerPill.textContent = `${minutes}:${seconds}`;
}

function lockReward(message) {
  clearInterval(state.rewardTimer);
  state.rewardTimer = null;
  state.rewardSecondsLeft = REWARD_SECONDS;
  updateTimerText();
  pausePlayer();
  videoShell.classList.remove("unlocked");
  overlayMessage.textContent = message;
  rewardText.textContent = "Video ist gesperrt, bis die naechste starke Runde geschafft ist.";
}

function pausePlayer() {
  if (state.player && state.playerReady) {
    state.player.pauseVideo();
  }
}

function playSelectedVideo() {
  if (!state.pendingVideoId) {
    return;
  }

  if (state.player && state.playerReady) {
    state.player.loadVideoById(state.pendingVideoId);
    state.pendingVideoId = "";
  }
}

function onYouTubeIframeAPIReady() {
  state.player = new window.YT.Player("reward-video", {
    videoId: "",
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        state.playerReady = true;
        playSelectedVideo();
      }
    }
  });
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

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

[childNameInput, questionCountInput].forEach((element) => {
  element.addEventListener("change", saveSettings);
});

Object.values(videoInputs).forEach((input) => {
  input.addEventListener("change", handleVideoInputChange);
});

loadSettings();
setSettingsLock(false);
renderTopicOptions();
selectTopic(state.selectedTopic);
lockReward("Nach einer erfolgreichen Runde startet hier das ausgewaehlte Video fuer 2 Minuten.");
void loadHistory();
registerServiceWorker();
