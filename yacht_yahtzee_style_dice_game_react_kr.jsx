/* Babel Standalone + UMD용 (import/export, lucide-react 사용 안 함) */
const { useMemo, useState } = React;

const DICE_COUNT = 5;
const MAX_ROLLS_PER_ROUND = 3; // up to 3 total throws per round

function randDie() {
  return Math.floor(Math.random() * 6) + 1; // 1..6
}

function pipPositions(size = 40) {
  const s = size;
  const m = s / 6; // margin
  return [
    [m * 1.4, m * 1.4], // tl
    [s / 2, s / 2], // center
    [s - m * 1.4, s - m * 1.4], // br
    [s - m * 1.4, m * 1.4], // tr
    [m * 1.4, s - m * 1.4], // bl
    [m * 1.4, s / 2], // ml
    [s - m * 1.4, s / 2], // mr
  ];
}

function drawPips(num, size = 40) {
  const [tl, c, br, tr, bl, ml, mr] = pipPositions(size);
  const dot = (pos, i) => <circle key={i} cx={pos[0]} cy={pos[1]} r={size / 12} />;
  switch (num) {
    case 1: return [dot(c, 1)];
    case 2: return [dot(tl, 1), dot(br, 2)];
    case 3: return [dot(tl, 1), dot(c, 2), dot(br, 3)];
    case 4: return [dot(tl, 1), dot(tr, 2), dot(bl, 3), dot(br, 4)];
    case 5: return [dot(tl, 1), dot(tr, 2), dot(c, 3), dot(bl, 4), dot(br, 5)];
    case 6: return [dot(tl, 1), dot(tr, 2), dot(ml, 3), dot(mr, 4), dot(bl, 5), dot(br, 6)];
    default: return null;
  }
}

function Die({ value, held, onToggle }) {
  const size = 56;
  return (
    <button
      className={`relative rounded-2xl shadow-md border transition-all select-none grid place-items-center ${
        held ? "bg-slate-900 text-slate-50 border-slate-700" : "bg-slate-100 text-slate-900 border-slate-300"
      } hover:scale-[1.03] active:scale-[0.99]`}
      style={{ width: size + 12, height: size + 12 }}
      onClick={onToggle}
      title={held ? "보류 해제" : "보류"}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <rect x="1" y="1" width={size - 2} height={size - 2} rx={12} className="fill-white" />
        <g className={held ? "fill-black" : "fill-slate-800"}>{drawPips(value, size)}</g>
      </svg>
      {held && (
        <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
          보류
        </span>
      )}
    </button>
  );
}

function makeEmptyDice() {
  return Array.from({ length: DICE_COUNT }, () => ({ value: 0, held: false }));
}

function rollDice(state, canRoll) {
  if (!canRoll) return state;
  return state.map((d) => (d.held ? d : { ...d, value: randDie() }));
}

function counts(dice) {
  const c = Array(7).fill(0);
  dice.forEach((d) => c[d.value]++);
  return c;
}

function sum(dice) {
  return dice.reduce((acc, d) => acc + d.value, 0);
}

function sumOf(n, dice) {
  return dice.filter((d) => d.value === n).reduce((acc, d) => acc + d.value, 0);
}

function hasNOfAKind(n, dice) {
  const c = counts(dice);
  return c.some((x) => x >= n);
}

function isFullHouse(dice) {
  const c = counts(dice).filter(Boolean); // remove zeros
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
  return counts(dice).some((x) => x === 5);
}

const CATEGORY_DEFS = [
  { key: "ones", label: "Ones (1)", desc: "1의 총합", score: (d) => sumOf(1, d) },
  { key: "twos", label: "Twos (2)", desc: "2의 총합", score: (d) => sumOf(2, d) },
  { key: "threes", label: "Threes (3)", desc: "3의 총합", score: (d) => sumOf(3, d) },
  { key: "fours", label: "Fours (4)", desc: "4의 총합", score: (d) => sumOf(4, d) },
  { key: "fives", label: "Fives (5)", desc: "5의 총합", score: (d) => sumOf(5, d) },
  { key: "sixes", label: "Sixes (6)", desc: "6의 총합", score: (d) => sumOf(6, d) },
  { key: "choice", label: "Choice", desc: "주사위 합계", score: (d) => sum(d) },
  {
    key: "fourKind",
    label: "Four of a Kind",
    desc: "동일 눈 4개 이상 → 그 4개의 합",
    score: (d) => {
      const c = counts(d);
      for (let face = 6; face >= 1; face--) {
        if (c[face] >= 4) return face * 4;
      }
      return 0;
    },
  },
  { key: "fullHouse", label: "Full House", desc: "트리플+페어 → 합계", score: (d) => (isFullHouse(d) ? sum(d) : 0) },
  { key: "littleStraight", label: "Little Straight", desc: "1-2-3-4-5 → 30점", score: (d) => (isLittleStraight(d) ? 30 : 0) },
  { key: "bigStraight", label: "Big Straight", desc: "2-3-4-5-6 → 30점", score: (d) => (isBigStraight(d) ? 30 : 0) },
  { key: "yacht", label: "Yacht", desc: "같은 눈 5개 → 50점", score: (d) => (isYacht(d) ? 50 : 0) },
];

function useLocalState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const wrappedSet = (val) => {
    setState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [state, wrappedSet];
}

function App() {
  const [dice, setDice] = useLocalState("yacht_dice", makeEmptyDice());
  const [rolls, setRolls] = useLocalState("yacht_rolls", 0);
  const [scores, setScores] = useLocalState(
    "yacht_scores",
    Object.fromEntries(CATEGORY_DEFS.map((c) => [c.key, null]))
  );

  const canRoll = rolls < MAX_ROLLS_PER_ROUND && Object.values(scores).some((v) => v === null);
  const allScored = Object.values(scores).every((v) => v !== null);
  const rolledThisRound = rolls > 0;

  const candidateScores = useMemo(() => {
    const cand = {};
    CATEGORY_DEFS.forEach((c) => { cand[c.key] = c.score(dice); });
    return cand;
  }, [dice]);

  const bestCategoryKey = useMemo(() => {
    let bestKey = null, bestVal = -1;
    CATEGORY_DEFS.forEach((c) => {
      if (scores[c.key] === null) {
        const val = candidateScores[c.key] ?? 0;
        if (val > bestVal) { bestVal = val; bestKey = c.key; }
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
    setDice((prev) => rollDice(prev.map((d) => (d.value === 0 ? { ...d, value: randDie() } : d)), true));
    setRolls((r) => r + 1);
  }

  function toggleHold(i) {
    setDice((prev) => prev.map((d, idx) => (idx === i ? { ...d, held: !d.held } : d)));
  }

  function clearHolds() {
    setDice((prev) => prev.map((d) => ({ ...d, held: false })));
  }

  function commitScore(key) {
    if (!rolledThisRound) return;
    if (scores[key] !== null) return;
    const val = candidateScores[key] ?? 0; // zero allowed
    setScores((prev) => ({ ...prev, [key]: val }));
    setTimeout(() => { startNewRound(); }, 150);
  }

  function resetGame() {
    setScores(Object.fromEntries(CATEGORY_DEFS.map((c) => [c.key, null])));
    startNewRound();
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900 ring-1 ring-slate-800"><span className="text-xl">🎲</span></div>
            <h1 className="text-2xl sm:text-3xl font-bold">Yacht 주사위 게임</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetGame}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] ring-1 ring-slate-700"
            >
              <span>↺</span> 새 게임
            </button>
          </div>
        </header>

        <section className="grid lg:grid-cols-3 gap-6">
          {/* Dice + Controls */}
          <div className="lg:col-span-1">
            <div className="p-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-300">라운드 굴리기: <b>{rolls}</b>/<b>{MAX_ROLLS_PER_ROUND}</b></div>
                <div className="text-sm text-slate-300">총점: <b className="text-white">{totalScore}</b></div>
              </div>
              <div className="grid grid-cols-5 gap-2 place-items-center">
                {dice.map((d, i) => (
                  <Die key={i} value={d.value || 1} held={d.held} onToggle={() => toggleHold(i)} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleRoll}
                  disabled={!canRoll}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold ring-1 transition ${
                    canRoll
                      ? "bg-emerald-500/90 hover:bg-emerald-500 ring-emerald-400 text-white"
                      : "bg-slate-800 ring-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <span>🔄</span> 굴리기
                </button>
                <button
                  onClick={clearHolds}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl ring-1 ring-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  보류 해제
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                원하는 주사위를 보류(클릭)하고 나머지만 다시 굴리세요. 라운드당 최대 2번까지 다시 던질 수 있어 한 라운드에 총 3번 굴릴 수 있습니다. 굴린 뒤에는 점수표에서 <i>아직 비어 있는</i> 한 족보를 선택해 점수를 기록해야 합니다. 조건을 만족하지 않으면 0점을 기록합니다.
              </p>
            </div>

            {allScored && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-900 shadow-xl">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <span>🎉</span> 게임 종료! 최종 점수: {totalScore}
                </div>
                <div className="mt-2 text-sm">새 게임을 눌러 다시 시작하세요.</div>
              </div>
            )}
          </div>

          {/* Scoreboard */}
          <div className="lg:col-span-2">
            <div className="p-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800 shadow-xl">
              <h2 className="text-lg font-semibold mb-3">점수표</h2>
              <div className="overflow-hidden rounded-xl ring-1 ring-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800">
                    <tr className="text-left">
                      <th className="px-3 py-2 w-[34%]">족보</th>
                      <th className="px-3 py-2">설명</th>
                      <th className="px-3 py-2 text-right">가능 점수</th>
                      <th className="px-3 py-2 text-right">기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_DEFS.map((c) => {
                      const used = scores[c.key] !== null;
                      const value = used ? scores[c.key] : candidateScores[c.key] ?? 0;
                      const isBest = !used && c.key === bestCategoryKey && rolledThisRound;
                      return (
                        <tr key={c.key} className={`border-t border-slate-800 ${isBest ? "bg-emerald-500/10" : ""}`}>
                          <td className="px-3 py-2 font-medium">{c.label}</td>
                          <td className="px-3 py-2 text-slate-300">{c.desc}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {used ? <span className="text-slate-200">{value}</span> : <span className={isBest ? "text-emerald-400" : "text-slate-200"}>{value}</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {used ? (
                              <span className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 ring-1 ring-slate-700">완료</span>
                            ) : (
                              <button
                                onClick={() => commitScore(c.key)}
                                disabled={!rolledThisRound}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ring-1 transition ${
                                  rolledThisRound
                                    ? "bg-blue-500/90 hover:bg-blue-500 ring-blue-400 text-white"
                                    : "bg-slate-800 ring-slate-700 text-slate-400 cursor-not-allowed"
                                }`}
                                title={rolledThisRound ? "이 족보에 점수 기록" : "먼저 주사위를 굴리세요"}
                              >
                                기록
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700">
                      <td className="px-3 py-2 font-bold">합계</td>
                      <td></td>
                      <td className="px-3 py-2 text-right font-bold">{totalScore}</td>
                      <td className="px-3 py-2 text-right"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4 text-xs text-slate-400 leading-relaxed">
                <p className="mb-1">규칙 참고:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Four of a Kind은 같은 눈이 4개 이상일 때 그 <b>4개</b>의 합으로 계산합니다. (예: 6,6,6,6,5 → 24)</li>
                  <li>Full House는 정확히 3개+2개 조합만 인정합니다. Yacht(같은 눈 5개)는 Full House로 취급하지 않습니다.</li>
                  <li>Little Straight: 1-2-3-4-5 (중복 없음), Big Straight: 2-3-4-5-6 (중복 없음)</li>
                  <li>조건이 안 맞아도 원하는 족보에 0점으로 기록할 수 있습니다(의무 기록).</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* 렌더 호출은 컴포넌트 밖, 파일 맨 아래 */
document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
});
