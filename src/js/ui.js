/**
 * ui.js — DOM操作・表示制御
 */

const UI = (() => {
  const els = {};
  const MOBILE_BREAKPOINT = '(max-width: 767px)';
  let wasMobileLayout = null;

  function init() {
    els.chapterLabel = document.getElementById('chapter-label');
    els.chapterSub = document.getElementById('chapter-sub');
    els.progressFill = document.getElementById('progress-fill');
    els.sceneBox = document.querySelector('.scene-box');
    els.sceneChar = document.getElementById('scene-char');
    els.sceneText = document.getElementById('scene-text');
    els.terminalOut = document.getElementById('terminal-out');
    els.choicesBox = document.getElementById('choices-box');
    els.feedbackBox = document.getElementById('feedback-box');
    els.nextBtn = document.getElementById('next-btn');
    els.legend = document.getElementById('legend');
    els.storyScroll = document.getElementById('story-scroll');
    els.titleScreen = document.getElementById('title-screen');
    els.clearScreen = document.getElementById('clear-screen');
    els.statCorrect = document.getElementById('stat-correct');
    els.statTotal = document.getElementById('stat-total');
    els.resumeBtn = document.getElementById('resume-btn');
    els.graphPanel = document.getElementById('graph-panel');
    els.storyPanel = document.getElementById('story-panel');
    els.graphToggle = document.getElementById('graph-toggle');
    els.storyToggle = document.getElementById('story-toggle');

    _applyResponsivePanelDefaults(true);
    window.addEventListener('resize', () => _applyResponsivePanelDefaults());
  }

  function setChapter(title, subtitle) {
    els.chapterLabel.textContent = title;
    els.chapterSub.textContent = subtitle;
  }

  function setProgress(ratio) {
    const progress = Math.max(0, Math.min(1, ratio));
    els.progressFill.style.width = progress * 100 + '%';
  }

  function renderScene(scene, onChoice, onNext) {
    const hasSpeaker = Boolean(scene.char);
    const choiceStyle = scene.choiceStyle || 'command';

    els.sceneBox.classList.toggle('narration', !hasSpeaker);
    els.sceneChar.textContent = hasSpeaker ? scene.char : 'NARRATION';
    els.sceneChar.classList.toggle('scene-character--narration', !hasSpeaker);

    els.sceneText.innerHTML = '';
    _typewrite(els.sceneText, scene.text || '');

    if (scene.terminal) {
      els.terminalOut.textContent = scene.terminal;
      els.terminalOut.classList.add('show');
    } else {
      els.terminalOut.classList.remove('show');
      els.terminalOut.textContent = '';
    }

    els.choicesBox.innerHTML = '';
    els.choicesBox.dataset.choiceStyle = choiceStyle;

    if (scene.choices) {
      scene.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        const prefix = document.createElement('span');
        const body = document.createElement('span');

        btn.type = 'button';
        btn.className = `choice-btn choice-btn--${choiceStyle}`;
        btn.onclick = () => onChoice(choice, idx);

        prefix.className = 'choice-prefix';
        prefix.textContent =
          choiceStyle === 'command' ? '$' : String.fromCharCode(65 + idx);
        body.className = 'choice-body';
        body.textContent = choice.label;

        btn.append(prefix, body);
        els.choicesBox.appendChild(btn);
      });
    }

    els.feedbackBox.className = 'feedback-box';
    els.feedbackBox.textContent = '';

    if (!scene.choices) {
      els.nextBtn.classList.add('show');
      els.nextBtn.textContent = scene.nextLabel || '次の駅へ';
      els.nextBtn.onclick = onNext;
    } else {
      els.nextBtn.classList.remove('show');
      els.nextBtn.onclick = null;
    }

    resetStoryScroll();
  }

  function showChoiceResult(choiceIdx, isCorrect, correctIdx, feedback, onNext) {
    const buttons = els.choicesBox.querySelectorAll('.choice-btn');
    buttons.forEach((btn, idx) => {
      if (idx === choiceIdx) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      } else if (idx === correctIdx) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('disabled');
      }
      btn.disabled = true;
    });

    els.feedbackBox.textContent = feedback;
    els.feedbackBox.className =
      'feedback-box show ' + (isCorrect ? 'ok' : 'ng');

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

  function toggleGraphPanel() {
    els.graphPanel.classList.toggle('collapsed');
    syncPanelState();
  }

  function toggleStoryPanel() {
    els.storyPanel.classList.toggle('collapsed');
    syncPanelState();
  }

  function syncPanelState() {
    const graphExpanded = !els.graphPanel.classList.contains('collapsed');
    const storyExpanded = !els.storyPanel.classList.contains('collapsed');

    els.graphToggle.textContent = graphExpanded ? '路線図を閉じる' : '路線図を表示';
    els.graphToggle.setAttribute('aria-expanded', String(graphExpanded));

    els.storyToggle.textContent = storyExpanded ? '問題を閉じる' : '問題を表示';
    els.storyToggle.setAttribute('aria-expanded', String(storyExpanded));
  }

  function resetStoryScroll() {
    if (!els.storyScroll) return;
    if (typeof els.storyScroll.scrollTo === 'function') {
      els.storyScroll.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    els.storyScroll.scrollTop = 0;
  }

  function _isMobileLayout() {
    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  }

  function _applyResponsivePanelDefaults(force = false) {
    const mobile = _isMobileLayout();
    if (!force && mobile === wasMobileLayout) {
      return;
    }

    wasMobileLayout = mobile;

    if (mobile) {
      els.graphPanel.classList.add('collapsed');
      els.storyPanel.classList.remove('collapsed');
    } else {
      els.graphPanel.classList.remove('collapsed');
      els.storyPanel.classList.remove('collapsed');
    }

    syncPanelState();
  }

  function _typewrite(el, html) {
    el.innerHTML = html;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.28s ease';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  }

  return {
    init,
    setChapter,
    setProgress,
    renderScene,
    showChoiceResult,
    showTitle,
    hideTitle,
    showClear,
    hideClear,
    toggleGraphPanel,
    toggleStoryPanel,
    syncPanelState,
    resetStoryScroll,
  };
})();
