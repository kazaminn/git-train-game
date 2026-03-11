/**
 * engine.js — ゲームエンジン
 * シーン遷移、スコア管理、セーブ/ロード
 */

const Engine = (() => {
  let chapters = [];
  let chapterIdx = 0;
  let sceneIdx = 0;
  let correctCount = 0;
  let totalQuestions = 0;
  let answered = false;

  const SAVE_KEY = 'git-train-save';

  // --- データ読み込み ---
  async function loadData() {
    const [chapRes, graphRes] = await Promise.all([
      fetch('data/chapters.json'),
      fetch('data/graph-states.json'),
    ]);
    chapters = await chapRes.json();
    const graphStates = await graphRes.json();
    Graph.loadStates(graphStates);
  }

  // --- セーブ/ロード ---
  function save() {
    const data = { chapterIdx, sceneIdx, correctCount, totalQuestions };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      /* 無視 */
    }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      /* 無視 */
    }
  }

  function hasSave() {
    return !!loadSave();
  }

  // --- ゲーム制御 ---
  function start(resume = false) {
    if (resume) {
      const s = loadSave();
      if (s) {
        chapterIdx = s.chapterIdx;
        sceneIdx = s.sceneIdx;
        correctCount = s.correctCount;
        totalQuestions = s.totalQuestions;
      }
    } else {
      chapterIdx = 0;
      sceneIdx = 0;
      correctCount = 0;
      totalQuestions = 0;
      clearSave();
    }
    UI.hideTitle();
    UI.hideClear();
    renderCurrentScene();
  }

  function restart() {
    UI.hideClear();
    start(false);
  }

  function currentChapter() {
    return chapters[chapterIdx];
  }
  function currentScene() {
    return currentChapter().scenes[sceneIdx];
  }

  function totalSceneCount() {
    return chapters.reduce((sum, ch) => sum + ch.scenes.length, 0);
  }

  function scenesSoFar() {
    let count = 0;
    for (let i = 0; i < chapterIdx; i++) count += chapters[i].scenes.length;
    return count + sceneIdx;
  }

  function renderCurrentScene() {
    const ch = currentChapter();
    const scene = currentScene();

    UI.setChapter(ch.title, ch.subtitle);
    UI.setProgress(scenesSoFar() / totalSceneCount());
    Graph.draw(scene.graph);
    Graph.drawLegend(document.getElementById('legend'), ch.legend);

    answered = false;

    if (scene.choices) {
      totalQuestions = Math.max(
        totalQuestions,
        chapters
          .slice(0, chapterIdx)
          .reduce((s, c) => s + c.scenes.filter((sc) => sc.choices).length, 0) +
          currentChapter()
            .scenes.slice(0, sceneIdx + 1)
            .filter((sc) => sc.choices).length
      );
    }

    UI.renderScene(scene, handleChoice, nextScene);
  }

  function handleChoice(choice, idx) {
    if (answered) return;
    answered = true;

    const scene = currentScene();
    const correctIdx = scene.choices.findIndex((c) => c.correct);

    if (choice.correct) correctCount++;

    const feedback = choice.correct ? scene.feedback.ok : scene.feedback.ng;
    UI.showChoiceResult(idx, choice.correct, correctIdx, feedback, nextScene);
    save();
  }

  function nextScene() {
    const scene = currentScene();
    if (scene.isLast) {
      // 最終章なら完了画面
      if (chapterIdx >= chapters.length - 1) {
        showComplete();
        return;
      }
      // 次の章へ
      chapterIdx++;
      sceneIdx = 0;
    } else {
      sceneIdx++;
      if (sceneIdx >= currentChapter().scenes.length) {
        chapterIdx++;
        sceneIdx = 0;
        if (chapterIdx >= chapters.length) {
          showComplete();
          return;
        }
      }
    }
    save();
    renderCurrentScene();
  }

  function showComplete() {
    clearSave();
    const total = chapters.reduce(
      (s, c) => s + c.scenes.filter((sc) => sc.choices).length,
      0
    );
    UI.showClear(correctCount, total);
  }

  // --- 初期化 ---
  async function init() {
    UI.init();
    Graph.init(document.getElementById('graph'));
    await loadData();
    UI.showTitle(hasSave());
  }

  return { init, start, restart, hasSave };
})();

// 起動
document.addEventListener('DOMContentLoaded', () => {
  Engine.init();
});
