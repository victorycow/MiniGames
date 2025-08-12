import React, { useMemo, useState } from "react";
import { Dice5, RefreshCw, RotateCcw, PartyPopper } from "lucide-react";

// Tailwind is available in this environment.
// Single-file React component for a Yacht (Yahtzee-style) dice game (Korean UI)
// Rules implemented per user's description.

const DICE_COUNT = 5;
const MAX_ROLLS_PER_ROUND = 3; // up to 3 total throws per round

function randDie() {
  return Math.floor(Math.random() * 6) + 1; // 1..6
}
function pipPositions(size = 40) {
  // 3x3 grid positions for pips on an SVG die face
  const s = size;
  const m = s / 6; // margin
  const spots = [[m * 1.4, m * 1.4],
  // tl
  [s / 2, s / 2],
  // center
  [s - m * 1.4, s - m * 1.4],
  // br
  [s - m * 1.4, m * 1.4],
  // tr
  [m * 1.4, s - m * 1.4],
  // bl
  [m * 1.4, s / 2],
  // ml
  [s - m * 1.4, s / 2] // mr
  ];
  return spots;
}
function drawPips(num, size = 40) {
  const [tl, c, br, tr, bl, ml, mr] = pipPositions(size);
  const dot = (pos, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: pos[0],
    cy: pos[1],
    r: size / 12
  });
  switch (num) {
    case 1:
      return [dot(c, 1)];
    case 2:
      return [dot(tl, 1), dot(br, 2)];
    case 3:
      return [dot(tl, 1), dot(c, 2), dot(br, 3)];
    case 4:
      return [dot(tl, 1), dot(tr, 2), dot(bl, 3), dot(br, 4)];
    case 5:
      return [dot(tl, 1), dot(tr, 2), dot(c, 3), dot(bl, 4), dot(br, 5)];
    case 6:
      return [dot(tl, 1), dot(tr, 2), dot(ml, 3), dot(mr, 4), dot(bl, 5), dot(br, 6)];
    default:
      return null;
  }
}
function Die({
  value,
  held,
  onToggle
}) {
  const size = 56;
  return /*#__PURE__*/React.createElement("button", {
    className: `relative rounded-2xl shadow-md border transition-all select-none grid place-items-center ${held ? "bg-slate-900 text-slate-50 border-slate-700" : "bg-slate-100 text-slate-900 border-slate-300"} hover:scale-[1.03] active:scale-[0.99]`,
    style: {
      width: size + 12,
      height: size + 12
    },
    onClick: onToggle,
    title: held ? "보류 해제" : "보류"
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    className: "drop-shadow-sm"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "1",
    width: size - 2,
    height: size - 2,
    rx: 12,
    className: "fill-white"
  }), /*#__PURE__*/React.createElement("g", {
    className: held ? "fill-black" : "fill-slate-800"
  }, drawPips(value, size))), held && /*#__PURE__*/React.createElement("span", {
    className: "absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow"
  }, "\uBCF4\uB958"));
}
function makeEmptyDice() {
  return Array.from({
    length: DICE_COUNT
  }, () => ({
    value: 0,
    held: false
  }));
}
function rollDice(state, canRoll) {
  if (!canRoll) return state;
  return state.map(d => d.held ? d : {
    ...d,
    value: randDie()
  });
}
function counts(dice) {
  const c = Array(7).fill(0);
  dice.forEach(d => c[d.value]++);
  return c;
}
function sum(dice) {
  return dice.reduce((acc, d) => acc + d.value, 0);
}
function sumOf(n, dice) {
  return dice.filter(d => d.value === n).reduce((acc, d) => acc + d.value, 0);
}
function hasNOfAKind(n, dice) {
  const c = counts(dice);
  return c.some(x => x >= n);
}
function isFullHouse(dice) {
  const c = counts(dice).filter(Boolean); // remove zeros
  // exactly one triple and one pair (not 5 of a kind)
  return c.sort((a, b) => a - b).join(",") === "2,3";
}
function isLittleStraight(dice) {
  const c = counts(dice);
  return c[1] === 1 && c[2] === 1 && c[3] === 1 && c[4] === 1 && c[5] === 1 && c[6] === 0;
}
function isBigStraight(dice) {
  const c = counts(dice);
  return c[1] === 0 && c[2] === 1 && c[3] === 1 && c[4] === 1 && c[5] === 1 && c[6] === 1;
}
function isYacht(dice) {
  return counts(dice).some(x => x === 5);
}
const CATEGORY_DEFS = [{
  key: "ones",
  label: "Ones (1)",
  desc: "1의 총합",
  score: d => sumOf(1, d)
}, {
  key: "twos",
  label: "Twos (2)",
  desc: "2의 총합",
  score: d => sumOf(2, d)
}, {
  key: "threes",
  label: "Threes (3)",
  desc: "3의 총합",
  score: d => sumOf(3, d)
}, {
  key: "fours",
  label: "Fours (4)",
  desc: "4의 총합",
  score: d => sumOf(4, d)
}, {
  key: "fives",
  label: "Fives (5)",
  desc: "5의 총합",
  score: d => sumOf(5, d)
}, {
  key: "sixes",
  label: "Sixes (6)",
  desc: "6의 총합",
  score: d => sumOf(6, d)
}, {
  key: "choice",
  label: "Choice",
  desc: "주사위 합계",
  score: d => sum(d)
}, {
  key: "fourKind",
  label: "Four of a Kind",
  desc: "동일 눈 4개 이상 → 그 4개의 합",
  score: d => {
    const c = counts(d);
    for (let face = 6; face >= 1; face--) {
      if (c[face] >= 4) return face * 4; // only the four identical dice
    }
    return 0;
  }
}, {
  key: "fullHouse",
  label: "Full House",
  desc: "트리플+페어 → 합계",
  score: d => isFullHouse(d) ? sum(d) : 0
}, {
  key: "littleStraight",
  label: "Little Straight",
  desc: "1-2-3-4-5 → 30점",
  score: d => isLittleStraight(d) ? 30 : 0
}, {
  key: "bigStraight",
  label: "Big Straight",
  desc: "2-3-4-5-6 → 30점",
  score: d => isBigStraight(d) ? 30 : 0
}, {
  key: "yacht",
  label: "Yacht",
  desc: "같은 눈 5개 → 50점",
  score: d => isYacht(d) ? 50 : 0
}];
function useLocalState(key, initial) {
  // Simple localStorage-backed state, for convenience between refreshes
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const wrappedSet = val => {
    setState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return [state, wrappedSet];
}
export default function YachtGame() {
  const [dice, setDice] = useLocalState("yacht_dice", makeEmptyDice());
  const [rolls, setRolls] = useLocalState("yacht_rolls", 0);
  const [scores, setScores] = useLocalState("yacht_scores", Object.fromEntries(CATEGORY_DEFS.map(c => [c.key, null])));
  const canRoll = rolls < MAX_ROLLS_PER_ROUND && Object.values(scores).some(v => v === null);
  const allScored = Object.values(scores).every(v => v !== null);
  const rolledThisRound = rolls > 0;
  const candidateScores = useMemo(() => {
    // Compute potential score for each category based on current dice
    const actualDice = dice.every(d => d.value > 0) ? dice : dice.map(d => ({
      ...d,
      value: 0
    }));
    const cand = {};
    CATEGORY_DEFS.forEach(c => {
      cand[c.key] = c.score(dice);
    });
    return cand;
  }, [dice]);
  const bestCategoryKey = useMemo(() => {
    let bestKey = null;
    let bestVal = -1;
    CATEGORY_DEFS.forEach(c => {
      if (scores[c.key] === null) {
        const val = candidateScores[c.key] ?? 0;
        if (val > bestVal) {
          bestVal = val;
          bestKey = c.key;
        }
      }
    });
    return bestKey;
  }, [candidateScores, scores]);
  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
  }, [scores]);
  function startNewRound() {
    setDice(makeEmptyDice());
    setRolls(0);
  }
  function handleRoll() {
    if (!canRoll) return;
    setDice(prev => rollDice(prev.map(d => d.value === 0 ? {
      ...d,
      value: randDie()
    } : d), true));
    setRolls(r => r + 1);
  }
  function toggleHold(i) {
    setDice(prev => prev.map((d, idx) => idx === i ? {
      ...d,
      held: !d.held
    } : d));
  }
  function clearHolds() {
    setDice(prev => prev.map(d => ({
      ...d,
      held: false
    })));
  }
  function commitScore(key) {
    if (!rolledThisRound) return; // must roll at least once before scoring
    if (scores[key] !== null) return; // already used
    const val = candidateScores[key] ?? 0; // zero allowed (strike)
    setScores(prev => ({
      ...prev,
      [key]: val
    }));
    // prepare next round
    setTimeout(() => {
      startNewRound();
    }, 150);
  }
  function resetGame() {
    setScores(Object.fromEntries(CATEGORY_DEFS.map(c => [c.key, null])));
    startNewRound();
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen w-full bg-slate-950 text-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto p-4 sm:p-6"
  }, /*#__PURE__*/React.createElement("header", {
    className: "flex items-center justify-between gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-2 rounded-xl bg-slate-900 ring-1 ring-slate-800"
  }, /*#__PURE__*/React.createElement(Dice5, {
    className: "w-6 h-6"
  })), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl sm:text-3xl font-bold"
  }, "Yacht \uC8FC\uC0AC\uC704 \uAC8C\uC784")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: resetGame,
    className: "inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] ring-1 ring-slate-700"
  }, /*#__PURE__*/React.createElement(RotateCcw, {
    className: "w-4 h-4"
  }), " \uC0C8 \uAC8C\uC784"))), /*#__PURE__*/React.createElement("section", {
    className: "grid lg:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-300"
  }, "\uB77C\uC6B4\uB4DC \uAD74\uB9AC\uAE30: ", /*#__PURE__*/React.createElement("b", null, rolls), "/", /*#__PURE__*/React.createElement("b", null, MAX_ROLLS_PER_ROUND)), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-300"
  }, "\uCD1D\uC810: ", /*#__PURE__*/React.createElement("b", {
    className: "text-white"
  }, totalScore))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-5 gap-2 place-items-center"
  }, dice.map((d, i) => /*#__PURE__*/React.createElement(Die, {
    key: i,
    value: d.value || 1,
    held: d.held,
    onToggle: () => toggleHold(i)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleRoll,
    disabled: !canRoll,
    className: `inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold ring-1 transition ${canRoll ? "bg-emerald-500/90 hover:bg-emerald-500 ring-emerald-400 text-white" : "bg-slate-800 ring-slate-700 text-slate-400 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    className: "w-4 h-4"
  }), " \uAD74\uB9AC\uAE30"), /*#__PURE__*/React.createElement("button", {
    onClick: clearHolds,
    className: "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl ring-1 ring-slate-700 bg-slate-800 hover:bg-slate-700"
  }, "\uBCF4\uB958 \uD574\uC81C")), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-xs text-slate-400 leading-relaxed"
  }, "\uC6D0\uD558\uB294 \uC8FC\uC0AC\uC704\uB97C \uBCF4\uB958(\uD074\uB9AD)\uD558\uACE0 \uB098\uBA38\uC9C0\uB9CC \uB2E4\uC2DC \uAD74\uB9AC\uC138\uC694. \uB77C\uC6B4\uB4DC\uB2F9 \uCD5C\uB300 2\uBC88\uAE4C\uC9C0 \uB2E4\uC2DC \uB358\uC9C8 \uC218 \uC788\uC5B4 \uD55C \uB77C\uC6B4\uB4DC\uC5D0 \uCD1D 3\uBC88 \uAD74\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uAD74\uB9B0 \uB4A4\uC5D0\uB294 \uC810\uC218\uD45C\uC5D0\uC11C *\uC544\uC9C1 \uBE44\uC5B4 \uC788\uB294* \uD55C \uC871\uBCF4\uB97C \uC120\uD0DD\uD574 \uC810\uC218\uB97C \uAE30\uB85D\uD574\uC57C \uD569\uB2C8\uB2E4. \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uC9C0 \uC54A\uC73C\uBA74 0\uC810\uC744 \uAE30\uB85D\uD569\uB2C8\uB2E4.")), allScored && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-900 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 font-bold text-lg"
  }, /*#__PURE__*/React.createElement(PartyPopper, {
    className: "w-5 h-5"
  }), " \uAC8C\uC784 \uC885\uB8CC! \uCD5C\uC885 \uC810\uC218: ", totalScore), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm"
  }, "\uC0C8 \uAC8C\uC784\uC744 \uB20C\uB7EC \uB2E4\uC2DC \uC2DC\uC791\uD558\uC138\uC694."))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800 shadow-xl"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold mb-3"
  }, "\uC810\uC218\uD45C"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-hidden rounded-xl ring-1 ring-slate-800"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-slate-850"
  }, /*#__PURE__*/React.createElement("tr", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 w-[34%]"
  }, "\uC871\uBCF4"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2"
  }, "\uC124\uBA85"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-right"
  }, "\uAC00\uB2A5 \uC810\uC218"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-right"
  }, "\uAE30\uB85D"))), /*#__PURE__*/React.createElement("tbody", null, CATEGORY_DEFS.map(c => {
    const used = scores[c.key] !== null;
    const value = used ? scores[c.key] : candidateScores[c.key] ?? 0;
    const isBest = !used && c.key === bestCategoryKey && rolledThisRound;
    return /*#__PURE__*/React.createElement("tr", {
      key: c.key,
      className: `border-t border-slate-800 ${isBest ? "bg-emerald-500/10" : ""}`
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-2 font-medium"
    }, c.label), /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-2 text-slate-300"
    }, c.desc), /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-2 text-right font-mono"
    }, used ? /*#__PURE__*/React.createElement("span", {
      className: "text-slate-200"
    }, value) : /*#__PURE__*/React.createElement("span", {
      className: isBest ? "text-emerald-400" : "text-slate-200"
    }, value)), /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-2 text-right"
    }, used ? /*#__PURE__*/React.createElement("span", {
      className: "px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 ring-1 ring-slate-700"
    }, "\uC644\uB8CC") : /*#__PURE__*/React.createElement("button", {
      onClick: () => commitScore(c.key),
      disabled: !rolledThisRound,
      className: `px-3 py-1 rounded-lg text-xs font-semibold ring-1 transition ${rolledThisRound ? "bg-blue-500/90 hover:bg-blue-500 ring-blue-400 text-white" : "bg-slate-800 ring-slate-700 text-slate-400 cursor-not-allowed"}`,
      title: rolledThisRound ? "이 족보에 점수 기록" : "먼저 주사위를 굴리세요"
    }, "\uAE30\uB85D")));
  })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-slate-700"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 font-bold"
  }, "\uD569\uACC4"), /*#__PURE__*/React.createElement("td", null), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 text-right font-bold"
  }, totalScore), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2 text-right"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-xs text-slate-400 leading-relaxed"
  }, /*#__PURE__*/React.createElement("p", {
    className: "mb-1"
  }, "\uADDC\uCE59 \uCC38\uACE0:"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-5 space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "Four of a Kind\uC740 \uAC19\uC740 \uB208\uC774 4\uAC1C \uC774\uC0C1\uC77C \uB54C \uADF8 ", /*#__PURE__*/React.createElement("b", null, "4\uAC1C"), "\uC758 \uD569\uC73C\uB85C \uACC4\uC0B0\uD569\uB2C8\uB2E4. (\uC608: 6,6,6,6,5 \u2192 24)"), /*#__PURE__*/React.createElement("li", null, "Full House\uB294 \uC815\uD655\uD788 3\uAC1C+2\uAC1C \uC870\uD569\uB9CC \uC778\uC815\uD569\uB2C8\uB2E4. Yacht(\uAC19\uC740 \uB208 5\uAC1C)\uB294 Full House\uB85C \uCDE8\uAE09\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("li", null, "Little Straight: 1-2-3-4-5 (\uC911\uBCF5 \uC5C6\uC74C), Big Straight: 2-3-4-5-6 (\uC911\uBCF5 \uC5C6\uC74C)"), /*#__PURE__*/React.createElement("li", null, "\uC870\uAC74\uC774 \uC548 \uB9DE\uC544\uB3C4 \uC6D0\uD558\uB294 \uC871\uBCF4\uC5D0 0\uC810\uC73C\uB85C \uAE30\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4(\uC758\uBB34 \uAE30\uB85D)."))))))));
}
