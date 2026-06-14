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

const events = [
  {
    //이벤트 목록 (추가 필요)
    id: "e1",
    text: "거대한 눈동자는 자신을 용, '레비아탄'이라고 소개했다. 그것의 목소리가 어디에서 나오고 있는지는 알 길이 없었다. 내가 볼 수 있는 것이라곤 그것의 눈과 비늘 뿐일 만큼 엄청난 크기였다.\n\n'두려워하지 마라. 나는 아주 오랫동안 너를 그리워했어…….'\n\n레비아탄은 부드러운 목소리로 나를 안심시켰다. 그러나 그의 말이 진실인지에 관해선 알 길이 없었다. 과거가, 전혀 기억나지 않았다. 그는 믿을 만한 존재일까. 그는 무엇인가. 남는 것은 의문 뿐이다.\n\n입을 열어서 뱉은 첫 마디는…….",
    choices: [
      {
        text: "나도 보고 싶었다고 말하자. 거짓말이지만.",
        effects: { love: 15, humanity: -15 },
        nextId: "e2",
      },
      {
        text: "신뢰가 안 간다. 그의 말을 증명해달라고 말하자.",
        effects: { awe: -15, humanity: 15 },
        nextId: "e3",
      },
    ],
  },
  {
    id: "e2",
    text: "실험실 한구석에서 출처를 알 수 없는 낡은 스팀펑크 장치를 발견했습니다. 복잡한 구조가 호기심을 자극합니다.",
    choices: [
      {
        text: "구조를 조심스럽게 분해하며 원리를 파악한다.",
        effects: { gnosis: 20, awe: -15, love: -5 },
      },
      {
        text: "위험할지 모르니 레비아탄에게 가져가 바친다.",
        effects: { love: 15, gnosis: -15 },
      },
    ],
  },
  {
    id: "e3",
    text: "정원의 인공 태양이 지고 어둠이 찾아왔습니다. 온실 밖, 닿을 수 없는 바깥 세상의 풍경이 흐릿하게 보입니다.",
    choices: [
      {
        text: "자유를 갈망하며 바깥 풍경에서 눈을 떼지 못한다.",
        effects: { humanity: 20, love: -15 },
      },
      {
        text: "창조주가 마련해준 이 정원의 완벽함에 감탄한다.",
        effects: { awe: 15, gnosis: 5 },
      },
    ],
  },
  {
    id: "e4",
    text: "레비아탄이 기분이 좋은 듯 낮게 그르렁거리며 당신의 머리칼을 거대한 발톱으로 쓰다듬습니다.",
    choices: [
      {
        text: "그의 비늘 구조와 마력의 흐름을 관찰한다.",
        effects: { gnosis: 15, love: -20 },
      },
      {
        text: "그의 손길에 몸을 맡기고 온기를 느낀다.",
        effects: { love: 15, humanity: -15 },
      },
      {
        text: "감히 움직이지 못하고 숨을 죽인다.",
        effects: { awe: 20, humanity: -10 },
      },
    ],
  },
  {
    id: "e5",
    text: "당신의 팔에 이식된 톱니바퀴 장치에서 덜그럭거리는 소리가 납니다. 수리가 필요한 것 같습니다.",
    choices: [
      {
        text: "스스로 도구를 찾아 기계 팔을 수리한다.",
        effects: { gnosis: 15, awe: -10 },
      },
      {
        text: "아픔을 느끼며 기계가 아닌 온전한 몸을 원한다.",
        effects: { humanity: 15, awe: -20 },
      },
    ],
  },
  {
    id: "e6",
    text: "레비아탄이 알 수 없는 고대어로 중얼거립니다. 그 소리는 당신의 뇌리를 강하게 때립니다.",
    choices: [
      {
        text: "그 지식을 받아들여 해석을 시도한다.",
        effects: { gnosis: 25, love: -25 },
      },
      {
        text: "창조주의 웅장한 목소리에 경외감을 느낀다.",
        effects: { awe: 25, humanity: -20 },
      },
    ],
  },
];

const catacombEvents = [
  {
    //지하묘지 이벤트 목록(추가 필요)
    id: "c1",
    text: "[지하묘지] 에녹이 구석에서 빛바랜 설계도를 꺼내 보여줍니다. 인간성과 앎을 결합하는 실험의 흔적입니다.",
    choices: [
      {
        text: "설계도의 원리를 에녹과 함께 분석한다.",
        effects: { gnosis: 20, love: -5 },
      },
      {
        text: "인간성의 본질에 대해 에녹과 토론한다.",
        effects: { humanity: 20, awe: -5 },
      },
    ],
  },
  {
    id: "c2",
    text: "[지하묘지] 에녹은 바깥 세상에서 가져온 작은 씨앗을 돌보고 있습니다. 척박한 환경 속 진짜 생명입니다.",
    choices: [
      {
        text: "씨앗이 싹트기를 바라며 애정을 쏟는다.",
        effects: { humanity: 20, awe: -10 },
      },
      {
        text: "이 연약한 생명이 살아남을 수칙을 계산한다.",
        effects: { gnosis: 15, love: -10 },
      },
    ],
  },
  {
    id: "c3",
    text: "[지하묘지] 에녹이 낡은 축음기를 작동시킵니다. 기계음이 섞인 쓸쓸한 음악이 묘지를 채웁니다.",
    choices: [
      {
        text: "음악에 담긴 바깥 세상의 슬픔을 공감한다.",
        effects: { humanity: 15, love: -10 },
      },
      {
        text: "축음기의 구동 원리와 주파수를 기록한다.",
        effects: { gnosis: 20, awe: -5 },
      },
    ],
  },
];

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
    overReason = "폐기 (Discarded)";
    overDesc =
      "레비아탄의 흥미가 식었습니다. 당신은 가치를 잃고 차가운 바닥에 버려졌습니다.";
  } else if (aweGameOverTrigger && stats.love < 50) {
    overReason = "공포에 잠식됨 (Consumed by Fear)";
    overDesc =
      "레비아탄의 거대한 그림자 앞에서 숨이 멎을 듯한 공포에 잡아먹혀 정신이 붕괴되었습니다.";
  } else if (stats.humanity === 0 || stats.love === 100 || aweGameOverTrigger) {
    overReason = "충실한 인형 (Faithful Doll)";
    overDesc =
      "자아를 잃어버렸습니다. 당신은 이제 레비아탄을 위한 완벽하고 아름다운 인형일 뿐입니다.";
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
      "\n\nNPC 에녹과 함께 레비아탄의 모형정원을 탈출할 기회가 생겼습니다. 어떻게 하시겠습니까?";
    createEndingChoice(
      "레비아탄을 버리고 떠난다.",
      "엔딩 3: 모형정원 탈출",
      "NPC 에녹과 함께 레비아탄의 모형정원을 탈출합니다.",
    );
    createEndingChoice(
      "모형정원에 머무른다.",
      "엔딩 0: 폐기",
      "오리진을 충분히 닮지 못한 괘씸한 존재로 판단, 레비아탄에 의해 폐기됩니다.",
    );
    return;
  }

  // 4번 엔딩 (진실 확인 완료, 사랑>=50 OR 경외>=50)
  if (truthSeen && (stats.love >= 50 || stats.awe >= 50)) {
    elStory.innerText +=
      "\n\nNPC 에녹의 희생을 통해 레비아탄의 모형정원을 탈출할 기회를 얻었습니다. 어떻게 하시겠습니까?";
    createEndingChoice(
      "탈출한다.",
      "엔딩 4: 희생과 탈출",
      "NPC 에녹의 희생을 딛고 레비아탄의 모형정원을 탈출합니다.",
    );
    createEndingChoice(
      "머무른다.",
      "엔딩 1: 충실한 인형",
      "자아를 잃고, 레비아탄의 충실한 총애 대상이 됩니다.",
    );
    return;
  }

  // 2번 엔딩 (사랑 80+, 인간성 70+)
  if (stats.love >= 80 && stats.humanity >= 70) {
    triggerGameOver(
      "엔딩 2: 새로운 애착",
      "‘오리진’을 뛰어넘어, 레비아탄의 새로운 애착 대상이 됩니다.",
    );
    return;
  }

  // 1번 엔딩 ((사랑 80+ OR 경외 80+) AND 인간성 < 70)
  if ((stats.love >= 80 || stats.awe >= 80) && stats.humanity < 70) {
    triggerGameOver(
      "엔딩 1: 충실한 인형",
      "자아를 잃고, 레비아탄의 충실한 총애 대상이 됩니다.",
    );
    return;
  }

  // 0번 엔딩 (인간성만 높고 레비아탄을 향한 감정이 없을 때)
  if (stats.humanity >= 70 && stats.love < 50 && stats.awe < 50) {
    triggerGameOver(
      "엔딩 0: 폐기",
      "오리진을 충분히 닮지 못한 괘씸한 존재로 판단, 레비아탄에 의해 폐기됩니다.",
    );
    return;
  }

  // 5번 엔딩 (조건 미달 기본 엔딩 - 어중간하게 생존했을 때)
  triggerGameOver(
    "엔딩 5: 잊혀진 장난감",
    "레비아탄은 새로운 호문쿨루스를 만들고 그것에 푹 빠져 있습니다. 당신은 잊히거나 곧 폐기될 것입니다.",
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
      text: "[플롯: 에녹 조우] 자신과 똑같이 생긴 인물을 만난다. 그는 자신을 '에녹'이라고 소개하며, '죽지 않은 너의 동족'이라고 말한다. 그는 자신이 이 모형정원의 진실을 알고 있다고 소개한다.",
      choices: [
        {
          text: "그의 말에 귀를 기울이고 에녹의 서를 받는다.",
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
      text: "[이동 기회] 레비아탄이 외출을 위해 잠시 자리를 비웠습니다. 모형정원 구석에 숨겨진 지하묘지로 내려갈 수 있습니다.",
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
      text: "[이동 기회] 위쪽 모형정원에서 레비아탄이 당신을 부르는 소리가 들립니다.",
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
  let pool = currentLevel === "지하묘지" ? catacombEvents : events;

  let filteredPool = pool.filter((e) => e.id !== lastEventId);
  if (filteredPool.length === 0) filteredPool = pool;

  ev = filteredPool[Math.floor(Math.random() * filteredPool.length)];
  lastEventId = ev.id;

  bindChoices(ev);
}

//게임  시작/재시작 로직, 인트로 설정 (완료)
function showIntro() {
  elTurn.innerText = "System Booting...";

  elStory.innerHTML = `
    <p>그곳은 형언할 수 없는 색의 증기를 뿜어대는 증기 기관으로 가득 차있는 방이었다. 익숙한 향이 났지만 나는 그 정체를 모른다. 창문 너머로는 샛노란 하늘이 펼쳐져 있다. 나는 하늘의 색을 알고 있었나? <br><br>아, 그건 하늘이 아니다. 검게 갈라진 틈이 움직인다. 그것은 용의 눈동자였다. 세로로 찢어진 동공이 이쪽을 바라보고 있다.</p>
  `;

  elChoices.innerHTML = "";
  const startBtn = document.createElement("button");

  startBtn.className = "btn-intro-choice";
  startBtn.innerText = "눈이 마주쳤다.";

  // 플레이어가 버튼을 눌렀을 때 비로소 1턴이 시작되도록 설정
  startBtn.onclick = () => {
    addLog("눈을 떠 모형정원의 빛을 마주합니다.");
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
    renderEvent(); // 다회차면 인트로 없이 바로 1턴 띄우기
  }

  updateUI();
}

// Start the game on load
window.onload = () => startGame(true);

window.hardReset = function () {
  // 1. 로컬 스토리지에 저장된 계승 데이터를 완벽하게 삭제
  localStorage.removeItem("inheritedGnosis");

  // 2. 앎이 삭제된 상태에서 페이지를 강제로 새로고침 (가장 확실한 초기화 방법)
  location.reload();
};
