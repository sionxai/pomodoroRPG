const CURRENT_SCHEMA = 1;
const DAILY_GOAL_COUNT = 3;
const STORAGE_KEYS = {
  schema: "fq_schema",
  user: "fq_user",
  quests: "fq_quests",
  sessions: "fq_sessions",
  dailyLogs: "fq_dailyLogs",
  activeSession: "fq_activeSession",
  ui: "fq_ui",
};

const MODE_CONFIG = {
  light: {
    id: "light",
    icon: "🌱",
    label: "라이트",
    shortLabel: "15",
    focusMinutes: 15,
    shortBreak: 3,
    longBreak: 10,
    flowAllowed: false,
  },
  standard: {
    id: "standard",
    icon: "⚡",
    label: "스탠다드",
    shortLabel: "25",
    focusMinutes: 25,
    shortBreak: 5,
    longBreak: 15,
    flowAllowed: true,
  },
  deep: {
    id: "deep",
    icon: "🔥",
    label: "딥포커스",
    shortLabel: "40",
    focusMinutes: 40,
    shortBreak: 7,
    longBreak: 20,
    flowAllowed: false,
  },
};

const QUEST_TYPES = {
  sub: {
    id: "sub",
    icon: "📜",
    label: "서브 퀘스트",
    shortLabel: "서브",
    xp: 10,
    coins: 1,
    className: "sub",
    modeRestrict: null,
    maxPauses: Infinity,
    reviewRequired: false,
    desc: "자유롭게, 빠르게",
  },
  main: {
    id: "main",
    icon: "⚔️",
    label: "메인 퀘스트",
    shortLabel: "메인",
    xp: 20,
    coins: 2,
    className: "main",
    modeRestrict: ["standard", "deep"],
    maxPauses: 2,
    reviewRequired: false,
    desc: "25분+, 정지 2회까지 무손실",
  },
  boss: {
    id: "boss",
    icon: "🐉",
    label: "보스 퀘스트",
    shortLabel: "보스",
    xp: 35,
    coins: 5,
    className: "boss",
    modeRestrict: ["deep"],
    maxPauses: 1,
    reviewRequired: true,
    desc: "40분 고정, 긴급정지 1회, 리뷰 필수",
  },
};

const SHOP_ITEMS = [
  { id: "cushion_chair", name: "쿠션 의자", icon: "🪑", category: "furniture", price: 5, slot: "chair" },
  { id: "globe", name: "지구본", icon: "🌍", category: "deco", price: 3, slot: "desk_right" },
  { id: "small_plant", name: "작은 화분", icon: "🌿", category: "plant", price: 2, slot: "floor_left" },
  { id: "frame_art", name: "풍경 액자", icon: "🖼️", category: "wall", price: 4, slot: "wall_left" },
  { id: "neon_sign", name: "네온사인", icon: "💡", category: "wall", price: 6, slot: "wall_center" },
  { id: "coffee_mug", name: "커피잔", icon: "☕", category: "deco", price: 1, slot: "desk_left" },
  { id: "cat_pet", name: "고양이", icon: "🐱", category: "pet", price: 8, slot: "floor_right" },
  { id: "boss_trophy", name: "보스 트로피", icon: "🏆", category: "special", price: 0, slot: "shelf_top", bossUnlock: true },
];

const SHOP_CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "furniture", label: "가구" },
  { id: "deco", label: "소품" },
  { id: "plant", label: "식물" },
  { id: "wall", label: "벽장식" },
  { id: "pet", label: "펫" },
  { id: "special", label: "특별" },
];

const GUIDE_SLIDES = [
  {
    eyebrow: "⚔️ 퀘스트 만들기",
    title: "해야 할 일을 퀘스트로 바꾸세요",
    body: "제목과 예상 포모 수만 정하면 됩니다. 가장 미루던 일은 보스 퀘스트로 지정해 보상을 크게 가져가세요.",
    cta: "다음 →",
    accent: "quests",
  },
  {
    eyebrow: "⏱️ 집중하기",
    title: "타이머가 흐를수록 서재가 반응합니다",
    body: "조명이 켜지고, 책이 쌓이고, 하늘이 바뀝니다. 버티는 시간이 아니라 성장시키는 시간으로 느껴지도록 설계했습니다.",
    cta: "다음 →",
    accent: "focus",
  },
  {
    eyebrow: "🌱 성장 확인",
    title: "집중할수록 내 공간이 진화합니다",
    body: "세션을 끝낼 때마다 XP와 레벨이 쌓이고 서재가 확장됩니다. 첫 퀘스트부터 바로 시작해 보세요.",
    cta: "첫 퀘스트 만들기 →",
    accent: "growth",
  },
];

const root = document.querySelector("#app");

const data = {
  user: null,
  quests: [],
  sessions: [],
  dailyLogs: {},
  activeSession: null,
  ui: null,
};

const runtime = {
  view: "home",
  selectedQuestId: null,
  showQuestForm: false,
  questDraft: createQuestDraft(),
  showCompleted: false,
  guideIndex: 0,
  breakState: null,
  lastSessionResult: null,
  toastMessage: "",
  toastTimerId: 0,
  rafId: 0,
  breakIntervalId: 0,
  listenersAttached: false,
  reviewDraft: { text: "", satisfaction: 0 },
  shopCategory: "all",
};

function bootstrap() {
  migrateSchema();
  hydrateData();
  applyDailyReset();
  ensureSelectedQuest();
  resolveInitialView();
  attachGlobalListeners();
  render();
  window.addEventListener("visibilitychange", handleVisibilityChange);
}

function createQuestDraft() {
  return {
    title: "",
    targetPomos: 1,
    type: "sub",
  };
}

function createDefaultUser() {
  return {
    level: 1,
    xp: 0,
    coins: 0,
    totalSessions: 0,
    totalMinutes: 0,
    streak: 0,
    lastActiveDate: "",
    studyRoomLevel: 1,
    unlockedItems: getUnlockedItems(1),
    preferredMode: "standard",
    todayCombo: 0,
    ownedItems: [],
    equippedItems: [],
    bossClears: 0,
    createdAt: new Date().toISOString(),
  };
}

function createDefaultUi() {
  return {
    guideDismissed: false,
  };
}

function migrateSchema() {
  const schema = StorageService.get(STORAGE_KEYS.schema, null);
  if (schema === CURRENT_SCHEMA) {
    return;
  }

  if (schema === null) {
    StorageService.set(STORAGE_KEYS.schema, CURRENT_SCHEMA);
    return;
  }

  StorageService.set(STORAGE_KEYS.schema, CURRENT_SCHEMA);
}

function hydrateData() {
  data.user = StorageService.get(STORAGE_KEYS.user, createDefaultUser());
  data.quests = StorageService.get(STORAGE_KEYS.quests, []);
  data.sessions = StorageService.get(STORAGE_KEYS.sessions, []);
  data.dailyLogs = StorageService.get(STORAGE_KEYS.dailyLogs, {});
  data.activeSession = StorageService.get(STORAGE_KEYS.activeSession, null);
  data.ui = StorageService.get(STORAGE_KEYS.ui, createDefaultUi());

  data.user.level = getLevelFromXp(data.user.xp || 0);
  data.user.studyRoomLevel = getStudyRoomLevel(data.user.totalSessions || 0);
  data.user.unlockedItems = getUnlockedItems(data.user.studyRoomLevel);

  persistAll();
}

function applyDailyReset() {
  const today = getLocalDate();
  if (data.user.lastActiveDate && data.user.lastActiveDate !== today) {
    data.user.todayCombo = 0;
  }

  ensureDailyLog(today);
  persistAll();
}

function resolveInitialView() {
  if (shouldShowGuide()) {
    runtime.view = "guide";
    runtime.showQuestForm = false;
    return;
  }

  if (data.activeSession) {
    reconcileActiveSession();
    return;
  }

  runtime.view = "home";
  runtime.showQuestForm = data.quests.length === 0;
}

function reconcileActiveSession() {
  const active = data.activeSession;
  if (!active) {
    runtime.view = "home";
    return;
  }

  if (active.state === "prompt") {
    runtime.view = "focus";
    return;
  }

  if (getRemainingMs(active) <= 0) {
    if (shouldOfferFlowPrompt(active)) {
      active.state = "prompt";
      persistDomain("activeSession");
      runtime.view = "focus";
      return;
    }

    const result = finalizeActiveSession();
    if (result) {
      startBreak(result);
    } else {
      runtime.view = "home";
    }
    return;
  }

  runtime.view = "focus";
}

function shouldShowGuide() {
  return data.user.totalSessions === 0 && !data.ui.guideDismissed;
}

function attachGlobalListeners() {
  if (runtime.listenersAttached) {
    return;
  }

  runtime.listenersAttached = true;

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
}

function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === "guide-next") {
    runtime.guideIndex = Math.min(runtime.guideIndex + 1, GUIDE_SLIDES.length - 1);
    render();
    return;
  }

  if (action === "guide-finish") {
    data.ui.guideDismissed = true;
    persistDomain("ui");
    runtime.view = "home";
    runtime.showQuestForm = true;
    runtime.guideIndex = 0;
    render();
    return;
  }

  if (action === "guide-close") {
    data.ui.guideDismissed = true;
    persistDomain("ui");
    runtime.view = "home";
    runtime.showQuestForm = data.quests.length === 0;
    runtime.guideIndex = 0;
    render();
    return;
  }

  if (action === "toggle-quest-form") {
    runtime.showQuestForm = !runtime.showQuestForm;
    if (!runtime.showQuestForm) {
      runtime.questDraft = createQuestDraft();
    }
    render();
    return;
  }

  if (action === "set-quest-pomos") {
    runtime.questDraft.targetPomos = Number(actionTarget.dataset.pomos);
    render();
    return;
  }

  if (action === "set-quest-type") {
    runtime.questDraft.type = actionTarget.dataset.type;
    render();
    return;
  }

  if (action === "select-mode") {
    data.user.preferredMode = actionTarget.dataset.mode;
    persistDomain("user");
    render();
    return;
  }

  if (action === "select-quest") {
    runtime.selectedQuestId = actionTarget.dataset.questId;
    render();
    return;
  }

  if (action === "clear-quest-selection") {
    runtime.selectedQuestId = null;
    render();
    return;
  }

  if (action === "delete-quest") {
    const questId = actionTarget.dataset.questId;
    const quest = getQuestById(questId);
    if (!quest) {
      return;
    }
    const confirmed = window.confirm(`"${quest.title}" 퀘스트를 삭제할까요?`);
    if (!confirmed) {
      return;
    }
    data.quests = data.quests.filter((item) => item.id !== questId);
    if (runtime.selectedQuestId === questId) {
      runtime.selectedQuestId = null;
      ensureSelectedQuest();
    }
    persistDomain("quests");
    showToast("퀘스트를 정리했습니다.");
    render();
    return;
  }

  if (action === "toggle-completed") {
    runtime.showCompleted = !runtime.showCompleted;
    render();
    return;
  }

  if (action === "start-focus") {
    startFocusSession();
    return;
  }

  if (action === "pause-resume") {
    togglePause();
    return;
  }

  if (action === "forfeit-session") {
    forfeitActiveSession();
    return;
  }

  if (action === "flow-extend") {
    extendFlowSession();
    return;
  }

  if (action === "flow-break") {
    const result = finalizeActiveSession();
    if (result) {
      startBreak(result);
    }
    return;
  }

  if (action === "skip-break") {
    finishBreak(true);
    return;
  }

  if (action === "show-home") {
    runtime.view = "home";
    runtime.lastSessionResult = null;
    render();
    return;
  }

  if (action === "show-summary") {
    runtime.view = "summary";
    render();
    return;
  }

  if (action === "show-settings") {
    runtime.view = "settings";
    render();
    return;
  }

  if (action === "show-guide") {
    runtime.view = "guide";
    runtime.guideIndex = 0;
    render();
    return;
  }

  if (action === "reset-guide") {
    data.ui.guideDismissed = false;
    persistDomain("ui");
    runtime.view = "guide";
    runtime.guideIndex = 0;
    render();
    return;
  }

  if (action === "reset-all-data") {
    const confirmed = window.confirm(
      "모든 진행도, 퀘스트, 기록을 초기화할까요? 이 작업은 되돌릴 수 없습니다."
    );
    if (!confirmed) return;
    resetAllData();
    showToast("앱 데이터를 초기화했습니다.");
    render();
    return;
  }

  if (action === "show-shop") {
    runtime.view = "shop";
    runtime.shopCategory = "all";
    render();
    return;
  }

  if (action === "shop-category") {
    runtime.shopCategory = actionTarget.dataset.category;
    render();
    return;
  }

  if (action === "buy-item") {
    const itemId = actionTarget.dataset.itemId;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || data.user.ownedItems.includes(itemId)) return;
    if ((data.user.coins || 0) < item.price) {
      showToast("코인이 부족합니다!");
      render();
      return;
    }
    data.user.coins -= item.price;
    data.user.ownedItems.push(itemId);
    data.user.equippedItems.push(itemId);
    persistDomain("user");
    showToast(`${item.name}을(를) 구매했습니다!`);
    render();
    return;
  }

  if (action === "equip-item") {
    const itemId = actionTarget.dataset.itemId;
    if (!data.user.equippedItems.includes(itemId)) {
      data.user.equippedItems.push(itemId);
      persistDomain("user");
    }
    render();
    return;
  }

  if (action === "unequip-item") {
    const itemId = actionTarget.dataset.itemId;
    data.user.equippedItems = data.user.equippedItems.filter(id => id !== itemId);
    persistDomain("user");
    render();
    return;
  }

  if (action === "set-satisfaction") {
    runtime.reviewDraft.satisfaction = Number(actionTarget.dataset.value);
    render();
    return;
  }

  if (action === "submit-boss-review") {
    const textarea = root.querySelector("[data-review-text]");
    if (textarea) {
      runtime.reviewDraft.text = textarea.value;
    }
    // 리뷰 데이터 저장
    const result = runtime.lastSessionResult;
    if (result && result.sessionId) {
      const session = data.sessions.find(s => s.id === result.sessionId);
      if (session) {
        session.reviewText = runtime.reviewDraft.text;
        session.reviewSatisfaction = runtime.reviewDraft.satisfaction;
        session.bossStatus = "success";
        persistDomain("sessions");
      }
    }
    showToast("보스 리뷰를 저장했습니다!");
    enterBreak(result);
    return;
  }
}

function handleSubmit(event) {
  const form = event.target.closest("form[data-form='quest']");
  if (!form) {
    return;
  }

  event.preventDefault();
  createQuest();
}

function handleInput(event) {
  const input = event.target;
  if (input.matches("input[name='quest-title']")) {
    runtime.questDraft.title = input.value;
  }
  if (input.matches("[data-review-text]")) {
    runtime.reviewDraft.text = input.value;
  }
}

function startFocusSession() {
  if (data.activeSession) {
    runtime.view = "focus";
    render();
    return;
  }

  const quest = getQuestById(runtime.selectedQuestId);
  const questType = quest ? QUEST_TYPES[quest.type] : QUEST_TYPES.sub;

  // 타입별 모드 제약
  let preferredMode = data.user.preferredMode;
  if (questType.modeRestrict) {
    if (!questType.modeRestrict.includes(preferredMode)) {
      preferredMode = questType.modeRestrict[0];
    }
  }
  const mode = MODE_CONFIG[preferredMode] || MODE_CONFIG.standard;

  const startedAt = Date.now();
  const activeSession = {
    id: `session_${startedAt}`,
    questId: quest && quest.status === "active" ? quest.id : null,
    questType: questType.id,
    mode: mode.id,
    duration: mode.focusMinutes,
    date: getLocalDate(),
    startedAt,
    endsAt: startedAt + mode.focusMinutes * 60 * 1000,
    pausedAt: null,
    pausedElapsed: 0,
    extensions: 0,
    pauseCount: 0,
    state: "running",
  };

  data.activeSession = activeSession;
  persistDomain("activeSession");
  runtime.lastSessionResult = null;
  runtime.view = "focus";
  render();
}

function togglePause() {
  const active = data.activeSession;
  if (!active) return;
  if (active.state === "prompt") return;

  const questType = QUEST_TYPES[active.questType] || QUEST_TYPES.sub;

  if (active.pausedAt) {
    // Resume
    const pausedDelta = Date.now() - active.pausedAt;
    active.endsAt += pausedDelta;
    active.pausedElapsed += pausedDelta;
    active.pausedAt = null;
    active.state = "running";
    showToast("집중을 재개했습니다.");
  } else {
    // Pause: 회수 체크
    if (active.pauseCount >= questType.maxPauses) {
      showToast(`${questType.label}의 정지 횟수를 초과했습니다. (XP -2)`);
    }
    active.pauseCount += 1;
    active.pausedAt = Date.now();
    active.state = "paused";
    showToast(`타이머를 일시정지했습니다. (정지 ${active.pauseCount}회)`);
  }

  persistDomain("activeSession");
  render();
}

function forfeitActiveSession() {
  const active = data.activeSession;
  if (!active) {
    return;
  }

  // confirm 중 RAF 루프가 DOM을 덮어쓰는 걸 방지
  cancelAnimationFrame(runtime.rafId);
  runtime.rafId = 0;

  const questType = QUEST_TYPES[active.questType] || QUEST_TYPES.sub;
  const msg = questType.id === "boss"
    ? "보스 퀘스트를 포기할까요? 콤보가 초기화되고 실패가 기록됩니다."
    : "이 세션을 포기할까요? 콤보가 초기화됩니다.";

  const confirmed = window.confirm(msg);
  if (!confirmed) {
    syncLiveLoops();
    return;
  }

  const record = buildSessionRecord(active, {
    completed: false,
    xpEarned: 0,
    combo: 0,
    endedAt: new Date().toISOString(),
    actualMinutes: getElapsedMinutes(active),
    pauseCount: active.pauseCount || 0,
    bossStatus: questType.id === "boss" ? "failed" : null,
  });

  if (!data.sessions.some((session) => session.id === record.id)) {
    data.sessions.push(record);
    persistDomain("sessions");
  }

  data.user.todayCombo = 0;
  persistDomain("user");

  data.activeSession = null;
  persistDomain("activeSession");
  runtime.view = "home";
  runtime.lastSessionResult = null;
  showToast("세션을 종료했습니다. 콤보가 초기화되었습니다.");
  render();
}

function extendFlowSession() {
  const active = data.activeSession;
  if (!active || active.state !== "prompt") {
    return;
  }

  active.extensions += 1;
  active.endsAt = Date.now() + 5 * 60 * 1000;
  active.pausedAt = null;
  active.state = "running";
  persistDomain("activeSession");
  render();
}

function finalizeActiveSession() {
  const active = data.activeSession;
  if (!active) {
    return null;
  }

  data.activeSession = null;
  persistDomain("activeSession");

  if (data.sessions.some((session) => session.id === active.id)) {
    return null;
  }

  const questType = QUEST_TYPES[active.questType] || QUEST_TYPES.sub;
  const rewardPreview = previewCompletionRewards(active);
  const actualMinutes = active.duration + active.extensions * 5;
  const quest = getQuestById(active.questId);
  let questCompleted = false;
  let questTitle = "빠른 집중";

  if (quest) {
    questTitle = quest.title;
    if (quest.status === "active") {
      quest.completedPomos = Math.min(quest.targetPomos, quest.completedPomos + 1);
      if (quest.completedPomos >= quest.targetPomos) {
        quest.status = "completed";
        quest.completedAt = new Date().toISOString();
        questCompleted = true;
      }
      persistDomain("quests");
    }
  }

  const today = getLocalDate();
  updateStreak(today);

  const startDate = active.date || today;
  const dailyLog = ensureDailyLog(startDate);
  dailyLog.sessionsCompleted += 1;
  dailyLog.totalMinutes += actualMinutes;
  dailyLog.questsCompleted += questCompleted ? 1 : 0;

  const nextCombo = (data.user.todayCombo || 0) + 1;
  data.user.todayCombo = nextCombo;
  dailyLog.maxCombo = Math.max(dailyLog.maxCombo, nextCombo);

  // XP 계산 (정지 패널티 반영)
  let xpEarned = rewardPreview.baseXp + rewardPreview.flowXp;
  const overPauses = Math.max(0, (active.pauseCount || 0) - questType.maxPauses);
  xpEarned = Math.max(1, xpEarned - overPauses * 2);
  if (nextCombo % 3 === 0) {
    xpEarned += 15;
  }

  let dailyGoalAchieved = false;
  if (!dailyLog.dailyGoalAwarded && dailyLog.sessionsCompleted >= DAILY_GOAL_COUNT) {
    dailyLog.dailyGoalAwarded = true;
    dailyGoalAchieved = true;
    xpEarned += 25;
  }

  // 코인 지급
  const coinsEarned = questType.coins;
  data.user.coins = (data.user.coins || 0) + coinsEarned;

  dailyLog.xpEarned += xpEarned;

  const record = buildSessionRecord(active, {
    completed: true,
    xpEarned,
    coinsEarned,
    combo: nextCombo,
    endedAt: new Date().toISOString(),
    actualMinutes,
    pauseCount: active.pauseCount || 0,
    bossStatus: questType.reviewRequired ? "pending_review" : null,
  });

  data.sessions.push(record);
  persistDomain("sessions");

  data.user.xp += xpEarned;
  data.user.totalSessions += 1;
  data.user.totalMinutes += actualMinutes;
  data.user.level = getLevelFromXp(data.user.xp);
  data.user.studyRoomLevel = getStudyRoomLevel(data.user.totalSessions);
  data.user.unlockedItems = getUnlockedItems(data.user.studyRoomLevel);

  if (questType.reviewRequired) {
    data.user.bossClears = (data.user.bossClears || 0) + 1;
    // 보스 트로피 자동 해금
    if (!data.user.ownedItems.includes("boss_trophy")) {
      data.user.ownedItems.push("boss_trophy");
      data.user.equippedItems.push("boss_trophy");
    }
  }

  persistDomain("user");
  persistDomain("dailyLogs");

  ensureSelectedQuest();

  return {
    questTitle,
    questType: questType.id,
    xpEarned,
    coinsEarned,
    combo: nextCombo,
    dailyGoalAchieved,
    questCompleted,
    roomLevel: data.user.studyRoomLevel,
    mode: active.mode,
    actualMinutes,
    reviewRequired: questType.reviewRequired,
    sessionId: active.id,
  };
}

function previewCompletionRewards(active) {
  const questType = QUEST_TYPES[active.questType] || QUEST_TYPES.sub;
  const baseXp = questType.xp;
  const flowXp = active.extensions * 3;
  const overPauses = Math.max(0, (active.pauseCount || 0) - questType.maxPauses);
  const pausePenalty = overPauses * 2;
  return {
    baseXp,
    flowXp,
    pausePenalty,
    coins: questType.coins,
    total: Math.max(1, baseXp + flowXp - pausePenalty),
  };
}

function startBreak(result) {
  runtime.lastSessionResult = result;

  // 보스 퀘스트: 리뷰가 필요하면 리뷰 화면으로
  if (result.reviewRequired) {
    runtime.reviewDraft = { text: "", satisfaction: 0 };
    runtime.view = "bossReview";
    render();
    return;
  }

  enterBreak(result);
}

function enterBreak(result) {
  const completedCount = data.user.totalSessions;
  const mode = MODE_CONFIG[result.mode] || MODE_CONFIG.standard;
  const breakMinutes =
    completedCount % 4 === 0 ? mode.longBreak : mode.shortBreak;

  runtime.breakState = {
    startedAt: Date.now(),
    endsAt: Date.now() + breakMinutes * 60 * 1000,
    duration: breakMinutes,
    nextQuestTitle: getNextQuestTitle(),
  };

  runtime.view = "break";
  render();
}

function finishBreak(skipped = false) {
  runtime.breakState = null;
  runtime.view = "home";
  render();
  if (skipped) {
    showToast("휴식을 건너뛰고 홈으로 돌아왔습니다.");
  } else {
    showToast("휴식이 끝났습니다. 다음 집중을 이어가세요.");
  }
}

function createQuest() {
  const title = runtime.questDraft.title.trim();
  if (!title) {
    showToast("퀘스트 제목을 입력해 주세요.");
    render();
    return;
  }

  const quest = {
    id: `quest_${Date.now()}`,
    title,
    type: runtime.questDraft.type,
    targetPomos: runtime.questDraft.targetPomos,
    completedPomos: 0,
    status: "active",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  data.quests.unshift(quest);
  runtime.selectedQuestId = quest.id;
  runtime.showQuestForm = false;
  runtime.questDraft = createQuestDraft();
  persistDomain("quests");
  showToast("새 퀘스트를 추가했습니다.");
  render();
}

function updateStreak(today) {
  if (!data.user.lastActiveDate) {
    data.user.streak = 1;
    data.user.lastActiveDate = today;
    return;
  }

  if (data.user.lastActiveDate === today) {
    return;
  }

  if (data.user.lastActiveDate === getYesterday(today)) {
    data.user.streak += 1;
  } else {
    data.user.streak = 1;
  }

  data.user.lastActiveDate = today;
}

function ensureDailyLog(date) {
  if (!data.dailyLogs[date]) {
    data.dailyLogs[date] = {
      sessionsCompleted: 0,
      totalMinutes: 0,
      xpEarned: 0,
      questsCompleted: 0,
      maxCombo: 0,
      dailyGoalAwarded: false,
    };
  }

  return data.dailyLogs[date];
}

function getNextQuestTitle() {
  const nextQuest = getActiveQuests()[0];
  return nextQuest ? nextQuest.title : "빠른 집중";
}

function buildSessionRecord(active, overrides) {
  return {
    id: active.id,
    questId: active.questId,
    duration: active.duration,
    actualMinutes: overrides.actualMinutes,
    extensions: active.extensions,
    mode: active.mode,
    completed: overrides.completed,
    xpEarned: overrides.xpEarned,
    combo: overrides.combo,
    date: active.date || getLocalDate(),
    startedAt: new Date(active.startedAt).toISOString(),
    endedAt: overrides.endedAt,
  };
}

function ensureSelectedQuest() {
  const activeQuests = getActiveQuests();
  if (activeQuests.length === 0) {
    runtime.selectedQuestId = null;
    return;
  }

  const selectedQuest = getQuestById(runtime.selectedQuestId);
  if (!selectedQuest || selectedQuest.status !== "active") {
    runtime.selectedQuestId = activeQuests[0].id;
  }
}

function getQuestById(questId) {
  return data.quests.find((quest) => quest.id === questId) || null;
}

function getActiveQuests() {
  return data.quests
    .filter((quest) => quest.status === "active")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getCompletedQuests() {
  return data.quests
    .filter((quest) => quest.status === "completed")
    .sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""));
}

function getRemainingMs(active) {
  if (!active) {
    return 0;
  }
  if (active.state === "prompt") {
    return 0;
  }
  if (active.pausedAt) {
    return Math.max(0, active.endsAt - active.pausedAt);
  }
  return Math.max(0, active.endsAt - Date.now());
}

function shouldOfferFlowPrompt(active) {
  const mode = MODE_CONFIG[active.mode];
  return Boolean(mode && mode.flowAllowed && active.extensions < 3);
}

function getElapsedMinutes(active) {
  const now = active.pausedAt || Date.now();
  const elapsedMs = Math.max(0, now - active.startedAt - active.pausedElapsed);
  return Math.max(1, Math.round(elapsedMs / 60000));
}

function render() {
  root.innerHTML = renderApp();
  syncLiveLoops();
  syncFocusDom();
}

function renderApp() {
  return `
    <div class="app-shell">
      <div class="app-shell__ambient"></div>
      <div class="app-shell__noise"></div>
      <main class="app-shell__main">
        ${renderCurrentView()}
      </main>
      ${renderToast()}
    </div>
  `;
}

function renderCurrentView() {
  switch (runtime.view) {
    case "guide":
      return renderGuideView();
    case "focus":
      return renderFocusView();
    case "break":
      return renderBreakView();
    case "bossReview":
      return renderBossReviewView();
    case "shop":
      return renderShopView();
    case "summary":
      return renderSummaryView();
    case "settings":
      return renderSettingsView();
    default:
      return renderHomeView();
  }
}

function renderGuideView() {
  const slide = GUIDE_SLIDES[runtime.guideIndex];
  const lastSlide = runtime.guideIndex === GUIDE_SLIDES.length - 1;

  return `
    <section class="screen screen--guide">
      <div class="hero-card hero-card--guide">
        <button class="icon-button guide-close-btn" data-action="guide-close" aria-label="가이드 닫기">✕</button>
        <div class="guide-grid">
          <div class="guide-copy">
            <p class="eyebrow">${slide.eyebrow}</p>
            <h1 class="display-title">${slide.title}</h1>
            <p class="body-copy">${slide.body}</p>
            <div class="guide-dots">
              ${GUIDE_SLIDES.map((_, index) => `
                <span class="guide-dot ${index === runtime.guideIndex ? "is-active" : ""}"></span>
              `).join("")}
            </div>
            <div class="guide-actions">
              ${lastSlide
      ? `<button class="primary-button" data-action="guide-finish">${slide.cta}</button>`
      : `<button class="primary-button" data-action="guide-next">${slide.cta}</button>`
    }
            </div>
          </div>
          <div class="guide-visual">
            ${renderGuideArtwork(slide.accent)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderGuideArtwork(accent) {
  if (accent === "quests") {
    return `
      <div class="art-panel art-panel--quest">
        <div class="art-card">
          <span>⚔️</span>
          <strong>기획안 작성</strong>
          <small>예상 3포모</small>
        </div>
        <div class="art-card art-card--muted">
          <span>🐉</span>
          <strong>세금 정리</strong>
          <small>보상 3배</small>
        </div>
      </div>
    `;
  }

  if (accent === "focus") {
    return renderStudyRoom({
      level: 4,
      progress: 0.72,
      compact: false,
      frameLabel: "실시간 서재 변화",
      equippedItems: data.user.equippedItems || [],
    });
  }

  return `
    <div class="growth-showcase">
      <div class="growth-showcase__rooms">
        ${[1, 2, 3, 5]
      .map(
        (level) => `
              <div class="growth-mini">
                ${renderStudyRoom({
          level,
          progress: 0.18 + level * 0.12,
          compact: true,
          frameLabel: `Lv.${level}`,
        })}
              </div>
            `
      )
      .join("")}
      </div>
    </div>
  `;
}

function renderHomeView() {
  const activeQuests = getActiveQuests();
  const completedQuests = getCompletedQuests();
  const selectedQuest = getQuestById(runtime.selectedQuestId);
  const today = ensureDailyLog(getLocalDate());
  const goalProgress = Math.min(today.sessionsCompleted, DAILY_GOAL_COUNT);

  return `
    <section class="screen screen--home">
      <div class="hero-card">
        <header class="topbar">
          <div>
            <p class="eyebrow">FOCUSQUEST</p>
            <h1 class="title-large">집중하면 서재가 자랍니다</h1>
          </div>
          <div class="topbar__actions">
            <span class="pill pill--coin">🪙 ${data.user.coins || 0}</span>
            <button class="icon-button" data-action="show-shop" aria-label="상점">🛒</button>
            <button class="icon-button" data-action="show-summary" aria-label="일일 요약">📊</button>
            <button class="icon-button" data-action="show-settings" aria-label="설정">⚙️</button>
          </div>
        </header>

        <div class="hero-grid">
          <section class="panel panel--room">
            <div class="panel__meta">
              <span class="pill">Lv.${data.user.level}</span>
              <span class="pill pill--ghost">${getTitleForLevel(data.user.level)}</span>
            </div>
            ${renderStudyRoom({
    level: data.user.studyRoomLevel,
    progress: getAmbientProgress(data.user.studyRoomLevel),
    compact: false,
    frameLabel: `서재 Lv.${data.user.studyRoomLevel}`,
    equippedItems: data.user.equippedItems || [],
  })}
            <div class="stats-row">
              <article class="stat-chip">
                <span class="stat-chip__label">연속 출석</span>
                <strong>${data.user.streak || 0}일</strong>
              </article>
              <article class="stat-chip">
                <span class="stat-chip__label">누적 세션</span>
                <strong>${data.user.totalSessions}</strong>
              </article>
              <article class="stat-chip">
                <span class="stat-chip__label">누적 XP</span>
                <strong>${data.user.xp}</strong>
              </article>
            </div>
          </section>

          <section class="panel panel--actions">
            <div class="panel__header">
              <div>
                <p class="eyebrow">오늘의 진행</p>
                <h2 class="title-medium">${goalProgress >= DAILY_GOAL_COUNT ? '🔥 오늘 목표 달성!' : goalProgress > 0 ? `${goalProgress}세션 완료, 잘 하고 있어요` : '지금 바로 시작해보세요'}</h2>
              </div>
              <button class="icon-button" data-action="show-guide" aria-label="가이드 다시 보기">📖</button>
            </div>

            <div class="goal-card">
              <div>
                <p class="goal-card__label">일일 목표</p>
                <strong>오늘 ${goalProgress}/${DAILY_GOAL_COUNT} 완료</strong>
              </div>
              <div class="progress-bar">
                <span style="width:${(goalProgress / DAILY_GOAL_COUNT) * 100}%"></span>
              </div>
              <small>하루 3세션을 완료하면 +25 XP를 얻습니다.</small>
            </div>

            <div class="mode-row">
              ${Object.values(MODE_CONFIG)
      .map(
        (mode) => `
                    <button
                      class="mode-button ${mode.id === data.user.preferredMode ? "is-active" : ""}"
                      data-action="select-mode"
                      data-mode="${mode.id}"
                    >
                      <span>${mode.icon}</span>
                      <strong>${mode.shortLabel}</strong>
                      <small>${mode.label}</small>
                    </button>
                  `
      )
      .join("")}
            </div>

            <div class="quest-panel">
              <div class="quest-panel__header">
                <div>
                  <p class="eyebrow">내 퀘스트</p>
                  <h2 class="title-medium">${activeQuests.length > 0 ? "오늘 밀어붙일 작업" : "첫 퀘스트를 만들어보세요"}</h2>
                </div>
                <button class="secondary-button" data-action="toggle-quest-form">
                  ${runtime.showQuestForm ? "닫기" : "+ 새 퀘스트"}
                </button>
              </div>

              ${runtime.showQuestForm || data.quests.length === 0
      ? renderQuestForm()
      : ""
    }

              <div class="quest-list">
                ${activeQuests.length > 0
      ? activeQuests.map((quest) => renderQuestCard(quest, quest.id === runtime.selectedQuestId)).join("")
      : renderEmptyState()
    }
              </div>

              ${completedQuests.length > 0
      ? `
                    <div class="completed-block">
                      <button class="text-button" data-action="toggle-completed">
                        ${runtime.showCompleted ? "완료된 퀘스트 접기" : `완료된 퀘스트 ${completedQuests.length}개 보기`}
                      </button>
                      ${runtime.showCompleted
        ? `
                            <div class="quest-list quest-list--completed">
                              ${completedQuests.map((quest) => renderQuestCard(quest, false)).join("")}
                            </div>
                          `
        : ""
      }
                    </div>
                  `
      : ""
    }
            </div>

            <div class="start-row">
              <button class="primary-button primary-button--large" data-action="start-focus">
                🚀 ${selectedQuest ? `"${escapeHtml(selectedQuest.title)}" 시작` : "빠른 집중 시작"}
              </button>
              <button class="text-button" data-action="clear-quest-selection">
                퀘스트 없이 빠른 집중
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderQuestForm() {
  return `
    <form class="quest-form" data-form="quest">
      <label class="field">
        <span>퀘스트 제목</span>
        <input
          type="text"
          name="quest-title"
          maxlength="40"
          placeholder="예: 논문 읽기"
          value="${escapeAttribute(runtime.questDraft.title)}"
          autofocus
        />
      </label>

      <div class="field">
        <span>예상 포모도로</span>
        <div class="segmented-row">
          ${[1, 2, 3, 4, 5]
      .map(
        (count) => `
                <button
                  type="button"
                  class="chip-button ${runtime.questDraft.targetPomos === count ? "is-active" : ""}"
                  data-action="set-quest-pomos"
                  data-pomos="${count}"
                >
                  ${count}
                </button>
              `
      )
      .join("")}
        </div>
      </div>

      <div class="field">
        <span>타입</span>
        <div class="segmented-row segmented-row--types">
          ${Object.values(QUEST_TYPES)
      .map(
        (type) => `
                <button
                  type="button"
                  class="type-chip type-chip--${type.className} ${runtime.questDraft.type === type.id ? "is-active" : ""}"
                  data-action="set-quest-type"
                  data-type="${type.id}"
                >
                  <span>${type.icon}</span>
                  ${type.shortLabel}
                </button>
              `
      )
      .join("")}
        </div>
      </div>

      <button class="primary-button" type="submit">퀘스트 추가</button>
    </form>
  `;
}

function renderEmptyState() {
  return `
    <article class="empty-state">
      <strong>아직 등록된 퀘스트가 없습니다.</strong>
      <p>작업 이름과 예상 포모 수만 정하면 바로 시작할 수 있습니다.</p>
    </article>
  `;
}

function renderQuestCard(quest, isSelected) {
  const questType = QUEST_TYPES[quest.type];
  const percent = Math.min(100, (quest.completedPomos / quest.targetPomos) * 100);
  const completed = quest.status === "completed";

  return `
    <article class="quest-card ${isSelected ? "is-selected" : ""} ${completed ? "is-completed" : ""}">
      <button
        class="quest-card__main"
        data-action="${completed ? "show-summary" : "select-quest"}"
        data-quest-id="${quest.id}"
      >
        <div class="quest-card__meta">
          <span class="quest-badge quest-badge--${questType.className}">
            ${questType.icon} ${questType.shortLabel}
          </span>
          <strong>${escapeHtml(quest.title)}</strong>
        </div>
        <div class="quest-card__progress">
          <span>${quest.completedPomos}/${quest.targetPomos}</span>
          <div class="progress-bar">
            <span style="width:${percent}%"></span>
          </div>
        </div>
      </button>
      <button
        class="icon-button icon-button--danger"
        data-action="delete-quest"
        data-quest-id="${quest.id}"
        aria-label="퀘스트 삭제"
      >
        ✕
      </button>
    </article>
  `;
}

function renderFocusView() {
  const active = data.activeSession;
  if (!active) {
    runtime.view = "home";
    return renderHomeView();
  }

  const quest = getQuestById(active.questId);
  const questType = quest ? QUEST_TYPES[quest.type] : QUEST_TYPES.sub;
  const focusMinutes = active.duration + active.extensions * 5;
  const progress = getSessionProgress(active);
  const remaining = formatDurationMs(getRemainingMs(active));
  const paused = Boolean(active.pausedAt);
  const prompt = active.state === "prompt" && shouldOfferFlowPrompt(active);
  const rewardPreview = previewCompletionRewards(active);
  const comboPreview = (data.user.todayCombo || 0) + 1;

  return `
    <section class="screen screen--focus">
      <div class="hero-card hero-card--focus">
        <header class="topbar topbar--focus">
          <div>
            <p class="eyebrow">${questType.icon} ${quest ? questType.label : "빠른 집중"}</p>
            <h1 class="title-large">${escapeHtml(quest ? quest.title : "퀘스트 없이 집중 중")}</h1>
          </div>
          <div class="topbar__actions">
            <span class="pill pill--fire">🔥 콤보 ${data.user.todayCombo || 0}</span>
            ${paused ? `<span class="pill pill--ghost">일시정지</span>` : ""}
          </div>
        </header>

        <div class="focus-layout">
          <section class="panel panel--room panel--room-focus">
            ${renderStudyRoom({
    level: data.user.studyRoomLevel,
    progress,
    compact: false,
    frameLabel: `실시간 성장 ${Math.round(progress * 100)}%`,
    equippedItems: data.user.equippedItems || [],
  })}
          </section>

          <section class="panel panel--timer">
            <div
              class="timer-ring"
              data-timer-ring
              style="--ratio:${progress}"
            >
              <div class="timer-ring__inner">
                <span class="timer-ring__value" data-timer-value>${remaining}</span>
                <small>${MODE_CONFIG[active.mode].icon} ${MODE_CONFIG[active.mode].label}</small>
                <strong>${focusMinutes}분 세션</strong>
              </div>
            </div>

            <div class="focus-meta">
              <article class="focus-meta__card">
                <span>예상 보상</span>
                <strong>+${rewardPreview.total} XP</strong>
              </article>
              <article class="focus-meta__card">
                <span>연장 횟수</span>
                <strong>${active.extensions}/3</strong>
              </article>
            </div>

            <div class="control-row">
              <button class="secondary-button" data-action="pause-resume">
                ${paused ? "▶ 재개" : "⏸ 일시정지"}
              </button>
              <button class="ghost-button" data-action="forfeit-session">✕ 포기</button>
            </div>
          </section>
        </div>

        ${prompt
      ? `
              <div class="overlay-card">
                <p class="eyebrow">세션 완료</p>
                <h2 class="title-medium">흐름이 좋으신가요?</h2>
                <p class="body-copy">
                  지금 휴식하면 +${rewardPreview.total}${comboPreview % 3 === 0 ? " + 콤보 보너스" : ""} XP를 받습니다.
                  계속 몰입하고 싶다면 5분 연장할 수 있습니다.
                </p>
                <div class="overlay-card__actions">
                  <button class="primary-button" data-action="flow-extend">+5분 연장</button>
                  <button class="secondary-button" data-action="flow-break">휴식 시작</button>
                </div>
              </div>
            `
      : ""
    }
      </div>
    </section>
  `;
}

function renderBreakView() {
  const breakState = runtime.breakState;
  if (!breakState) {
    runtime.view = "home";
    return renderHomeView();
  }

  const ratio = getBreakProgress();
  const remaining = formatDurationMs(Math.max(0, breakState.endsAt - Date.now()));
  const result = runtime.lastSessionResult;

  return `
    <section class="screen screen--break">
      <div class="hero-card hero-card--break">
        <header class="topbar">
          <div>
            <p class="eyebrow">☕ 휴식 시간</p>
            <h1 class="title-large">한 템포 쉬고 다음 집중으로 넘어갑니다</h1>
          </div>
          <div class="topbar__actions">
            <button class="icon-button" data-action="show-home" aria-label="홈으로">🏠</button>
          </div>
        </header>

        <div class="break-layout">
          <section class="panel panel--timer">
            <div class="timer-ring timer-ring--break" style="--ratio:${ratio}">
              <div class="timer-ring__inner">
                <span class="timer-ring__value">${remaining}</span>
                <small>다음 퀘스트</small>
                <strong>${escapeHtml(breakState.nextQuestTitle)}</strong>
              </div>
            </div>
            <div class="control-row">
              <button class="primary-button" data-action="skip-break">건너뛰고 홈으로</button>
            </div>
          </section>

          <section class="panel panel--summary-snack">
            <p class="eyebrow">이번 세션 결과</p>
            <h2 class="title-medium">${escapeHtml(result.questTitle)}</h2>
            <div class="summary-list">
              <article class="summary-list__item">
                <span>획득 XP</span>
                <strong>+${result.xpEarned}</strong>
              </article>
              <article class="summary-list__item">
                <span>콤보</span>
                <strong>🔥 ${result.combo}</strong>
              </article>
              <article class="summary-list__item">
                <span>서재 레벨</span>
                <strong>Lv.${result.roomLevel}</strong>
              </article>
              <article class="summary-list__item">
                <span>세션 길이</span>
                <strong>${result.actualMinutes}분</strong>
              </article>
            </div>
            ${result.questCompleted
      ? `<p class="highlight-note">퀘스트를 완수했습니다. 진행률이 갱신되었습니다.</p>`
      : ""
    }
            ${result.dailyGoalAchieved
      ? `<p class="highlight-note">일일 목표 3세션을 달성해 추가 보상을 받았습니다.</p>`
      : ""
    }
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderSummaryView() {
  const todayKey = getLocalDate();
  const today = ensureDailyLog(todayKey);
  const todaySessions = data.sessions
    .filter((session) => session.completed && session.date === todayKey)
    .slice()
    .reverse()
    .slice(0, 6);

  return `
    <section class="screen screen--summary">
      <div class="hero-card">
        <header class="topbar">
          <div>
            <p class="eyebrow">📊 오늘의 여정</p>
            <h1 class="title-large">${formatDisplayDate(todayKey)}</h1>
          </div>
          <div class="topbar__actions">
            <button class="icon-button" data-action="show-home" aria-label="홈으로">🏠</button>
          </div>
        </header>

        <div class="summary-grid">
          <section class="panel">
            <div class="summary-list">
              <article class="summary-list__item">
                <span>완료 세션</span>
                <strong>${today.sessionsCompleted}</strong>
              </article>
              <article class="summary-list__item">
                <span>집중 시간</span>
                <strong>${today.totalMinutes}분</strong>
              </article>
              <article class="summary-list__item">
                <span>획득 XP</span>
                <strong>${today.xpEarned}</strong>
              </article>
              <article class="summary-list__item">
                <span>완료 퀘스트</span>
                <strong>${today.questsCompleted}</strong>
              </article>
              <article class="summary-list__item">
                <span>최대 콤보</span>
                <strong>${today.maxCombo}</strong>
              </article>
            </div>
          </section>

          <section class="panel">
            <p class="eyebrow">서재 성장</p>
            <h2 class="title-medium">Lv.${data.user.studyRoomLevel} ${getTitleForLevel(data.user.level)}</h2>
            ${renderStudyRoom({
    level: data.user.studyRoomLevel,
    progress: getAmbientProgress(data.user.studyRoomLevel),
    compact: false,
    frameLabel: "오늘의 서재",
    equippedItems: data.user.equippedItems || [],
  })}
          </section>
        </div>

        <section class="panel panel--history">
          <p class="eyebrow">최근 완료 세션</p>
          <div class="history-list">
            ${todaySessions.length > 0
      ? todaySessions
        .map(
          (session) => `
                        <article class="history-item">
                          <div>
                            <strong>${escapeHtml(getSessionQuestTitle(session))}</strong>
                            <small>${MODE_CONFIG[session.mode].label} · ${session.actualMinutes}분</small>
                          </div>
                          <span>+${session.xpEarned} XP</span>
                        </article>
                      `
        )
        .join("")
      : `<p class="body-copy">아직 완료한 세션이 없습니다.</p>`
    }
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderSettingsView() {
  return `
    <section class="screen screen--settings">
      <div class="hero-card">
        <header class="topbar">
          <div>
            <p class="eyebrow">⚙️ 설정</p>
            <h1 class="title-large">앱 흐름을 정리하거나 다시 시작할 수 있습니다</h1>
          </div>
          <div class="topbar__actions">
            <button class="icon-button" data-action="show-home" aria-label="홈으로">🏠</button>
          </div>
        </header>

        <div class="settings-grid">
          <section class="panel">
            <p class="eyebrow">온보딩</p>
            <h2 class="title-medium">가이드를 다시 열기</h2>
            <p class="body-copy">처음 플로우를 다시 보고 싶다면 언제든지 온보딩을 실행할 수 있습니다.</p>
            <div class="control-row">
              <button class="primary-button" data-action="show-guide">가이드 보기</button>
              <button class="secondary-button" data-action="reset-guide">첫 방문 상태로 되돌리기</button>
            </div>
          </section>

          <section class="panel">
            <p class="eyebrow">데이터</p>
            <h2 class="title-medium">모든 기록 초기화</h2>
            <p class="body-copy">퀘스트, 세션, 서재 성장 상태, 온보딩 플래그를 모두 삭제합니다.</p>
            <div class="control-row">
              <button class="ghost-button ghost-button--danger" data-action="reset-all-data">
                전체 초기화
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderBossReviewView() {
  const result = runtime.lastSessionResult;
  if (!result) {
    runtime.view = "home";
    return renderHomeView();
  }

  const satisfactionEmojis = [
    { value: 1, emoji: "😤", label: "별로" },
    { value: 2, emoji: "😐", label: "보통" },
    { value: 3, emoji: "🙂", label: "괜찮음" },
    { value: 4, emoji: "😊", label: "좋음" },
    { value: 5, emoji: "🔥", label: "최고" },
  ];

  return `
    <section class="screen screen--boss-review">
      <div class="hero-card hero-card--boss">
        <header class="topbar">
          <div>
            <p class="eyebrow">🐉 보스 퀘스트 클리어!</p>
            <h1 class="title-large">${escapeHtml(result.questTitle)}</h1>
          </div>
        </header>

        <div class="boss-review-layout">
          <section class="panel">
            <div class="summary-list">
              <article class="summary-list__item">
                <span>획득 XP</span>
                <strong>+${result.xpEarned}</strong>
              </article>
              <article class="summary-list__item">
                <span>획득 코인</span>
                <strong>🪙 +${result.coinsEarned}</strong>
              </article>
              <article class="summary-list__item">
                <span>세션 길이</span>
                <strong>${result.actualMinutes}분</strong>
              </article>
              <article class="summary-list__item">
                <span>콤보</span>
                <strong>🔥 ${result.combo}</strong>
              </article>
            </div>
          </section>

          <section class="panel panel--review-form">
            <p class="eyebrow">셀프 리뷰</p>
            <h2 class="title-medium">이번 세션에서 뭘 했나요?</h2>
            <textarea
              class="review-textarea"
              data-review-text
              placeholder="예: 3장 초안 완성, 참고 문헌 추가..."
              rows="3"
            >${escapeHtml(runtime.reviewDraft.text)}</textarea>

            <p class="eyebrow" style="margin-top:16px;">만족도</p>
            <div class="satisfaction-row">
              ${satisfactionEmojis.map(s => `
                <button
                  class="satisfaction-btn ${runtime.reviewDraft.satisfaction === s.value ? "is-active" : ""}"
                  data-action="set-satisfaction"
                  data-value="${s.value}"
                  aria-label="${s.label}"
                >${s.emoji}</button>
              `).join("")}
            </div>

            <div class="control-row" style="margin-top:20px;">
              <button class="primary-button" data-action="submit-boss-review">기록 저장하고 휴식 →</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderShopView() {
  const coins = data.user.coins || 0;
  const owned = data.user.ownedItems || [];
  const equipped = data.user.equippedItems || [];
  const cat = runtime.shopCategory;

  const filtered = cat === "all"
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(item => item.category === cat);

  return `
    <section class="screen screen--shop">
      <div class="hero-card">
        <header class="topbar">
          <div>
            <p class="eyebrow">🛒 상점</p>
            <h1 class="title-large">서재를 꾸며보세요</h1>
          </div>
          <div class="topbar__actions">
            <span class="pill pill--coin">🪙 ${coins}</span>
            <button class="icon-button" data-action="show-home" aria-label="홈으로">🏠</button>
          </div>
        </header>

        <div class="shop-categories">
          ${SHOP_CATEGORIES.map(c => `
            <button
              class="pill ${cat === c.id ? "pill--active" : ""}"
              data-action="shop-category"
              data-category="${c.id}"
            >${c.label}</button>
          `).join("")}
        </div>

        <div class="shop-grid">
          ${filtered.map(item => {
    const isOwned = owned.includes(item.id);
    const isEquipped = equipped.includes(item.id);
    const canBuy = !isOwned && coins >= item.price && !item.bossUnlock;
    const isBossLocked = item.bossUnlock && !isOwned;

    return `
              <article class="shop-card ${isOwned ? "shop-card--owned" : ""} ${isEquipped ? "shop-card--equipped" : ""}">
                <div class="shop-card__icon">${item.icon}</div>
                <strong class="shop-card__name">${item.name}</strong>
                <span class="shop-card__price">
                  ${isBossLocked ? "🐉 보스 클리어" : isOwned ? (isEquipped ? "✅ 배치중" : "보유중") : `🪙 ${item.price}`}
                </span>
                ${isOwned && !isEquipped ? `
                  <button class="ghost-button" data-action="equip-item" data-item-id="${item.id}">배치</button>
                ` : ""}
                ${isOwned && isEquipped ? `
                  <button class="ghost-button" data-action="unequip-item" data-item-id="${item.id}">해제</button>
                ` : ""}
                ${canBuy ? `
                  <button class="primary-button" data-action="buy-item" data-item-id="${item.id}">구매</button>
                ` : ""}
              </article>
            `;
  }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderStudyRoom({ level, progress, compact, frameLabel, equippedItems }) {
  const eq = equippedItems || [];
  const p = progress;
  const lightAlpha = 0.18 + p * 0.72;
  const glowSize = 40 + p * 70;

  // 하늘 색상 (밤 → 새벽 → 낮)
  const skyH = Math.round(260 - p * 210);
  const skyS = Math.round(55 + p * 10);
  const skyL = Math.round(14 + p * 22);
  const skyH2 = Math.round(230 - p * 35);
  const skyL2 = Math.round(9 + p * 26);

  // 램프 불 밝기
  const lampGlow = `hsla(42,100%,72%,${(0.12 + p * 0.72).toFixed(2)})`;
  const lampCore = `hsla(42,100%,82%,${(0.3 + p * 0.65).toFixed(2)})`;

  const showShelf = level >= 3;
  const showWindow = level >= 4;
  const showBooks = p > 0.35 || level >= 2;
  const showPaper = p > 0.15;
  const showStack = p > 0.58;
  const showRug = level >= 3;
  const showPlant = level >= 4;
  const showFire = level >= 5;
  const showCat = level >= 5 && p > 0.55;

  const h = compact ? 160 : 320;

  return `
    <div
      class="study-room ${compact ? "study-room--compact" : ""}"
      data-level="${level}"
      style="--progress:${p}; --light-level:${lightAlpha};"
    >
      <svg
        class="room-svg"
        viewBox="0 0 400 ${h}"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <!-- 조명 그라디언트 -->
          <radialGradient id="lampGlow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stop-color="${lampCore}"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
          <radialGradient id="ceilingLight" cx="50%" cy="0%" r="60%">
            <stop offset="0%" stop-color="hsla(42,100%,78%,${(p * 0.28).toFixed(2)})"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
          <!-- 하늘 그라디언트 -->
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(${skyH} ${skyS}% ${skyL}%)"/>
            <stop offset="100%" stop-color="hsl(${skyH2} 38% ${skyL2}%)"/>
          </linearGradient>
          <!-- 바닥 그라디언트 -->
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(30 24% 22%)"/>
            <stop offset="100%" stop-color="hsl(28 20% 14%)"/>
          </linearGradient>
          <!-- 책상 상판 -->
          <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(31 36% 38%)"/>
            <stop offset="100%" stop-color="hsl(29 30% 22%)"/>
          </linearGradient>
          <!-- 클립 별 영역 -->
          <clipPath id="skyClip">
            <rect x="0" y="0" width="400" height="${Math.round(h * 0.62)}"/>
          </clipPath>
        </defs>

        <!-- ① 하늘 배경 -->
        <rect x="0" y="0" width="400" height="${Math.round(h * 0.62)}" fill="url(#skyGrad)"/>

        <!-- ② 별 (밤에만 보임) -->
        ${p < 0.85 ? `
        <g opacity="${(0.55 - p * 0.52).toFixed(2)}" clip-path="url(#skyClip)">
          ${[[38, 18], [82, 42], [130, 12], [178, 30], [224, 8], [270, 38], [318, 16], [358, 44],
      [56, 58], [108, 72], [164, 54], [210, 68], [260, 50], [306, 74], [350, 28]].map(([cx, cy]) =>
        `<circle cx="${cx}" cy="${cy}" r="${1 + Math.random()}" fill="white"/>`
      ).join("")}
        </g>` : ""}

        <!-- ③ 달 (초기에만 표시) -->
        ${p < 0.5 ? `
        <circle cx="52" cy="36" r="${12 - p * 10}" fill="hsl(50 40% 88%)" opacity="${(0.7 - p * 0.8).toFixed(2)}"/>
        <circle cx="60" cy="30" r="${10 - p * 8}" fill="hsl(${skyH} ${skyS}% ${skyL}%)" opacity="${(0.7 - p * 0.8).toFixed(2)}"/>
        ` : ""}

        <!-- ④ 창문 (레벨 4+) -->
        ${showWindow ? `
        <g opacity="${Math.min(1, (level - 3) * 0.8).toFixed(2)}">
          <rect x="288" y="28" width="80" height="100" rx="10" fill="hsl(210 60% ${Math.round(24 + p * 30)}%)" stroke="hsl(30 20% 28%)" stroke-width="6"/>
          <line x1="328" y1="28" x2="328" y2="128" stroke="hsl(30 20% 28%)" stroke-width="3"/>
          <line x1="288" y1="78" x2="368" y2="78" stroke="hsl(30 20% 28%)" stroke-width="3"/>
          ${p > 0.4 ? `<circle cx="352" cy="48" r="18" fill="hsla(42,100%,78%,${(p * 0.5).toFixed(2)})" filter="url(#blur)"/>` : ""}
        </g>
        ` : ""}

        <!-- ⑤ 책장 (레벨 3+) -->
        ${showShelf ? `
        <g opacity="${Math.min(1, (level - 2) * 0.9).toFixed(2)}">
          <rect x="22" y="${Math.round(h * 0.06)}" width="110" height="88" rx="8" fill="hsl(32 22% 20%)" stroke="hsl(30 18% 28%)" stroke-width="1.5"/>
          <!-- 선반 -->
          <rect x="22" y="${Math.round(h * 0.06 + 28)}" width="110" height="4" rx="2" fill="hsl(30 18% 28%)"/>
          <rect x="22" y="${Math.round(h * 0.06 + 56)}" width="110" height="4" rx="2" fill="hsl(30 18% 28%)"/>
          <!-- 책들 - 위 칸 -->
          <rect x="28" y="${Math.round(h * 0.06 + 6)}" width="10" height="20" rx="2" fill="hsl(206 66% 56%)"/>
          <rect x="40" y="${Math.round(h * 0.06 + 4)}" width="12" height="22" rx="2" fill="hsl(142 50% 52%)"/>
          <rect x="54" y="${Math.round(h * 0.06 + 8)}" width="8"  height="18" rx="2" fill="hsl(34 90% 62%)"/>
          <rect x="64" y="${Math.round(h * 0.06 + 5)}" width="11" height="21" rx="2" fill="hsl(0 65% 58%)"/>
          <rect x="77" y="${Math.round(h * 0.06 + 7)}" width="9"  height="19" rx="2" fill="hsl(280 50% 56%)"/>
          <!-- 책들 - 아래 칸 -->
          <rect x="28" y="${Math.round(h * 0.06 + 34)}" width="13" height="20" rx="2" fill="hsl(34 90% 62%)"/>
          <rect x="43" y="${Math.round(h * 0.06 + 32)}" width="10" height="22" rx="2" fill="hsl(206 66% 56%)"/>
          <rect x="55" y="${Math.round(h * 0.06 + 36)}" width="9"  height="18" rx="2" fill="hsl(142 50% 52%)"/>
          <rect x="66" y="${Math.round(h * 0.06 + 33)}" width="14" height="21" rx="2" fill="hsl(0 65% 58%)"/>
        </g>
        ` : ""}

        <!-- ⑥ 조명 글로우 (진행도에 따라 밝아짐) -->
        <ellipse cx="200" cy="${Math.round(h * 0.44)}" rx="${glowSize}" ry="${glowSize * 0.45}" fill="${lampGlow}"/>

        <!-- ⑦ 바닥 -->
        <rect x="0" y="${Math.round(h * 0.66)}" width="400" height="${Math.round(h * 0.34)}" fill="url(#floorGrad)"/>

        <!-- ⑧ 깔개 (레벨 3+) -->
        ${showRug ? `
        <ellipse cx="200" cy="${Math.round(h * 0.78)}" rx="130" ry="22" fill="hsla(16 80% 52% / 0.22)" stroke="hsla(16 80% 52% / 0.38)" stroke-width="1"/>
        ` : ""}

        <!-- ⑨ 스탠드 조명 -->
        <!-- 기둥 -->
        <rect x="194" y="${Math.round(h * 0.42)}" width="12" height="${Math.round(h * 0.24)}" rx="5" fill="hsl(30 24% 32%)"/>
        <!-- 받침 -->
        <rect x="182" y="${Math.round(h * 0.65)}" width="36" height="6" rx="4" fill="hsl(30 20% 26%)"/>
        <!-- 갓 (사다리꼴, 램프 갓 크기 축소) -->
        <polygon
          points="180,${Math.round(h * 0.42)} 220,${Math.round(h * 0.42)} 210,${Math.round(h * 0.50)} 190,${Math.round(h * 0.50)}"
          fill="hsl(38 24% 26%)"
          stroke="hsl(36 20% 38%)"
          stroke-width="1.5"
        />
        <!-- 램프 빛 (전구) -->
        <ellipse cx="200" cy="${Math.round(h * 0.50)}" rx="12" ry="5" fill="${lampCore}"/>

        <!-- ⑩ 책상 상판 -->
        <rect x="88" y="${Math.round(h * 0.64)}" width="224" height="18" rx="8" fill="url(#deskGrad)" stroke="hsl(30 18% 38%)" stroke-width="1"/>
        <!-- 책상 다리 왼쪽 -->
        <rect x="100" y="${Math.round(h * 0.68)}" width="10" height="${Math.round(h * 0.16)}" rx="4" fill="hsl(30 18% 24%)"/>
        <!-- 책상 다리 오른쪽 -->
        <rect x="290" y="${Math.round(h * 0.68)}" width="10" height="${Math.round(h * 0.16)}" rx="4" fill="hsl(30 18% 24%)"/>

        <!-- ⑪ 의자 (책상 오른쪽) -->
        ${eq.includes("cushion_chair") ? `
        <!-- 쿠션 의자 (업그레이드) -->
        <rect x="294" y="${Math.round(h * 0.52)}" width="44" height="56" rx="10" fill="hsl(340 45% 42%)" stroke="hsl(340 35% 50%)" stroke-width="1.5"/>
        <rect x="286" y="${Math.round(h * 0.60)}" width="58" height="14" rx="8" fill="hsl(340 50% 48%)" stroke="hsl(340 40% 55%)" stroke-width="1"/>
        <ellipse cx="315" cy="${Math.round(h * 0.58)}" rx="16" ry="6" fill="hsl(340 55% 56%)"/>
        <rect x="296" y="${Math.round(h * 0.68)}" width="8" height="${Math.round(h * 0.14)}" rx="3" fill="hsl(340 30% 30%)"/>
        <rect x="330" y="${Math.round(h * 0.68)}" width="8" height="${Math.round(h * 0.14)}" rx="3" fill="hsl(340 30% 30%)"/>
        ` : `
        <!-- 기본 의자 -->
        <rect x="294" y="${Math.round(h * 0.52)}" width="44" height="56" rx="10" fill="hsl(225 16% 34%)" stroke="hsl(225 14% 42%)" stroke-width="1.5"/>
        <rect x="286" y="${Math.round(h * 0.60)}" width="58" height="14" rx="8" fill="hsl(225 18% 40%)" stroke="hsl(225 14% 48%)" stroke-width="1"/>
        <rect x="296" y="${Math.round(h * 0.68)}" width="8" height="${Math.round(h * 0.14)}" rx="3" fill="hsl(225 12% 28%)"/>
        <rect x="330" y="${Math.round(h * 0.68)}" width="8" height="${Math.round(h * 0.14)}" rx="3" fill="hsl(225 12% 28%)"/>
        `}

        <!-- ⑫ 책 (책상 위, 진행도에 따라 등장) -->
        ${showBooks ? `
        <g style="opacity:${Math.min(1, (p - 0.2) * 3).toFixed(2)}; transition: opacity 0.8s ease;">
          <rect x="112" y="${Math.round(h * 0.58)}" width="9"  height="64" rx="2" fill="hsl(206 60% 52%)" transform="rotate(-4,${Math.round(112 + 4)} ${Math.round(h * 0.58 + 32)})"/>
          <rect x="123" y="${Math.round(h * 0.60)}" width="8"  height="60" rx="2" fill="hsl(142 50% 46%)" transform="rotate(-1,${Math.round(123 + 4)} ${Math.round(h * 0.60 + 30)})"/>
          <rect x="133" y="${Math.round(h * 0.59)}" width="10" height="63" rx="2" fill="hsl(34 88% 56%)"  transform="rotate(2,${Math.round(133 + 5)} ${Math.round(h * 0.59 + 31)})"/>
        </g>
        ` : ""}

        <!-- ⑬ 종이 (책상 위, 초반부터 등장) -->
        ${showPaper ? `
        <g style="opacity:${Math.min(1, (p - 0.05) * 4).toFixed(2)}; transition: opacity 0.8s ease;">
          <rect x="218" y="${Math.round(h * 0.60)}" width="52" height="60" rx="3" fill="hsl(42 28% 88%)" stroke="hsl(40 15% 72%)" stroke-width="1"/>
          <!-- 줄 -->
          <line x1="226" y1="${Math.round(h * 0.64)}" x2="262" y2="${Math.round(h * 0.64)}" stroke="hsl(220 20% 72%)" stroke-width="1.5"/>
          <line x1="226" y1="${Math.round(h * 0.68)}" x2="258" y2="${Math.round(h * 0.68)}" stroke="hsl(220 20% 72%)" stroke-width="1.5"/>
          <line x1="226" y1="${Math.round(h * 0.72)}" x2="260" y2="${Math.round(h * 0.72)}" stroke="hsl(220 20% 72%)" stroke-width="1.5"/>
        </g>
        ` : ""}

        <!-- ⑭ 쌓인 책들 (후반 등장) -->
        ${showStack ? `
        <g style="opacity:${Math.min(1, (p - 0.5) * 4).toFixed(2)}; transition: opacity 0.8s ease;">
          <rect x="152" y="${Math.round(h * 0.615)}" width="54" height="11" rx="3" fill="hsl(34 88% 56%)"/>
          <rect x="148" y="${Math.round(h * 0.593)}" width="58" height="11" rx="3" fill="hsl(206 60% 52%)"/>
          <rect x="152" y="${Math.round(h * 0.571)}" width="52" height="11" rx="3" fill="hsl(142 50% 46%)"/>
        </g>
        ` : ""}

        <!-- ⑮ 화분 (레벨 4+) -->
        ${showPlant ? `
        <g opacity="${Math.min(1, (level - 3) * 0.9).toFixed(2)}">
          <!-- 잎 -->
          <ellipse cx="76" cy="${Math.round(h * 0.52)}" rx="18" ry="24" fill="hsl(142 60% 38%)" transform="rotate(-18,76,${Math.round(h * 0.52)})"/>
          <ellipse cx="88" cy="${Math.round(h * 0.50)}" rx="16" ry="22" fill="hsl(142 56% 44%)" transform="rotate(12,88,${Math.round(h * 0.50)})"/>
          <ellipse cx="64" cy="${Math.round(h * 0.51)}" rx="14" ry="18" fill="hsl(142 52% 42%)" transform="rotate(-28,64,${Math.round(h * 0.51)})"/>
          <!-- 화분 -->
          <path d="M68 ${Math.round(h * 0.60)} L84 ${Math.round(h * 0.60)} L82 ${Math.round(h * 0.66)} L70 ${Math.round(h * 0.66)} Z" fill="hsl(16 70% 44%)"/>
          <rect x="66" y="${Math.round(h * 0.59)}" width="20" height="4" rx="2" fill="hsl(16 68% 50%)"/>
        </g>
        ` : ""}

        <!-- ⑯ 벽난로 (레벨 5+) -->
        ${showFire ? `
        <g opacity="${Math.min(1, (level - 4) * 1.2).toFixed(2)}">
          <rect x="20" y="${Math.round(h * 0.44)}" width="88" height="${Math.round(h * 0.22)}" rx="8" fill="hsl(30 18% 22%)" stroke="hsl(30 18% 30%)" stroke-width="1.5"/>
          <rect x="34" y="${Math.round(h * 0.50)}" width="60" height="${Math.round(h * 0.14)}" rx="4" fill="hsl(0 0% 8%)"/>
          <!-- 불꽃 -->
          <ellipse cx="64" cy="${Math.round(h * 0.60)}" rx="20" ry="16" fill="hsla(26,100%,62%,0.75)"/>
          <ellipse cx="64" cy="${Math.round(h * 0.58)}" rx="12" ry="12" fill="hsla(42,100%,72%,0.6)"/>
          <ellipse cx="64" cy="${Math.round(h * 0.56)}" rx="6"  ry="8"  fill="hsla(54,100%,86%,0.5)"/>
        </g>
        ` : ""}

        <!-- ⑰ 고양이 (레벨 5 + 진행 55%+) -->
        ${showCat ? `
        <g style="opacity:${Math.min(1, (p - 0.5) * 4).toFixed(2)}; transition: opacity 1s ease;">
          <!-- 몸 -->
          <ellipse cx="116" cy="${Math.round(h * 0.62)}" rx="18" ry="13" fill="hsl(32 38% 62%)"/>
          <!-- 머리 -->
          <circle cx="134" cy="${Math.round(h * 0.60)}" r="13" fill="hsl(32 38% 62%)"/>
          <!-- 귀 -->
          <polygon points="126,${Math.round(h * 0.54)} 130,${Math.round(h * 0.62)} 134,${Math.round(h * 0.54)}" fill="hsl(32 38% 62%)"/>
          <polygon points="134,${Math.round(h * 0.54)} 138,${Math.round(h * 0.62)} 142,${Math.round(h * 0.54)}" fill="hsl(32 38% 62%)"/>
          <!-- 눈 (감고 있음) -->
          <path d="M128 ${Math.round(h * 0.60)} Q130 ${Math.round(h * 0.58)} 132 ${Math.round(h * 0.60)}" fill="none" stroke="hsl(30 20% 32%)" stroke-width="1.5"/>
          <path d="M136 ${Math.round(h * 0.60)} Q138 ${Math.round(h * 0.58)} 140 ${Math.round(h * 0.60)}" fill="none" stroke="hsl(30 20% 32%)" stroke-width="1.5"/>
          <!-- 꼬리 -->
          <path d="M98 ${Math.round(h * 0.62)} Q82 ${Math.round(h * 0.56)} 88 ${Math.round(h * 0.68)}" fill="none" stroke="hsl(32 38% 58%)" stroke-width="6" stroke-linecap="round"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 커피잔 (책상 왼쪽) -->
        ${eq.includes("coffee_mug") ? `
        <g>
          <rect x="108" y="${Math.round(h * 0.59)}" width="14" height="16" rx="3" fill="hsl(30 50% 88%)" stroke="hsl(30 30% 60%)" stroke-width="1"/>
          <path d="M122 ${Math.round(h * 0.61)} Q128 ${Math.round(h * 0.63)} 122 ${Math.round(h * 0.67)}" fill="none" stroke="hsl(30 30% 60%)" stroke-width="1.5"/>
          <ellipse cx="115" cy="${Math.round(h * 0.58)}" rx="4" ry="2" fill="hsla(30,50%,50%,0.5)"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 지구본 (책상 오른쪽) -->
        ${eq.includes("globe") ? `
        <g>
          <rect x="258" y="${Math.round(h * 0.61)}" width="2" height="14" fill="hsl(30 20% 40%)"/>
          <circle cx="259" cy="${Math.round(h * 0.55)}" r="10" fill="hsl(210 60% 45%)" stroke="hsl(30 20% 40%)" stroke-width="1.5"/>
          <path d="M252 ${Math.round(h * 0.55)} Q259 ${Math.round(h * 0.50)} 266 ${Math.round(h * 0.55)}" fill="none" stroke="hsl(142 50% 50%)" stroke-width="2"/>
          <line x1="259" y1="${Math.round(h * 0.45)}" x2="259" y2="${Math.round(h * 0.65)}" stroke="hsla(0,0%,100%,0.15)" stroke-width="0.5"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 작은 화분 (바닥 왼쪽) -->
        ${eq.includes("small_plant") ? `
        <g>
          <ellipse cx="52" cy="${Math.round(h * 0.62)}" rx="10" ry="14" fill="hsl(142 55% 40%)" transform="rotate(-12,52,${Math.round(h * 0.62)})"/>
          <ellipse cx="60" cy="${Math.round(h * 0.61)}" rx="8" ry="12" fill="hsl(142 50% 46%)" transform="rotate(10,60,${Math.round(h * 0.61)})"/>
          <path d="M48 ${Math.round(h * 0.70)} L64 ${Math.round(h * 0.70)} L62 ${Math.round(h * 0.76)} L50 ${Math.round(h * 0.76)} Z" fill="hsl(16 65% 46%)"/>
          <rect x="46" y="${Math.round(h * 0.69)}" width="20" height="4" rx="2" fill="hsl(16 60% 52%)"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 풍경 액자 (벽 왼쪽) -->
        ${eq.includes("frame_art") ? `
        <g>
          <rect x="30" y="${Math.round(h * 0.28)}" width="50" height="38" rx="3" fill="hsl(30 18% 24%)" stroke="hsl(36 30% 45%)" stroke-width="2"/>
          <rect x="35" y="${Math.round(h * 0.30)}" width="40" height="28" rx="1" fill="hsl(200 50% 35%)"/>
          <ellipse cx="55" cy="${Math.round(h * 0.38)}" rx="12" ry="6" fill="hsl(142 40% 38%)"/>
          <circle cx="62" cy="${Math.round(h * 0.32)}" r="4" fill="hsl(50 80% 75%)"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 네온사인 (벽 중앙) -->
        ${eq.includes("neon_sign") ? `
        <g>
          <text x="200" y="${Math.round(h * 0.22)}" text-anchor="middle" font-size="18" font-weight="bold" fill="hsl(280 100% 75%)" style="filter:drop-shadow(0 0 6px hsla(280,100%,65%,0.6));">FOCUS</text>
        </g>
        ` : ""}

        <!-- 상점 아이템: 고양이 (바닥 우측) -->
        ${eq.includes("cat_pet") ? `
        <g>
          <ellipse cx="348" cy="${Math.round(h * 0.73)}" rx="16" ry="11" fill="hsl(32 38% 62%)"/>
          <circle cx="362" cy="${Math.round(h * 0.71)}" r="11" fill="hsl(32 38% 62%)"/>
          <polygon points="354,${Math.round(h * 0.66)} 358,${Math.round(h * 0.72)} 362,${Math.round(h * 0.66)}" fill="hsl(32 38% 62%)"/>
          <polygon points="362,${Math.round(h * 0.66)} 366,${Math.round(h * 0.72)} 370,${Math.round(h * 0.66)}" fill="hsl(32 38% 62%)"/>
          <path d="M356 ${Math.round(h * 0.71)} Q358 ${Math.round(h * 0.69)} 360 ${Math.round(h * 0.71)}" fill="none" stroke="hsl(30 20% 32%)" stroke-width="1.5"/>
          <path d="M364 ${Math.round(h * 0.71)} Q366 ${Math.round(h * 0.69)} 368 ${Math.round(h * 0.71)}" fill="none" stroke="hsl(30 20% 32%)" stroke-width="1.5"/>
          <path d="M332 ${Math.round(h * 0.73)} Q320 ${Math.round(h * 0.68)} 326 ${Math.round(h * 0.78)}" fill="none" stroke="hsl(32 38% 58%)" stroke-width="5" stroke-linecap="round"/>
        </g>
        ` : ""}

        <!-- 상점 아이템: 보스 트로피 (선반 위) -->
        ${eq.includes("boss_trophy") ? `
        <g>
          <rect x="358" y="${Math.round(h * 0.38)}" width="20" height="4" rx="2" fill="hsl(42 80% 52%)"/>
          <path d="M362 ${Math.round(h * 0.38)} L362 ${Math.round(h * 0.32)} Q368 ${Math.round(h * 0.28)} 374 ${Math.round(h * 0.32)} L374 ${Math.round(h * 0.38)}" fill="hsl(42 80% 58%)" stroke="hsl(42 70% 42%)" stroke-width="1"/>
          <rect x="365" y="${Math.round(h * 0.38)}" width="6" height="6" rx="1" fill="hsl(42 70% 42%)"/>
        </g>
        ` : ""}

        <!-- 천장 조명 오버레이 (전체 공간이 밝아지는 효과) -->
        <rect x="0" y="0" width="400" height="${h}" fill="url(#ceilingLight)" pointer-events="none"/>
      </svg>
      <div class="study-room__label">${escapeHtml(frameLabel)}</div>
    </div>
  `;
}

function renderToast() {
  if (!runtime.toastMessage) {
    return "";
  }
  return `<div class="toast">${escapeHtml(runtime.toastMessage)}</div>`;
}

function syncLiveLoops() {
  cancelAnimationFrame(runtime.rafId);
  runtime.rafId = 0;

  if (runtime.breakIntervalId) {
    clearInterval(runtime.breakIntervalId);
    runtime.breakIntervalId = 0;
  }

  if (runtime.view === "focus" && data.activeSession) {
    const loop = () => {
      if (runtime.view !== "focus" || !data.activeSession) {
        return;
      }

      const active = data.activeSession;
      if (active.state !== "paused" && active.state !== "prompt" && getRemainingMs(active) <= 0) {
        if (shouldOfferFlowPrompt(active)) {
          active.state = "prompt";
          persistDomain("activeSession");
          render();
          return;
        }

        const result = finalizeActiveSession();
        if (result) {
          startBreak(result);
        } else {
          runtime.view = "home";
          render();
        }
        return;
      }

      syncFocusDom();
      runtime.rafId = requestAnimationFrame(loop);
    };

    runtime.rafId = requestAnimationFrame(loop);
  }

  if (runtime.view === "break" && runtime.breakState) {
    runtime.breakIntervalId = window.setInterval(() => {
      if (runtime.view !== "break" || !runtime.breakState) {
        clearInterval(runtime.breakIntervalId);
        runtime.breakIntervalId = 0;
        return;
      }

      if (runtime.breakState.endsAt <= Date.now()) {
        finishBreak(false);
        return;
      }

      syncBreakDom();
    }, 250);
  }
}

function syncFocusDom() {
  const active = data.activeSession;
  if (!active || runtime.view !== "focus") {
    return;
  }

  const timerValue = root.querySelector("[data-timer-value]");
  const timerRing = root.querySelector("[data-timer-ring]");
  const remaining = formatDurationMs(getRemainingMs(active));
  const progress = getSessionProgress(active);

  if (timerValue) {
    timerValue.textContent = remaining;
  }

  if (timerRing) {
    timerRing.style.setProperty("--ratio", progress);
  }

  // SVG 서재: 진행도가 3% 이상 바뀔 때만 교체 (성능 최적화)
  const roomWrapper = root.querySelector(".panel--room-focus");
  if (roomWrapper) {
    const lastP = parseFloat(roomWrapper.dataset.lastProgress || "0");
    if (Math.abs(progress - lastP) >= 0.03) {
      roomWrapper.dataset.lastProgress = progress;
      roomWrapper.innerHTML = renderStudyRoom({
        level: data.user.studyRoomLevel,
        progress,
        compact: false,
        frameLabel: `실시간 성장 ${Math.round(progress * 100)}%`,
        equippedItems: data.user.equippedItems || [],
      });
    }
  }
}

function syncBreakDom() {
  if (!runtime.breakState || runtime.view !== "break") {
    return;
  }

  const timerValue = root.querySelector(".timer-ring__value");
  const timerRing = root.querySelector(".timer-ring");
  if (!timerValue || !timerRing) {
    return;
  }

  timerValue.textContent = formatDurationMs(runtime.breakState.endsAt - Date.now());
  timerRing.style.setProperty("--ratio", getBreakProgress());
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    if (runtime.view === "focus" && data.activeSession) {
      if (getRemainingMs(data.activeSession) <= 0) {
        if (shouldOfferFlowPrompt(data.activeSession)) {
          data.activeSession.state = "prompt";
          persistDomain("activeSession");
        } else {
          const result = finalizeActiveSession();
          if (result) {
            startBreak(result);
            return;
          }
        }
      }
      render();
    }

    if (runtime.view === "break" && runtime.breakState) {
      if (runtime.breakState.endsAt <= Date.now()) {
        finishBreak(false);
      } else {
        render();
      }
    }
  }
}

function showToast(message) {
  runtime.toastMessage = message;
  if (runtime.toastTimerId) {
    window.clearTimeout(runtime.toastTimerId);
  }
  runtime.toastTimerId = window.setTimeout(() => {
    runtime.toastMessage = "";
    render();
  }, 2200);
}

function persistAll() {
  persistDomain("user");
  persistDomain("quests");
  persistDomain("sessions");
  persistDomain("dailyLogs");
  persistDomain("activeSession");
  persistDomain("ui");
}

function persistDomain(domain) {
  switch (domain) {
    case "user":
      StorageService.set(STORAGE_KEYS.user, data.user);
      break;
    case "quests":
      StorageService.set(STORAGE_KEYS.quests, data.quests);
      break;
    case "sessions":
      StorageService.set(STORAGE_KEYS.sessions, data.sessions);
      break;
    case "dailyLogs":
      StorageService.set(STORAGE_KEYS.dailyLogs, data.dailyLogs);
      break;
    case "activeSession":
      StorageService.set(STORAGE_KEYS.activeSession, data.activeSession);
      break;
    case "ui":
      StorageService.set(STORAGE_KEYS.ui, data.ui);
      break;
    default:
      break;
  }
}

function resetAllData() {
  Object.values(STORAGE_KEYS).forEach((key) => StorageService.remove(key));
  StorageService.set(STORAGE_KEYS.schema, CURRENT_SCHEMA);

  data.user = createDefaultUser();
  data.quests = [];
  data.sessions = [];
  data.dailyLogs = {};
  data.activeSession = null;
  data.ui = createDefaultUi();

  runtime.view = "guide";
  runtime.selectedQuestId = null;
  runtime.showQuestForm = true;
  runtime.questDraft = createQuestDraft();
  runtime.showCompleted = false;
  runtime.guideIndex = 0;
  runtime.breakState = null;
  runtime.lastSessionResult = null;

  applyDailyReset();
  persistAll();
}

function getBreakProgress() {
  if (!runtime.breakState) {
    return 0;
  }

  const elapsed = Date.now() - runtime.breakState.startedAt;
  const total = runtime.breakState.duration * 60 * 1000;
  return clamp(elapsed / total, 0, 1);
}

function getSessionProgress(active) {
  const total = (active.duration + active.extensions * 5) * 60 * 1000;
  const remaining = getRemainingMs(active);
  return clamp((total - remaining) / total, 0, 1);
}

function getAmbientProgress(level) {
  return clamp(0.14 + level * 0.12, 0.2, 0.82);
}

function getUnlockedItems(level) {
  const items = ["desk", "chair"];
  if (level >= 2) {
    items.push("lamp", "books");
  }
  if (level >= 3) {
    items.push("bookshelf", "rug");
  }
  if (level >= 4) {
    items.push("window", "plant", "clock");
  }
  if (level >= 5) {
    items.push("fireplace", "sofa", "cat");
  }
  return items;
}

function getStudyRoomLevel(totalSessions) {
  if (totalSessions <= 5) {
    return 1;
  }
  if (totalSessions <= 15) {
    return 2;
  }
  if (totalSessions <= 35) {
    return 3;
  }
  if (totalSessions <= 70) {
    return 4;
  }
  return 5;
}

function getLevelFromXp(xp) {
  if (xp <= 200) {
    return Math.min(5, Math.floor(xp / 40) + 1);
  }
  if (xp <= 500) {
    return Math.min(10, 6 + Math.floor((xp - 201) / 60));
  }
  if (xp <= 1500) {
    return Math.min(20, 11 + Math.floor((xp - 501) / 100));
  }
  if (xp <= 3500) {
    return Math.min(30, 21 + Math.floor((xp - 1501) / 200));
  }
  return 31 + Math.floor((xp - 3501) / 250);
}

function getTitleForLevel(level) {
  if (level <= 5) {
    return "견습생";
  }
  if (level <= 10) {
    return "집중 탐험가";
  }
  if (level <= 20) {
    return "몰입 마법사";
  }
  if (level <= 30) {
    return "시간의 지배자";
  }
  return "전설의 학자";
}

function getSessionQuestTitle(session) {
  const quest = getQuestById(session.questId);
  return quest ? quest.title : "빠른 집중";
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterday(todayString) {
  const value = new Date(`${todayString}T00:00:00`);
  value.setDate(value.getDate() - 1);
  return getLocalDate(value);
}

function formatDurationMs(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const StorageService = {
  get(key, fallback) {
    const value = window.localStorage.getItem(key);
    if (value === null) {
      return structuredClone(fallback);
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Failed to parse localStorage key: ${key}`, error);
      return structuredClone(fallback);
    }
  },

  set(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    window.localStorage.removeItem(key);
  },
};

try {
  bootstrap();
} catch (error) {
  console.error(error);
  root.innerHTML = `
    <section style="padding:24px;min-height:100vh;display:grid;place-items:center;color:#f1ede6;font-family:${escapeHtml(
    '"Avenir Next", "Trebuchet MS", sans-serif'
  )};">
      <div style="max-width:640px;padding:24px 28px;border-radius:24px;background:rgba(21,25,43,0.92);border:1px solid rgba(255,255,255,0.1);box-shadow:0 24px 60px rgba(0,0,0,0.45);">
        <p style="margin:0 0 10px;color:#a6afc9;letter-spacing:0.18em;text-transform:uppercase;font-size:12px;">FocusQuest</p>
        <h1 style="margin:0 0 12px;font-size:36px;line-height:1.05;">앱을 불러오는 중 문제가 발생했습니다.</h1>
        <p style="margin:0 0 16px;color:#c1c7d9;line-height:1.6;">페이지를 새로고침해 다시 시도해 주세요. 문제가 반복되면 아래 상세 정보를 확인할 수 있습니다.</p>
        <details style="color:#ffe2d5;">
          <summary style="cursor:pointer;">오류 상세 보기</summary>
          <pre style="margin-top:12px;white-space:pre-wrap;font-family:monospace;">${escapeHtml(
    error.stack || error.message || String(error)
  )}</pre>
        </details>
      </div>
    </section>
  `;
}
