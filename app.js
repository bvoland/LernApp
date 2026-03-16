const questionCountInput = document.getElementById("question-count");
const childNameInput = document.getElementById("child-name");
const videoUrlInput = document.getElementById("video-url");
const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const nextRoundBtn = document.getElementById("next-round-btn");
const quizForm = document.getElementById("quiz-form");
const roundLabel = document.getElementById("round-label");
const correctCount = document.getElementById("correct-count");
const scoreRate = document.getElementById("score-rate");
const statusBanner = document.getElementById("status-banner");
const rewardText = document.getElementById("reward-text");
const timerPill = document.getElementById("timer-pill");
const rewardVideo = document.getElementById("reward-video");
const videoShell = document.getElementById("video-shell");
const overlayMessage = document.getElementById("overlay-message");

const REWARD_TARGET = 95;
const REWARD_SECONDS = 120;
const STORAGE_KEY = "mathe-mission-state";
const OPERATIONS = ["+", "-", "*", "/"];

const state = {
  round: 1,
  questionsPerRound: 20,
  questions: [],
  isRoundActive: false,
  rewardTimer: null,
  rewardSecondsLeft: REWARD_SECONDS,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    childNameInput.value = saved.childName || "";
    videoUrlInput.value = saved.videoUrl || "";
    if (saved.questionsPerRound) {
      questionCountInput.value = saved.questionsPerRound;
    }
    if (saved.round) {
      state.round = saved.round;
      roundLabel.textContent = String(state.round);
    }
  } catch (error) {
    console.warn("Konnte gespeicherte Einstellungen nicht laden.", error);
  }
}

function saveSettings() {
  const payload = {
    childName: childNameInput.value.trim(),
    videoUrl: videoUrlInput.value.trim(),
    questionsPerRound: Number(questionCountInput.value) || 20,
    round: state.round,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildQuestion() {
  const operation = OPERATIONS[randomInt(0, OPERATIONS.length - 1)];

  if (operation === "+") {
    const left = randomInt(0, 900);
    const right = randomInt(0, 1000 - left);
    return { left, right, operation, answer: left + right };
  }

  if (operation === "-") {
    const left = randomInt(0, 1000);
    const right = randomInt(0, left);
    return { left, right, operation, answer: left - right };
  }

  if (operation === "*") {
    const left = randomInt(0, 20);
    const right = randomInt(0, Math.floor(1000 / Math.max(left || 1, 1)));
    const safeRight = Math.min(right, 12);
    return { left, right: safeRight, operation, answer: left * safeRight };
  }

  const right = randomInt(1, 12);
  const result = randomInt(0, 12);
  const left = right * result;
  return { left, right, operation, answer: result };
}

function createRound() {
  const questionCount = Math.min(40, Math.max(5, Number(questionCountInput.value) || 20));
  state.questionsPerRound = questionCount;
  state.questions = Array.from({ length: questionCount }, (_, index) => ({
    id: index + 1,
    ...buildQuestion(),
    userAnswer: "",
    isCorrect: null,
  }));
  state.isRoundActive = true;

  renderQuestions();
  resetScore();
  updateStatus(`${getGreeting()} loese jetzt ${questionCount} Aufgaben. Fuer die Belohnung brauchst du mindestens ${REWARD_TARGET} Prozent.`);
  submitBtn.disabled = false;
  nextRoundBtn.hidden = true;
  saveSettings();
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
  correctCount.textContent = String(correct);
  scoreRate.textContent = `${percent}%`;
  state.isRoundActive = false;

  updateQuestionFeedback();
  submitBtn.disabled = true;

  if (percent >= REWARD_TARGET) {
    updateStatus(`Stark gemacht. ${correct} von ${state.questions.length} Aufgaben sind richtig. Die Belohnung laeuft jetzt fuer 2 Minuten.`);
    nextRoundBtn.hidden = true;
    startReward();
  } else {
    updateStatus(`Diese Runde reicht noch nicht fuer die Belohnung. ${correct} von ${state.questions.length} richtig. Noch eine Runde mit ${state.questionsPerRound} neuen Aufgaben.`);
    lockReward("Weiter ueben: Erst ab 95 Prozent wird das Video freigeschaltet.");
    nextRoundBtn.hidden = false;
  }
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

function normalizeVideoUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("/embed/")) {
    return appendAutoplay(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return appendAutoplay(`https://www.youtube.com/embed/${videoId}`);
      }
    }

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return appendAutoplay(`https://www.youtube.com/embed/${videoId}`);
      }
    }
  } catch (error) {
    console.warn("Ungueltige Video-URL", error);
  }

  return "";
}

function appendAutoplay(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}autoplay=1&rel=0`;
}

function startReward() {
  const embedUrl = normalizeVideoUrl(videoUrlInput.value);
  if (!embedUrl) {
    lockReward("Die Runde ist geschafft, aber es fehlt noch eine gueltige YouTube Embed URL.");
    rewardText.textContent = "Bitte eine gueltige YouTube Embed URL eintragen.";
    return;
  }

  clearInterval(state.rewardTimer);
  state.rewardSecondsLeft = REWARD_SECONDS;
  rewardVideo.src = embedUrl;
  videoShell.classList.add("unlocked");
  overlayMessage.textContent = "";
  rewardText.textContent = "Das Video ist jetzt freigeschaltet.";
  updateTimerText();

  state.rewardTimer = window.setInterval(() => {
    state.rewardSecondsLeft -= 1;
    updateTimerText();

    if (state.rewardSecondsLeft <= 0) {
      clearInterval(state.rewardTimer);
      state.rewardTimer = null;
      state.round += 1;
      roundLabel.textContent = String(state.round);
      saveSettings();
      lockReward(`Die 2 Minuten sind vorbei. Jetzt muessen erst wieder ${state.questionsPerRound} Aufgaben geloest werden.`);
      updateStatus(`Belohnungszeit beendet. Starte Runde ${state.round} mit ${state.questionsPerRound} neuen Aufgaben.`);
      nextRoundBtn.hidden = false;
    }
  }, 1000);
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
  rewardVideo.src = "";
  videoShell.classList.remove("unlocked");
  overlayMessage.textContent = message;
  rewardText.textContent = "Video ist gesperrt, bis die naechste starke Runde geschafft ist.";
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

[childNameInput, questionCountInput, videoUrlInput].forEach((element) => {
  element.addEventListener("change", saveSettings);
});

loadSettings();
lockReward("Nach einer erfolgreichen Runde startet hier das Video fuer 2 Minuten.");
registerServiceWorker();
