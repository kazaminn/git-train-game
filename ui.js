/**
 * ui.js — DOM操作・表示制御
 */

const UI = (() => {
  const els = {};

  function init() {
    els.chapterLabel = document.getElementById('chapter-label');
    els.chapterSub = document.getElementById('chapter-sub');
    els.progressFill = document.getElementById('progress-fill');
    els.sceneChar = document.getElementById('scene-char');
    els.sceneText = document.getElementById('scene-text');
    els.terminalOut = document.getElementById('terminal-out');
    els.choicesBox = document.getElementById('choices-box');
    els.feedbackBox = document.getElementById('feedback-box');
    els.nextBtn = document.getElementById('next-btn');
    els.graphSvg = document.getElementById('graph');
    els.legend = document.getElementById('legend');
    els.titleScreen = document.getElementById('title-screen');
    els.clearScreen = document.getElementById('clear-screen');
    els.statCorrect = document.getElementById('stat-correct');
    els.statTotal = document.getElementById('stat-total');
    els.resumeBtn = document.getElementById('resume-btn');
  }

  function setChapter(title, subtitle) {
    els.chapterLabel.textContent = title;
    els.chapterSub.textContent = subtitle;
  }

  function setProgress(ratio) {
    els.progressFill.style.width = (ratio * 100) + '%';
  }

  function renderScene(scene, onChoice, onNext) {
    // キャラクター
    els.sceneChar.textContent = scene.char;

    // テキスト（タイプライター風）
    els.sceneText.innerHTML = '';
    _typewrite(els.sceneText, scene.text);

    // ターミナル出力
    if (scene.terminal) {
      els.terminalOut.textContent = scene.terminal;
      els.terminalOut.classList.add('show');
    } else {
      els.terminalOut.classList.remove('show');
    }

    // 選択肢
    els.choicesBox.innerHTML = '';
    if (scene.choices) {
      scene.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<span class="choice-prefix">$</span> ${c.label}`;
        btn.onclick = () => onChoice(c, i);
        els.choicesBox.appendChild(btn);
      });
    }

    // フィードバック非表示
    els.feedbackBox.className = 'feedback-box';
    els.feedbackBox.textContent = '';

    // 次へボタン
    if (!scene.choices) {
      els.nextBtn.classList.add('show');
      els.nextBtn.textContent = scene.nextLabel || '次の駅へ';
      els.nextBtn.onclick = onNext;
    } else {
      els.nextBtn.classList.remove('show');
    }
  }

  function showChoiceResult(choiceIdx, isCorrect, correctIdx, feedback, onNext) {
    const buttons = els.choicesBox.querySelectorAll('.choice-btn');
    buttons.forEach((btn, i) => {
      if (i === choiceIdx) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      } else if (i === correctIdx) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('disabled');
      }
      btn.style.pointerEvents = 'none';
    });

    els.feedbackBox.textContent = feedback;
    els.feedbackBox.className = 'feedback-box show ' + (isCorrect ? 'ok' : 'ng');

    els.nextBtn.classList.add('show');
    els.nextBtn.textContent = '次の駅へ';
    els.nextBtn.onclick = onNext;
  }

  function showTitle(hasSave) {
    els.titleScreen.style.display = 'flex';
    if (els.resumeBtn) {
      els.resumeBtn.style.display = hasSave ? 'inline-block' : 'none';
    }
  }

  function hideTitle() {
    els.titleScreen.style.display = 'none';
  }

  function showClear(correct, total) {
    els.statCorrect.textContent = correct;
    els.statTotal.textContent = total;
    els.clearScreen.classList.add('show');
  }

  function hideClear() {
    els.clearScreen.classList.remove('show');
  }

  // タイプライター効果（HTMLタグ対応）
  function _typewrite(el, html) {
    el.innerHTML = html;
    // シンプルにフェードインで代用（HTML構造を壊さないため）
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }

  return { init, setChapter, setProgress, renderScene, showChoiceResult, showTitle, hideTitle, showClear, hideClear };
})();
