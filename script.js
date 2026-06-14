// Game State
//스테이터스 변수를 객체로 선언
let stats = {
  love: 30,
  humanity: 50,
  awe: 50,
  gnosis: 0,
};

let inheritedGnosis = 0; //이전 플레이에서 계승되는 앎 스탯의 값
let turn = 0; //현재 턴수
let isGameOver = false; //게임 오버 여부 확인

// New Progression States
let progress = 0; //진행도 (스탯과 별개)
let truthSeen = false; //진실을 알게 되는 시점, gnsois==80일 때 true로 변환
let turnsAfterTruth = 0; //80% 시점부터 엔딩까지의 턴수 계산
let locationTurns = 0; //각 장소에서 얼마나 있었는지 계산(3턴마다 이동 기회)
let enochTurn = null; //에녹 조우~진실까지의 쿨타임 턴(10턴) 체크용
// New States for progression & artifacts
let currentLevel = "모형정원"; //현재 위치
let lastEventId = null; //마지막으로 있었던 장소의 위치
let artifacts = {
  //아티팩트 목록
  bookOfEnoch: false,
  jobsFishhook: false,
  sturdyScale: false,
  blessingForServant: false,
};
let used = { jobsFishhook: false }; //1회용 아티팩트 활용 여부 체크
let eventSeen = {
  catacombs: false, //지하묘지 해금
  jobsFishhook: false, //욥의 낚싯바늘 해금
  sturdyScale: false, //견고한 비늘 해금
  blessingForServant: false, //종을 위한 축복 해금
  truth: false, //진실 조우(앎 80%)
};
let events = [];

// ==========================================
// 🌟 3. 시스템 초기화 함수 (데이터 로드)
// ==========================================
async function initializeGame() {
  try {
    const response = await fetch("events.json");
    events = await response.json();
    console.log("데이터 로드 완료!", events);

    // 데이터가 다 담긴 후에 진짜 게임 시작
    startGame(true);
  } catch (error) {
    console.error("데이터를 불러오는 중 오류가 발생했습니다:", error);
  }
}

// DOM Elements
const elStory = document.getElementById("story-text"); //스토리 출력 UI
const elChoices = document.getElementById("choices-container"); //선택지 UI
const elTurn = document.getElementById("turn-display"); //턴수 UI
const elLog = document.getElementById("log-container"); //로그창 UI
const gameOverScreen = document.getElementById("game-over-screen"); //게임오버 화면 UI

const bars = {
  //각 게이지 바 UI 관리
  love: document.getElementById("bar-love"),
  humanity: document.getElementById("bar-humanity"),
  awe: document.getElementById("bar-awe"),
  gnosis: document.getElementById("bar-gnosis"),
  progress: document.getElementById("bar-progress"),
};
const vals = {
  //각 게이지 값 UI 텍스트 관리
  love: document.getElementById("val-love"),
  humanity: document.getElementById("val-humanity"),
  awe: document.getElementById("val-awe"),
  gnosis: document.getElementById("val-gnosis"),
  progress: document.getElementById("val-progress"),
};
const elLevel = document.getElementById("level-display"); //현재위치 UI텍스트
const elArtifactList = document.getElementById("artifact-list"); //보유 아티팩트 목록 UI

function addLog(message, isSystem = false) {
  //로그를 추가한다
  const el = document.createElement("div");
  el.innerHTML = `<span class="${isSystem ? "text-yellow-500 font-bold" : "text-gray-300"}">[Turn ${turn}]</span> ${message}`;
  elLog.appendChild(el);
  elLog.scrollTop = elLog.scrollHeight;
}

function calculateAndApplyStats(effects, unlock = null) {
  let changes = { love: 0, humanity: 0, awe: 0, gnosis: 0 };

  // Extract base changes
  if (effects.love) changes.love = effects.love;
  if (effects.humanity) changes.humanity = effects.humanity;
  if (effects.awe) changes.awe = effects.awe;
  if (effects.gnosis) changes.gnosis = effects.gnosis;

  let logMsg = "스탯 변동: ";

  // 1. Calculate positive modifiers (축적할 때)
  //각 스탯 보정
  if (changes.humanity > 0) {
    if (stats.love > 60 && !artifacts.sturdyScale) {
      changes.humanity *= 0.5;
      addLog("패널티: 사랑(>60)으로 인해 인간성 축적량 감소(50%)", true);
    }
    if (stats.gnosis > 70) {
      changes.humanity *= 0.5;
      addLog("가혹한 패널티: 앎(>70)으로 인해 인간성 축적량 감소(50%)", true);
    }
    if (artifacts.blessingForServant && stats.humanity < 40) {
      changes.humanity *= 2.0;
      addLog("아티팩트 [종을 위한 축복] 발동: 인간성 축적량 증가(200%)", true);
    }
  }

  if (changes.awe > 0) {
    if (stats.love > 60 && !artifacts.sturdyScale) {
      changes.awe *= 1.5;
      addLog("보정: 사랑(>60)으로 인해 경외 축적량 증가(150%)", true);
    }
    if (stats.humanity > 70) {
      changes.awe *= 0.5;
      addLog("패널티: 인간성(>70)으로 인해 경외 축적량 감소(50%)", true);
    }
    if (stats.gnosis > 70) {
      changes.awe *= 1.5;
      addLog("보정: 앎(>70)으로 인해 경외 축적량 증가(150%)", true);
    }
  }

  if (changes.love > 0) {
    if (stats.humanity > 70) {
      changes.love *= 0.5;
      addLog("패널티: 인간성(>70)으로 인해 사랑 축적량 감소(50%)", true);
    }
    if (stats.awe > 60) {
      changes.love *= 2.0;
      addLog("보정: 경외(>60)으로 인해 사랑 축적량 증가(200%)", true);
    }
  }

  // Apply rounding for cleaner numbers
  changes.love = Math.round(changes.love);
  changes.humanity = Math.round(changes.humanity);
  changes.awe = Math.round(changes.awe);
  changes.gnosis = Math.round(changes.gnosis);

  // Log raw changes
  if (changes.love !== 0)
    logMsg += `사랑 ${changes.love > 0 ? "+" : ""}${changes.love} `;
  if (changes.humanity !== 0)
    logMsg += `인간성 ${changes.humanity > 0 ? "+" : ""}${changes.humanity} `;
  if (changes.awe !== 0)
    logMsg += `경외 ${changes.awe > 0 ? "+" : ""}${changes.awe} `;
  if (changes.gnosis !== 0)
    logMsg += `앎 ${changes.gnosis > 0 ? "+" : ""}${changes.gnosis} `;
  addLog(logMsg);

  // 2. Apply to actual stats

  // Job's Fishhook effect interception 욥의 낚싯바늘
  if (
    stats.love + changes.love <= 0 &&
    artifacts.jobsFishhook &&
    !used.jobsFishhook &&
    changes.love < 0
  ) {
    changes.love = 0;
    used.jobsFishhook = true;
    addLog(
      "아티팩트 [욥의 낚싯바늘] 발동: 사랑 스탯의 치명적인 감소를 1회 무효화했습니다.",
      true,
    );
    updateArtifactUI();
  }

  stats.love = Math.max(0, Math.min(100, stats.love + changes.love));
  stats.humanity = Math.max(
    0,
    Math.min(100, stats.humanity + changes.humanity),
  );
  stats.awe = Math.max(0, Math.min(100, stats.awe + changes.awe));
  stats.gnosis = Math.max(0, stats.gnosis + changes.gnosis); // No upper bound

  // 에녹 조우(진행도 50%) 전까지 앎 수치에 비례하여 진행도 동기화
  if (!eventSeen.catacombs && progress < 50) {
    progress = Math.max(progress, Math.min(50, stats.gnosis));
  }

  // 3. 턴 종료 시 패시브 스탯 붕괴 (난이도 조절용)
  let passiveLog = [];
  if (stats.gnosis >= 50) {
    stats.love = Math.max(0, stats.love - 2);
    passiveLog.push("앎(>=50)으로 사랑 -2");
  }
  if (stats.awe >= 70) {
    stats.humanity = Math.max(0, stats.humanity - 2);
    passiveLog.push("경외(>=70)로 인간성 -2");
  }
  if (stats.humanity >= 80) {
    stats.awe = Math.max(0, stats.awe - 2);
    stats.love = Math.max(0, stats.love - 1);
    passiveLog.push("인간성(>=80)으로 경외 -2, 사랑 -1");
  }
  if (stats.love >= 70) {
    stats.gnosis = Math.max(0, stats.gnosis - 1);
    passiveLog.push("사랑(>=70)으로 앎 -1");
  }

  if (passiveLog.length > 0) {
    addLog(`[패시브 붕괴] ${passiveLog.join(", ")}`, true);
  }

  if (unlock) {
    artifacts[unlock] = true;
    addLog(`>>> 아티팩트 획득: ${getArtifactName(unlock)} <<<`, true);
    if (unlock === "bookOfEnoch") {
      currentLevel = "지하묘지";
      elLevel.innerText = "지하묘지";
      updatePortraits();
    }
    updateArtifactUI();
  }

  checkTriggersAndGameOver();
  updateUI();
}

//사랑 0의 트리거 서령, 에녹의 서 발동 로그
function checkTriggersAndGameOver() {
  // Check Auto-triggers first
  if (stats.humanity === 100 && stats.love !== 0) {
    if (artifacts.bookOfEnoch) {
      stats.humanity = 50;
      addLog(
        "아티팩트 [에녹의 서] 발동: 자아 붕괴를 막고 인간성을 50%로 안정화시켰습니다.",
        true,
      );
    } else {
      stats.love = 0;
      addLog(
        "!! 치명적 트리거: 인간성이 100에 도달하여 사랑이 0이 되었습니다.",
        true,
      );
    }
  }
  if (stats.awe === 0 && stats.love !== 0) {
    stats.love = 0;
    addLog("!! 치명적 트리거: 경외가 0이 되어 사랑이 0이 되었습니다.", true);
  }

  // Game Over Conditions 게임오버 관리자
  let overReason = null;
  let overDesc = "";

  let aweGameOverTrigger = stats.awe === 100;
  if (aweGameOverTrigger && artifacts.sturdyScale) {
    aweGameOverTrigger = false; // 견고한 비늘 효과: 경외 100 도달 시 게임오버 방지
  }

  if (stats.love === 0) {
    overReason = "엔딩 0: 호문쿨루스 폐기";
    overDesc =
      "레비아탄의 눈동자에 더는 따스함이 남아 있지 않다.\n그는 내가 쓸모 없다고 말했다.\n그 이후는 기억나지 않는다.";
  } else if (aweGameOverTrigger && stats.love < 60) {
    overReason = "엔딩 6: 이성 붕괴";
    overDesc =
      "거대한레비아탄의그림자가나를덮어삼킨다……나는그것이두려워견딜수가없다……나는그의금색눈동자에빠져질식할것이분명하다그의단단한이빨을내가어찌감당할수있겠는가그누구도그것을낚싯바늘로낚지못하리그것의견고한비늘을뚫을자이세상에없다 나는아무것도 생각하지 않는다 나는 아무것도 아니다";
  } else if (stats.humanity === 0 || stats.love === 100 || aweGameOverTrigger) {
    overReason = "엔딩 1: 완벽한 피조물!";
    overDesc =
      "나는 생각하는 것을 관두기로 했다.\n그것은 압도적으로 행복하다.\n레비아탄은 나를 사랑한다.\n레비아탄은 나를 사랑한다!";
  }

  if (overReason) {
    triggerGameOver(overReason, overDesc);
  }
}

//게임오버 트리거
function triggerGameOver(title, desc) {
  isGameOver = true;
  document.getElementById("go-title").innerText = title;
  document.getElementById("go-desc").innerText = desc;
  gameOverScreen.classList.remove("hidden");
  addLog(`[게임 오버] ${title}`, true);

  // Calculate inherited gnosis for next run (Max 30)
  inheritedGnosis = Math.min(30, Math.floor(stats.gnosis / 2));
  localStorage.setItem("inheritedGnosis", inheritedGnosis);
}

//아티팩트 이름 부여
function getArtifactName(id) {
  const names = {
    bookOfEnoch: "에녹의 서",
    jobsFishhook: "욥의 낚싯바늘",
    sturdyScale: "견고한 비늘",
    blessingForServant: "종을 위한 축복",
  };
  return names[id] || id;
}
//아티팩트 소유 여부
function updateArtifactUI() {
  let html = "";
  if (artifacts.bookOfEnoch)
    html += `<div class="text-[#c9a776]">📖 에녹의 서</div>`;
  if (artifacts.jobsFishhook) {
    if (used.jobsFishhook)
      html += `<div class="text-gray-600 line-through">🎣 욥의 낚싯바늘 (사용됨)</div>`;
    else html += `<div class="text-[#c9a776]">🎣 욥의 낚싯바늘</div>`;
  }
  if (artifacts.sturdyScale)
    html += `<div class="text-[#c9a776]">🛡️ 견고한 비늘</div>`;
  if (artifacts.blessingForServant)
    html += `<div class="text-[#c9a776]">✨ 종을 위한 축복</div>`;

  if (html === "")
    html =
      '<span class="italic text-gray-600">보유한 아티팩트가 없습니다.</span>';
  elArtifactList.innerHTML = html;
}

//포트레잇 업데이트
function updatePortraits() {
  const elNpc = document.getElementById("portrait-enoch");
  const elLev = document.getElementById("portrait-leviathan");

  if (currentLevel === "지하묘지") {
    elLev.classList.remove("portrait-lev");
    elNpc.classList.add("portrait-enoch");
  } else {
    elNpc.classList.remove("portrait-enoch");
    elLev.classList.add("portrait-lev");
  }
}

//스탯바 업데이트 로직
function updateUI() {
  // Update Bars
  bars.love.style.width = `${stats.love}%`;
  vals.love.innerText = `${stats.love}/100`;

  bars.humanity.style.width = `${stats.humanity}%`;
  vals.humanity.innerText = `${stats.humanity}/100`;

  bars.awe.style.width = `${stats.awe}%`;
  vals.awe.innerText = `${stats.awe}/100`;

  // Gnosis can exceed 100, visually cap bar at 100% but show real text
  bars.gnosis.style.width = `${Math.min(100, stats.gnosis)}%`;
  vals.gnosis.innerText = `${stats.gnosis}/100`;

  bars.progress.style.width = `${progress}%`;
  vals.progress.innerText = `${progress}%`;

  elTurn.innerText = turn;
}

//선택 시스템 작동 관리자
function bindChoices(ev) {
  elStory.innerText = ev.text;
  elChoices.innerHTML = "";
  ev.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "btn-choice p-4 text-left brass-text rounded-sm w-full";
    btn.innerText = `> ${choice.text}`;
    btn.onclick = () => {
      addLog(`선택: ${choice.text}`);
      if (choice.action) choice.action();

      if (choice.effects && Object.keys(choice.effects).length > 0) {
        calculateAndApplyStats(choice.effects, choice.unlock);
      } else if (choice.unlock) {
        artifacts[choice.unlock] = true;
        addLog(
          `>>> 아티팩트 획득: ${getArtifactName(choice.unlock)} <<<`,
          true,
        );
        updateArtifactUI();
        checkTriggersAndGameOver();
        updateUI();

        // 💡 이 부분을 추가 및 수정합니다!
        if (choice.nextId) {
          renderEvent(choice.nextId); // 확정 이벤트가 있으면 해당 ID 전달
        } else {
          renderEvent(); // 없으면 무작위 뽑기
        }
      }

      if (!isGameOver) {
        turn++;
        locationTurns++;
        if (truthSeen && progress < 100) {
          turnsAfterTruth++;
          progress = Math.min(100, 90 + Math.floor((turnsAfterTruth / 5) * 10));
        }
        updateUI();
        // ✅ nextId가 있으면 그걸로, 없으면 랜덤으로!
        if (choice.nextId) {
          renderEvent(choice.nextId);
        } else {
          renderEvent();
        }
      }
    };
    elChoices.appendChild(btn);
  });
}

//엔딩 텍스트 (폴리싱 필요)
function handleEnding() {
  elStory.innerText = "[진행도 100%] 모든 진실의 끝, 운명의 기로에 섰습니다.";
  elChoices.innerHTML = "";
  // 3번 엔딩 (진실 확인 완료, 사랑<50, 경외<50, 인간성>=60)
  if (truthSeen && stats.love < 50 && stats.awe < 50 && stats.humanity >= 60) {
    elStory.innerText +=
      "\n\n에녹과 함께 레비아탄의 모형정원을 탈출할 기회가 생겼습니다. 어떻게 하시겠습니까?";
    createEndingChoice(
      "레비아탄을 버리고 떠난다.",
      "엔딩 3: 모형정원 탈출",
      "에녹과 함께 레비아탄의 모형정원을 탈출합니다.",
    );
    createEndingChoice(
      "모형정원에 머무른다.",
      "엔딩 0: 호문쿨루스 폐기",
      "오리진을 충분히 닮지 못한 괘씸한 존재로 판단, 레비아탄에 의해 폐기됩니다.",
    );
    return;
  }

  // 4번 엔딩 (진실 확인 완료, 사랑>=50 OR 경외>=50)
  if (truthSeen && (stats.love >= 50 || stats.awe >= 50)) {
    elStory.innerText +=
      "\n\n에녹의 희생을 통해 레비아탄의 모형정원을 탈출할 기회를 얻었습니다. 어떻게 하시겠습니까?";
    createEndingChoice(
      "탈출한다.",
      "엔딩 4: 희생과 탈출",
      "에녹의 희생을 딛고 레비아탄의 모형정원을 탈출합니다.",
    );
    createEndingChoice(
      "머무른다.",
      "엔딩 1: 완벽한 피조물!",
      "나는 생각하는 것을 관두기로 했다.\n그것은 압도적으로 행복하다.\n레비아탄은 나를 사랑한다.\n레비아탄은 나를 사랑한다!",
    );
    return;
  }

  // 2번 엔딩 (사랑 80+, 인간성 70+)
  if (stats.love >= 80 && stats.humanity >= 70) {
    triggerGameOver(
      "엔딩 2: 시절인연",
      "레비아탄은 *나*를 사랑한다.\n그건 불변하는 사실이다.",
    );
    return;
  }

  // 1번 엔딩 ((사랑 80+ OR 경외 80+) AND 인간성 < 70)
  if ((stats.love >= 80 || stats.awe >= 80) && stats.humanity < 70) {
    triggerGameOver(
      "엔딩 1: 완벽한 피조물!",
      "나는 생각하는 것을 관두기로 했다.\n그것은 압도적으로 행복하다.\n레비아탄은 나를 사랑한다.\n레비아탄은 나를 사랑한다!",
    );
    return;
  }

  // 0번 엔딩 (인간성만 높고 레비아탄을 향한 감정이 없을 때)
  if (stats.humanity >= 70 && stats.love < 50 && stats.awe < 50) {
    triggerGameOver(
      "엔딩 0: 호문쿨루스 폐기",
      "레비아탄을 사랑하지 않는 인간은 가치가 없다.",
    );
    return;
  }

  // 5번 엔딩 (조건 미달 기본 엔딩 - 어중간하게 생존했을 때)
  triggerGameOver(
    "엔딩 5: 실험의 실패",
    "레비아탄은 나에게 만족하지 못했다. 나는 버려졌다.\n조금 더 그의 마음에 들지 않으면, 조금 더 강해지지 않으면…….",
  );
}

function createEndingChoice(text, title, desc) {
  const btn = document.createElement("button");
  btn.className = "btn-choice p-4 text-left brass-text rounded-sm w-full mb-3";
  btn.innerText = `> ${text}`;
  btn.onclick = () => triggerGameOver(title, desc);
  elChoices.appendChild(btn);
}

//이벤트 목록(폴리싱 필요)
// 이벤트 목록 렌더링
function renderEvent(eventId) {
  if (isGameOver) return;

  if (progress >= 100) {
    handleEnding();
    return;
  }

  let ev = null;

  // 💡 1. 확정 이벤트 ID를 전달받은 경우 (무조건 최우선으로 실행)
  if (eventId) {
    // 모형정원과 지하묘지 배열을 모두 뒤져서 이벤트를 찾습니다.
    ev =
      events.find((event) => event.id === eventId) ||
      catacombEvents.find((event) => event.id === eventId);

    if (!ev) {
      console.error(`오류: ${eventId}에 해당하는 이벤트를 찾을 수 없습니다!`);
      return;
    }

    lastEventId = ev.id;
    return bindChoices(ev); // 💡 찾았으면 아래 랜덤 뽑기로 안 넘어가고 여기서 바로 출력(return)합니다!
  }

  // ---------------------------------------------------------
  // 💡 2. ID를 전달받지 않은 경우 (기존의 특수 플롯 및 랜덤 탐색 로직 실행)
  // ---------------------------------------------------------

  // 진실 플롯 (진행도 90%) - 에녹 조우 후 최소 10턴 경과 조건 추가
  if (
    stats.gnosis >= 80 &&
    !eventSeen.truth &&
    enochTurn !== null &&
    turn - enochTurn >= 10
  ) {
    eventSeen.truth = true;
    truthSeen = true;
    progress = 90;
    addLog("!! [플롯: 진실] 발동 !!", true);
    ev = {
      id: "sp_truth",
      text: "[플롯: 진실] 당신은 에녹과 자신이 인조인간이며, '레비아탄이 과거에 사랑했던 어떤 필멸자'를 닮게 만들어진 복제품이라는 끔찍한 진실을 깨닫게 됩니다.",
      choices: [
        {
          text: "진실의 무게를 감내하며 다음을 기약한다.",
          effects: { gnosis: 5, humanity: 5 },
        },
      ],
    };
    return bindChoices(ev);
  }

  // Check Special Unlock Events first
  if (
    stats.gnosis >= 60 &&
    currentLevel === "모형정원" &&
    !eventSeen.catacombs
  ) {
    eventSeen.catacombs = true;
    ev = {
      id: "sp_enoch",
      text: "어느 날, 모형 정원의 바닥에 나있는 특이한 문양을 발견했다. 툭툭 건드리면 아무 반응이 없었지만, 위쪽으로 잡아당기니 삐걱거리며 그 자리가 들려 올라갔다. 바닥에 나있는 문이었다. 아래로는 사다리가 이어져 있었다.\n\n조심스럽게 아래로 내려가는 도중 인기척이 들렸다. 그곳에는 반쯤 망가져서, 대체 기능할 수는 있는 건가 싶은 인간이 있었다.\n\n'내 이름은 에녹이야. 유일하게 살아남은 너의 동족이지.'\n\n그러고 보니 그의 얼굴은, 언젠가 거울 속에서 봤던 내 얼굴과 완전히 똑같이 생겼다.\n\n'몰랐어? 너도, 나도 레비아탄에 의해 만들어진 존재잖아. 보아하니 넌 그에게 충분히 사랑받고 있나보지. 하지만 그것도 잠깐이야. 금방 레비아탄은 너에게 질려버리고, 널 버릴 거야.'\n\n'난 그때 겨우 도망쳤어. 반쯤 망가진 채 이 지하묘지에 몸을 숨기는 것 말고는 할 수 있는 게 없었지만, 그래도 살아있다는 점에서 다른 동족들보단 사정이 나을지도 모르지.'\n\n자신을 에녹이라 소개한 그는 입가를 비틀어 웃음을 지어보이며, 낡은 책 한 권을 내밀었다.\n\n'레비아탄의 초기 연구 노트야. 여기에 버려두었더군. 그 도마뱀이 뭘 하고 있는지, 우리가 누구인지. 내 말을 조금 더 정확히 알아듣고 싶다면 그 책을 읽어 보도록 해.'",
      choices: [
        {
          text: "그가 내민 에녹의 서를 받는다.",
          effects: { gnosis: 10, humanity: 10 },
          unlock: "bookOfEnoch",
          action: () => {
            progress = Math.max(progress, 50);
            enochTurn = turn;
          },
        },
      ],
    };
    return bindChoices(ev);
  }
  if (stats.gnosis >= 50 && stats.awe <= 10 && !eventSeen.jobsFishhook) {
    eventSeen.jobsFishhook = true;
    ev = {
      id: "sp_fishhook",
      text: "[플롯: 의심] 레비아탄의 권능에 대한 의심이 싹튼다. 그를 죽일 수 있을지도 모르겠다고 생각한다.",
      choices: [
        {
          text: "연못에서 낚싯바늘을 챙겨 품속 깊이 숨긴다.",
          effects: { gnosis: 5 },
          unlock: "jobsFishhook",
        },
      ],
    };
    return bindChoices(ev);
  }
  if (stats.love >= 85 && !eventSeen.sturdyScale) {
    eventSeen.sturdyScale = true;
    ev = {
      id: "sp_scale",
      text: "[플롯: 은총] 레비아탄은 플레이어가 매우 사랑스럽다고 생각한다. 그는 자신의 비늘 중 하나를 떼어 플레이어에게 준다. 그것이 그를 지켜줄 것이라고 말한다.",
      choices: [
        {
          text: "은총을 기꺼이 받아들이고 비늘을 품는다.",
          effects: { love: 5, awe: 10 },
          unlock: "sturdyScale",
        },
      ],
    };
    return bindChoices(ev);
  }
  if (
    stats.gnosis < 50 &&
    stats.humanity <= 10 &&
    !eventSeen.blessingForServant
  ) {
    eventSeen.blessingForServant = true;
    ev = {
      id: "sp_blessing",
      text: "[플롯: 순종] 레비아탄의 비늘에 비치는 휘황찬란한 빛에 플레이어는 압도된다. 그것이 자신을 축복해줄 것 같다고 생각하게 된다.",
      choices: [
        {
          text: "압도적인 빛에 순종하며 축복을 받는다.",
          effects: { awe: 5 },
          unlock: "blessingForServant",
        },
      ],
    };
    return bindChoices(ev);
  }

  // 이동 기회 (3턴 이상 체류 시)
  if (
    locationTurns >= 4 &&
    currentLevel === "모형정원" &&
    artifacts.bookOfEnoch
  ) {
    locationTurns = 0;
    ev = {
      id: "move_down",
      text: "레비아탄이 잠시 자리를 비웠다. 그의 눈을 피해 모형정원 구석에 숨겨진 지하묘지로 내려갈 수 있는 기회다.",
      choices: [
        {
          text: "지하묘지로 몰래 내려간다.",
          effects: {},
          action: () => {
            currentLevel = "지하묘지";
            updatePortraits();
            elLevel.innerText = "지하묘지";
            addLog("위치 이동: 지하묘지", true);
          },
        },
        { text: "모형정원에 머무른다.", effects: {} },
      ],
    };
    return bindChoices(ev);
  }
  if (locationTurns >= 4 && currentLevel === "지하묘지") {
    locationTurns = 0;
    ev = {
      id: "move_up",
      text: "위쪽 모형정원에서 레비아탄이 나를 불렀다. 다시 나를 보고 싶어진 게 분명하다.",
      choices: [
        {
          text: "부름에 응해 모형정원으로 올라간다.",
          effects: {},
          action: () => {
            currentLevel = "모형정원";
            updatePortraits();
            elLevel.innerText = "모형정원";
            addLog("위치 이동: 모형정원", true);
          },
        },
        {
          text: "부름을 무시하고 지하에 숨죽여 남는다.",
          effects: { love: -10, awe: -10 },
        },
      ],
    };
    return bindChoices(ev);
  }

  // Normal Event Pool Selection (랜덤 뽑기)
  // 💡 1. 전체 이벤트 중에서 현재 장소(currentLevel)와 일치하는 이벤트만 1차로 걸러냅니다.
  let pool = events.filter((e) => e.location === currentLevel);

  // 💡 2. 그 장소 이벤트들 중에서 하위 이벤트(isSub)와 방금 본 이벤트를 2차로 제외합니다.
  let filteredPool = pool.filter((e) => !e.isSub && e.id !== lastEventId);

  // 만약 필터링했더니 0개가 남았다면, 중복 제한만 풀고 다시 뽑습니다.
  if (filteredPool.length === 0) {
    filteredPool = pool.filter((e) => !e.isSub);
  }

  // 안전하게 걸러진 풀 안에서 무작위 이벤트 하나를 고릅니다.
  ev = filteredPool[Math.floor(Math.random() * filteredPool.length)];
  lastEventId = ev.id;

  bindChoices(ev);
}

//게임  시작/재시작 로직, 인트로 설정 (완료)
function showIntro() {
  elStory.innerHTML = `
    <p>그곳은 형언할 수 없는 색의 증기를 뿜어대는 증기 기관으로 가득 차있는 방이었다. 익숙한 향이 났지만 나는 그 정체를 모른다. 창문 너머로는 샛노란 하늘이 펼쳐져 있다. 나는 하늘의 색을 알고 있었나? <br><br>아, 그건 하늘이 아니다. 검게 갈라진 틈이 움직인다. 그것은 용의 눈동자였다. 세로로 찢어진 동공이 이쪽을 바라보고 있다.</p>
  `;

  elChoices.innerHTML = "";
  const startBtn = document.createElement("button");

  startBtn.className = "btn-intro-choice";
  startBtn.innerText = "눈이 마주쳤다.";

  // 플레이어가 버튼을 눌렀을 때 비로소 1턴이 시작되도록 설정
  startBtn.onclick = () => {
    addLog(
      "일부 텍스트가 폴리싱되지 않은 데모 버전입니다! 플레이에 참고 부탁드립니다. 감사합니다.",
    );
    renderEvent("e1"); // 여기서 진짜 1턴 화면을 그립니다!
  };

  elChoices.appendChild(startBtn);
}

function startGame(inherit = true) {
  // 💡 버그 수정 2: 완전 재시작 시 메모리에서 아예 삭제해버리도록 변경
  if (!inherit) {
    localStorage.removeItem("inheritedGnosis");
  }

  let savedGnosis = parseInt(localStorage.getItem("inheritedGnosis")) || 0;

  stats = {
    love: 30,
    humanity: 50,
    awe: 50,
    gnosis: savedGnosis, // 이제 에러가 나도 무조건 최소 0부터 시작함
  };

  turn = 1;
  progress = 0;
  truthSeen = false;
  turnsAfterTruth = 0;
  locationTurns = 0;
  enochTurn = null;
  isGameOver = false;
  currentLevel = "모형정원";
  lastEventId = null;
  artifacts = {
    bookOfEnoch: false,
    jobsFishhook: false,
    sturdyScale: false,
    blessingForServant: false,
  };
  used = { jobsFishhook: false };
  eventSeen = {
    catacombs: false,
    jobsFishhook: false,
    sturdyScale: false,
    blessingForServant: false,
    truth: false,
  };

  elLevel.innerText = "모형정원";
  updateArtifactUI();
  updatePortraits();

  gameOverScreen.classList.add("hidden");
  elLog.innerHTML = "";

  if (isNaN(savedGnosis) || savedGnosis === 0) {
    gnosis = 0;
    showIntro(); // 완전 첫 플레이면 인트로 띄우기 (여기서 멈춤)
  } else {
    gnosis = savedGnosis;
    addLog(`이전 생애의 기억(앎 ${gnosis})을 일부 가진 채로 눈을 뜹니다.`);
    showIntro();
  }

  updateUI();
}

// Start the game on load
window.onload = () => initializeGame();

window.hardReset = function () {
  // 1. 로컬 스토리지에 저장된 계승 데이터를 완벽하게 삭제
  localStorage.removeItem("inheritedGnosis");

  // 2. 앎이 삭제된 상태에서 페이지를 강제로 새로고침 (가장 확실한 초기화 방법)
  location.reload();
};
