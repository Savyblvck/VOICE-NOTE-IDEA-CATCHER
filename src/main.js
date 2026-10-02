import './style.css';
import {
  createIcons,
  Footprints, Mic, MicOff, Sparkles, CheckSquare, Clock, Settings,
  Sun, Share, Lock, Unlock, Play, Pause, Square, Check,
  Compass, Activity, Volume2, Trash2, Search, Copy, Flame,
  Star, Edit3, ChevronDown, Cpu, Database, Download, RotateCcw,
  X, CheckCircle, Info, FileText
} from 'lucide';
import confetti from 'canvas-confetti';

const appIcons = {
  Footprints, Mic, MicOff, Sparkles, CheckSquare, Clock, Settings,
  Sun, Share, Lock, Unlock, Play, Pause, Square, Check,
  Compass, Activity, Volume2, Trash2, Search, Copy, Flame,
  Star, Edit3, ChevronDown, Cpu, Database, Download, RotateCcw,
  X, CheckCircle, Info, FileText
};

import { storage, getAudioBlob } from './modules/storage.js';
import { soundEffects } from './modules/soundEffects.js';
import { AudioRecorderEngine } from './modules/audioRecorder.js';
import { SpeechTranscriberEngine } from './modules/speechTranscriber.js';
import { IdeaExtractorEngine } from './modules/ideaExtractor.js';
import { CanvasVisualizer } from './modules/canvasVisualizer.js';

// Application State
const state = {
  activeTab: 'recorder', // 'recorder', 'ideas', 'actions', 'sessions', 'settings'
  isRecording: false,
  isPaused: false,
  isPocketMode: false,
  walkSeconds: 0,
  walkSteps: 0,
  timerInterval: null,
  stepInterval: null,
  currentSessionId: null,
  activeFilter: 'all',
  searchQuery: '',
  editingIdeaId: null,
  currentlyPlayingSessionId: null,
  audioElement: new Audio(),
  settings: storage.getSettings()
};

// Initialize Engines
const audioEngine = new AudioRecorderEngine();
let visualizer = null;
const ideaExtractor = new IdeaExtractorEngine(state.settings);

// Speech Recognition Engine
const transcriber = new SpeechTranscriberEngine({
  language: state.settings.speechLanguage || 'en-US',
  onInterim: (interimText, fullTranscript) => {
    updateLiveTranscriptDisplay(interimText, fullTranscript);
  },
  onFinal: (finalSegment, fullTranscript) => {
    updateLiveTranscriptDisplay('', fullTranscript);
    // Sound cue when a solid sentence is completed
    if (state.settings.soundCues) {
      soundEffects.triggerHaptic([15]);
    }
  },
  onError: (err) => {
    showToast(`Microphone notice: ${err}`, 'info');
  },
  onStateChange: ({ isListening, isDemo }) => {
    // handled in UI update
  }
});

// Render Main App Shell
const appContainer = document.getElementById('app');

function initApp() {
  appContainer.innerHTML = `
    <!-- Ambient Backdrop -->
    <div class="ambient-bg">
      <div class="ambient-blob-1"></div>
      <div class="ambient-blob-2"></div>
    </div>

    <!-- Header Navigation -->
    <header class="app-header">
      <div class="brand-wrapper" id="brandHomeBtn">
        <div class="brand-logo-icon">
          <i data-lucide="footprints" style="width:22px;height:22px;"></i>
        </div>
        <div class="brand-info">
          <div class="brand-title">
            StrideNotes
            <span class="brand-badge">Walk &amp; Think</span>
          </div>
          <span class="brand-tagline">Voice-to-Idea Intelligence</span>
        </div>
      </div>

      <nav class="header-nav">
        <button class="nav-tab-btn active" data-tab="recorder" id="tabBtnRecorder">
          <i data-lucide="mic" style="width:16px;height:16px;"></i>
          <span>Walk Hub</span>
        </button>
        <button class="nav-tab-btn" data-tab="ideas" id="tabBtnIdeas">
          <i data-lucide="sparkles" style="width:16px;height:16px;"></i>
          <span>Ideas</span>
          <span class="badge-count" id="navIdeasCount">0</span>
        </button>
        <button class="nav-tab-btn" data-tab="actions" id="tabBtnActions">
          <i data-lucide="check-square" style="width:16px;height:16px;"></i>
          <span>To-Dos</span>
          <span class="badge-count" id="navActionsCount">0</span>
        </button>
        <button class="nav-tab-btn" data-tab="sessions" id="tabBtnSessions">
          <i data-lucide="clock" style="width:16px;height:16px;"></i>
          <span>Walk Logs</span>
        </button>
        <button class="nav-tab-btn" data-tab="settings" id="tabBtnSettings">
          <i data-lucide="settings" style="width:16px;height:16px;"></i>
          <span>Settings</span>
        </button>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" id="themeToggleBtn" title="Toggle Outdoor Sun / High-Contrast Mode">
          <i data-lucide="sun" style="width:18px;height:18px;"></i>
        </button>
        <button class="icon-btn" id="exportAllNavBtn" title="Export Notes &amp; Backup">
          <i data-lucide="share" style="width:18px;height:18px;"></i>
        </button>
      </div>
    </header>

    <!-- TAB 1: WALK RECORDER / HERO COCKPIT -->
    <main class="tab-view active" id="viewRecorder">
      <div class="recorder-container">
        
        <!-- Walking Cockpit -->
        <section class="walking-cockpit">
          <div class="cockpit-status-bar">
            <div class="status-indicator" id="cockpitStatus">
              <span class="status-dot"></span>
              <span id="cockpitStatusText">READY TO WALK</span>
            </div>

            <div class="cockpit-modes">
              <button class="mode-chip" id="pocketModeBtn" title="Lock screen for pocket carrying">
                <i data-lucide="lock" style="width:14px;height:14px;"></i>
                <span>Pocket Mode</span>
              </button>
              <button class="mode-chip" id="demoWalkBtn1" title="Test with simulated walk 1">
                <i data-lucide="play" style="width:12px;height:12px;"></i>
                <span>Demo Walk 1</span>
              </button>
              <button class="mode-chip" id="demoWalkBtn2" title="Test with simulated walk 2">
                <i data-lucide="play" style="width:12px;height:12px;"></i>
                <span>Demo Walk 2</span>
              </button>
            </div>
          </div>

          <!-- Walk Telemetry -->
          <div class="walk-telemetry">
            <div class="telemetry-item timer">
              <div class="telemetry-val" id="telemetryTime">00:00</div>
              <div class="telemetry-label">
                <i data-lucide="clock" style="width:12px;height:12px;"></i>
                <span>Walk Duration</span>
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-val" id="telemetrySteps">0</div>
              <div class="telemetry-label">
                <i data-lucide="footprints" style="width:12px;height:12px;"></i>
                <span>Est. Steps</span>
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-val" id="telemetryWpm">0</div>
              <div class="telemetry-label">
                <i data-lucide="activity" style="width:12px;height:12px;"></i>
                <span>Words / Min</span>
              </div>
            </div>
          </div>

          <!-- 60FPS Audio Wave & Cadence Canvas -->
          <div class="visualizer-wrapper">
            <canvas id="visualizerCanvas"></canvas>
            <div class="audio-level-meter">
              <div class="audio-level-bar" id="audioLevelBar"></div>
            </div>
          </div>

          <!-- Giant Tactile Controls (Single-Thumb Walking Friendly) -->
          <div class="cockpit-controls">
            <button class="secondary-control-btn" id="pauseResumeBtn" disabled title="Pause / Resume Walk">
              <i data-lucide="pause" id="pauseBtnIcon" style="width:22px;height:22px;"></i>
            </button>

            <button class="main-record-btn" id="mainRecordBtn" title="Start / Stop Recording Walk">
              <i data-lucide="mic" id="mainRecordIcon" style="width:38px;height:38px;"></i>
            </button>

            <button class="secondary-control-btn" id="finishWalkBtn" disabled title="Finish Walk &amp; Extract Ideas">
              <i data-lucide="check" style="width:22px;height:22px;"></i>
            </button>
          </div>

          <div class="quick-action-row">
            <span class="pill-action-btn" id="statusHintText">
              <i data-lucide="compass" style="width:14px;height:14px;"></i>
              <span>Tap microphone to start walking monologue</span>
            </span>
          </div>
        </section>

        <!-- Processing State Card (Shows during AI synthesis) -->
        <div class="processing-card" id="processingCard">
          <div class="processing-spinner"></div>
          <h3 style="font-size:1.15rem; font-weight:700;">Extracting Breakthrough Ideas...</h3>
          <p style="color:var(--text-muted); font-size:0.85rem;" id="processingMessage">
            Filtering spoken rambles, evaluating spark scores, and structuring actionable to-dos.
          </p>
        </div>

        <!-- Live Spoken Transcript Stream -->
        <section class="live-stream-card">
          <div class="stream-card-header">
            <div class="stream-card-title">
              <i data-lucide="volume-2" style="width:16px;height:16px;"></i>
              <span>Live Spoken Stream</span>
              <span class="live-badge" id="liveBadge" style="display:none;">LIVE</span>
            </div>
            <button class="tiny-action-btn" id="clearLiveTextBtn" title="Clear Text">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </div>
          <div class="live-transcript-box" id="liveTranscriptBox">
            <div class="empty-transcript-hint" id="emptyTranscriptHint">
              <i data-lucide="mic-off" style="width:16px;height:16px;"></i>
              <span>Start walking and speak freely. Your thoughts will transcribe here in real time.</span>
            </div>
            <span class="final-text" id="finalTranscriptText"></span>
            <span class="interim-text" id="interimTranscriptText"></span>
          </div>
        </section>

      </div>
    </main>

    <!-- TAB 2: MASTER IDEAS LIST VIEW -->
    <main class="tab-view" id="viewIdeas">
      <div class="ideas-view-header">
        <div class="ideas-title-row">
          <div>
            <h1 class="view-heading">
              <i data-lucide="sparkles" style="color:var(--brand-orange); width:28px; height:28px;"></i>
              Master Ideas Inbox
            </h1>
            <p class="view-subheading">Every breakthrough distilled from your walks, organized and scored.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" id="exportIdeasMarkdownBtn">
              <i data-lucide="copy" style="width:16px;height:16px;"></i>
              <span>Export as Markdown</span>
            </button>
          </div>
        </div>

        <div class="ideas-toolbar">
          <div class="search-wrapper">
            <i data-lucide="search" class="search-icon" style="width:18px;height:18px;"></i>
            <input type="text" class="search-input" id="ideasSearchInput" placeholder="Search ideas, concepts, or tags..." />
          </div>

          <div class="filter-pills-row" id="categoryFilterRow">
            <button class="filter-pill active" data-filter="all">All Ideas</button>
            <button class="filter-pill" data-filter="breakthrough">💡 Breakthroughs</button>
            <button class="filter-pill" data-filter="starred">⭐ Starred</button>
            <button class="filter-pill" data-filter="Product">#Product</button>
            <button class="filter-pill" data-filter="Strategy">#Strategy</button>
            <button class="filter-pill" data-filter="Habits">#Habits</button>
            <button class="filter-pill" data-filter="Creativity">#Creativity</button>
            <button class="filter-pill" data-filter="Engineering">#Engineering</button>
          </div>
        </div>
      </div>

      <!-- Ideas Grid -->
      <div class="ideas-grid" id="ideasGrid">
        <!-- Rendered dynamically -->
      </div>
    </main>

    <!-- TAB 3: ACTION ITEMS / CHECKLIST VIEW -->
    <main class="tab-view" id="viewActions">
      <div class="ideas-view-header">
        <div class="ideas-title-row">
          <div>
            <h1 class="view-heading">
              <i data-lucide="check-square" style="color:var(--brand-emerald); width:28px; height:28px;"></i>
              Walk Action Items
            </h1>
            <p class="view-subheading">Actionable to-dos identified from your walking thoughts.</p>
          </div>
        </div>
      </div>

      <div class="action-items-container" id="actionItemsList">
        <!-- Rendered dynamically -->
      </div>
    </main>

    <!-- TAB 4: WALK SESSIONS TIMELINE -->
    <main class="tab-view" id="viewSessions">
      <div class="ideas-view-header">
        <div class="ideas-title-row">
          <div>
            <h1 class="view-heading">
              <i data-lucide="clock" style="color:var(--brand-indigo); width:28px; height:28px;"></i>
              Walking Sessions Timeline
            </h1>
            <p class="view-subheading">Audio recordings, transcripts, and telemetry from each walk.</p>
          </div>
        </div>
      </div>

      <div class="sessions-timeline" id="sessionsTimeline">
        <!-- Rendered dynamically -->
      </div>
    </main>

    <!-- TAB 5: SETTINGS & INTELLIGENCE -->
    <main class="tab-view" id="viewSettings">
      <div class="settings-card">
        <h2 class="settings-section-title">
          <i data-lucide="cpu" style="width:20px;height:20px;color:var(--brand-orange);"></i>
          <span>AI Intelligence Engine</span>
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Google Gemini API Key (Optional)</div>
            <div class="setting-description">
              Enhance local NLP with Gemini 2.5 / 1.5 Flash for deeper contextual synthesis. Leave blank to use the built-in fast offline engine.
            </div>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <input type="password" id="geminiApiKeyInput" class="setting-input" style="max-width:none;" placeholder="AIzaSy..." value="${state.settings.geminiApiKey || ''}" />
          <button class="btn-primary" id="saveApiKeyBtn">Save Key</button>
        </div>

        <h2 class="settings-section-title" style="margin-top:16px;">
          <i data-lucide="footprints" style="width:20px;height:20px;color:var(--brand-emerald);"></i>
          <span>Walking Mode Experience</span>
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Acoustic Sound Cues</div>
            <div class="setting-description">Play audio chimes when starting, pausing, and finalizing walks</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="soundCuesToggle" ${state.settings.soundCues ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Tactile Haptics</div>
            <div class="setting-description">Gentle vibration pulses on key events on supported mobile devices</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="hapticsToggle" ${state.settings.hapticFeedback ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Speech Recognition Language</div>
            <div class="setting-description">Language dialect for the speech-to-text transcriber</div>
          </div>
          <select id="speechLangSelect" class="setting-input" style="width:auto; cursor:pointer;">
            <option value="en-US" ${state.settings.speechLanguage === 'en-US' ? 'selected' : ''}>English (US)</option>
            <option value="en-GB" ${state.settings.speechLanguage === 'en-GB' ? 'selected' : ''}>English (UK)</option>
            <option value="es-ES" ${state.settings.speechLanguage === 'es-ES' ? 'selected' : ''}>Spanish</option>
            <option value="fr-FR" ${state.settings.speechLanguage === 'fr-FR' ? 'selected' : ''}>French</option>
            <option value="de-DE" ${state.settings.speechLanguage === 'de-DE' ? 'selected' : ''}>German</option>
            <option value="ja-JP" ${state.settings.speechLanguage === 'ja-JP' ? 'selected' : ''}>Japanese</option>
          </select>
        </div>

        <h2 class="settings-section-title" style="margin-top:16px;">
          <i data-lucide="database" style="width:20px;height:20px;color:var(--brand-violet);"></i>
          <span>Data &amp; Backup</span>
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Export All Notes (JSON)</div>
            <div class="setting-description">Download complete backup of your walk logs and distilled ideas</div>
          </div>
          <button class="btn-secondary" id="exportJsonBackupBtn">
            <i data-lucide="download" style="width:16px;height:16px;"></i>
            <span>Export JSON</span>
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Reset Sample Data</div>
            <div class="setting-description">Restore original demo walking sessions and ideas</div>
          </div>
          <button class="btn-secondary" id="resetDataBtn" style="color:var(--brand-coral);">
            <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </main>

    <!-- FULLSCREEN POCKET MODE OVERLAY -->
    <div class="pocket-mode-overlay" id="pocketOverlay">
      <div class="pocket-header">
        <div class="pocket-title">Pocket Shield Active</div>
        <div class="pocket-subtitle">Screen locked to prevent phantom touches while walking</div>
      </div>

      <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
        <div class="pocket-timer" id="pocketTimer">00:00</div>
        <div class="pocket-status-tag">
          <i data-lucide="mic" style="width:16px;height:16px;"></i>
          <span id="pocketStatusText">RECORDING IN POCKET</span>
        </div>
      </div>

      <div class="pocket-unlock-area">
        <button class="pocket-unlock-btn" id="pocketUnlockBtn">
          <i data-lucide="unlock" style="width:22px;height:22px;"></i>
          <span>Tap to Unlock Screen</span>
        </button>
        <span style="font-size:0.75rem; color:var(--text-subtle);">Phone mic actively listening</span>
      </div>
    </div>

    <!-- MODAL: EXPORT TO MARKDOWN / NOTION -->
    <div class="modal-backdrop" id="exportModal">
      <div class="modal-window">
        <div class="modal-header">
          <h2 class="modal-title">Export Ideas &amp; Notes</h2>
          <button class="modal-close-btn" id="closeExportModalBtn">
            <i data-lucide="x" style="width:18px;height:18px;"></i>
          </button>
        </div>

        <p style="font-size:0.88rem; color:var(--text-muted);">
          Formatted markdown ready to paste into <strong>Notion</strong>, <strong>Apple Notes</strong>, <strong>Obsidian</strong>, or your task manager.
        </p>

        <pre class="modal-code-preview" id="markdownExportPreview"></pre>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn-secondary" id="downloadMarkdownFileBtn">
            <i data-lucide="download" style="width:16px;height:16px;"></i>
            <span>Download .md</span>
          </button>
          <button class="btn-primary" id="copyMarkdownClipboardBtn">
            <i data-lucide="copy" style="width:16px;height:16px;"></i>
            <span>Copy to Clipboard</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: EDIT IDEA -->
    <div class="modal-backdrop" id="editIdeaModal">
      <div class="modal-window">
        <div class="modal-header">
          <h2 class="modal-title">Edit Distilled Idea</h2>
          <button class="modal-close-btn" id="closeEditModalBtn">
            <i data-lucide="x" style="width:18px;height:18px;"></i>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          <label style="font-size:0.85rem; font-weight:700;">Idea Headline</label>
          <input type="text" id="editIdeaTitleInput" class="setting-input" style="max-width:none;" />

          <label style="font-size:0.85rem; font-weight:700;">Description &amp; Context</label>
          <textarea id="editIdeaDescInput" class="setting-input" style="max-width:none; height:100px; padding:10px; resize:vertical; font-family:inherit;"></textarea>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="font-size:0.85rem; font-weight:700;">Category</label>
              <select id="editIdeaCategorySelect" class="setting-input" style="max-width:none; cursor:pointer;">
                <option value="Product">Product</option>
                <option value="Strategy">Strategy</option>
                <option value="Habits">Habits</option>
                <option value="Creativity">Creativity</option>
                <option value="Engineering">Engineering</option>
                <option value="Personal">Personal</option>
                <option value="Innovation">Innovation</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700;">Spark Score (0-100)</label>
              <input type="number" id="editIdeaSparkInput" class="setting-input" style="max-width:none;" min="50" max="100" />
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
          <button class="btn-secondary" id="cancelEditIdeaBtn">Cancel</button>
          <button class="btn-primary" id="saveEditIdeaBtn">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications Container -->
    <div class="toast-container" id="toastContainer"></div>
  `;

  // Initialize Canvas Visualizer
  const canvas = document.getElementById('visualizerCanvas');
  if (canvas) {
    visualizer = new CanvasVisualizer(canvas);
  }

  // Bind Event Listeners
  bindEvents();

  // Render Initial Data
  updateCounts();
  renderIdeas();
  renderActionItems();
  renderSessions();

  // Initialize Lucide Icons
  createIcons({ icons: appIcons });
}

// Format seconds into MM:SS
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Show Toast Alert
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const iconName = type === 'success' ? 'check-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${iconName}" style="width:16px;height:16px;color:var(--brand-orange);"></i><span>${message}</span>`;
  container.appendChild(toast);
  createIcons({ icons: appIcons, nameAttr: 'data-lucide', attrs: { class: 'lucide' } });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Update Navigation Counts
function updateCounts() {
  const ideas = storage.getAllIdeas();
  const actions = storage.getAllActionItems();
  const pendingActions = actions.filter(a => !a.isDone);

  const ideasCountEl = document.getElementById('navIdeasCount');
  const actionsCountEl = document.getElementById('navActionsCount');

  if (ideasCountEl) ideasCountEl.textContent = ideas.length;
  if (actionsCountEl) actionsCountEl.textContent = pendingActions.length;
}

// Tab Switching
function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `view${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  });

  if (tabName === 'ideas') renderIdeas();
  if (tabName === 'actions') renderActionItems();
  if (tabName === 'sessions') renderSessions();

  // Recreate icons in current view
  createIcons({ icons: appIcons });
}

// Bind App Events
function bindEvents() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('brandHomeBtn')?.addEventListener('click', () => switchTab('recorder'));

  // Main Record Button
  const mainRecordBtn = document.getElementById('mainRecordBtn');
  mainRecordBtn?.addEventListener('click', handleToggleRecording);

  // Pause / Resume Button
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  pauseResumeBtn?.addEventListener('click', handleTogglePause);

  // Finish Walk Button
  const finishWalkBtn = document.getElementById('finishWalkBtn');
  finishWalkBtn?.addEventListener('click', handleFinishWalk);

  // Demo Walk Simulation Buttons
  document.getElementById('demoWalkBtn1')?.addEventListener('click', () => runDemoWalk(0));
  document.getElementById('demoWalkBtn2')?.addEventListener('click', () => runDemoWalk(1));

  // Pocket Mode Toggles
  document.getElementById('pocketModeBtn')?.addEventListener('click', enterPocketMode);
  document.getElementById('pocketUnlockBtn')?.addEventListener('click', exitPocketMode);

  // Outdoor / High-Contrast Theme Toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    document.body.classList.toggle('outdoor-mode');
    const isOutdoor = document.body.classList.contains('outdoor-mode');
    showToast(isOutdoor ? 'Outdoor High-Contrast Mode ON' : 'Dark Studio Mode ON', 'info');
  });

  // Clear live stream text
  document.getElementById('clearLiveTextBtn')?.addEventListener('click', () => {
    document.getElementById('finalTranscriptText').textContent = '';
    document.getElementById('interimTranscriptText').textContent = '';
    document.getElementById('emptyTranscriptHint').style.display = 'flex';
  });

  // Ideas Search & Category Filters
  const searchInput = document.getElementById('ideasSearchInput');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderIdeas();
  });

  document.querySelectorAll('#categoryFilterRow .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#categoryFilterRow .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter;
      renderIdeas();
    });
  });

  // Export Buttons
  document.getElementById('exportAllNavBtn')?.addEventListener('click', openExportModal);
  document.getElementById('exportIdeasMarkdownBtn')?.addEventListener('click', openExportModal);
  document.getElementById('closeExportModalBtn')?.addEventListener('click', closeExportModal);
  document.getElementById('copyMarkdownClipboardBtn')?.addEventListener('click', copyMarkdownToClipboard);
  document.getElementById('downloadMarkdownFileBtn')?.addEventListener('click', downloadMarkdownFile);

  // Settings Events
  document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
    const key = document.getElementById('geminiApiKeyInput')?.value || '';
    storage.saveSettings({ geminiApiKey: key });
    ideaExtractor.setApiKey(key);
    showToast('Gemini API Key saved!', 'success');
  });

  document.getElementById('soundCuesToggle')?.addEventListener('change', (e) => {
    storage.saveSettings({ soundCues: e.target.checked });
    state.settings.soundCues = e.target.checked;
    showToast(`Sound cues ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  document.getElementById('hapticsToggle')?.addEventListener('change', (e) => {
    storage.saveSettings({ hapticFeedback: e.target.checked });
    state.settings.hapticFeedback = e.target.checked;
  });

  document.getElementById('speechLangSelect')?.addEventListener('change', (e) => {
    storage.saveSettings({ speechLanguage: e.target.value });
    state.settings.speechLanguage = e.target.value;
    transcriber.language = e.target.value;
    showToast(`Speech language set to ${e.target.value}`);
  });

  document.getElementById('exportJsonBackupBtn')?.addEventListener('click', exportJsonBackup);
  document.getElementById('resetDataBtn')?.addEventListener('click', resetSampleData);

  // Edit Idea Modal
  document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);
  document.getElementById('cancelEditIdeaBtn')?.addEventListener('click', closeEditModal);
  document.getElementById('saveEditIdeaBtn')?.addEventListener('click', saveIdeaEdit);

  // Audio level meter monitor loop
  setInterval(() => {
    if (state.isRecording && !state.isPaused) {
      const vol = audioEngine.getVolumeLevel();
      const meterBar = document.getElementById('audioLevelBar');
      if (meterBar) {
        meterBar.style.width = Math.min(100, Math.round(vol * 180)) + '%';
      }
    }
  }, 80);
}

// Pocket Mode Handlers
function enterPocketMode() {
  state.isPocketMode = true;
  const overlay = document.getElementById('pocketOverlay');
  if (overlay) overlay.classList.add('active');
  if (state.settings.soundCues) soundEffects.triggerHaptic([40, 60]);
}

function exitPocketMode() {
  state.isPocketMode = false;
  const overlay = document.getElementById('pocketOverlay');
  if (overlay) overlay.classList.remove('active');
  if (state.settings.soundCues) soundEffects.triggerHaptic([30]);
}

// Handle Record / Stop Toggle
async function handleToggleRecording() {
  if (!state.isRecording) {
    // START RECORDING
    try {
      state.currentSessionId = 'walk-' + Date.now();
      state.walkSeconds = 0;
      state.walkSteps = 0;
      state.isRecording = true;
      state.isPaused = false;

      // Reset Live Transcript
      document.getElementById('finalTranscriptText').textContent = '';
      document.getElementById('interimTranscriptText').textContent = '';
      document.getElementById('emptyTranscriptHint').style.display = 'none';
      document.getElementById('liveBadge').style.display = 'inline-block';

      // Start Audio & Speech
      await audioEngine.start();
      transcriber.start();

      // Sound Cue
      if (state.settings.soundCues) soundEffects.playStartRecord();

      // Start Visualizer
      visualizer.start(audioEngine);

      // Start Timers
      startWalkTimers();

      // Update UI Controls
      updateRecordingUIState('recording');
      showToast('Walking note recording started. Speak your thoughts freely!', 'success');

      // Auto Pocket Lock if enabled in settings
      if (state.settings.autoPocketLock && window.innerWidth <= 640) {
        setTimeout(() => {
          if (state.isRecording && !state.isPocketMode) {
            enterPocketMode();
          }
        }, 15000); // After 15 seconds of walking
      }

    } catch (err) {
      console.error('Failed to start recording:', err);
      state.isRecording = false;
      showToast('Microphone access denied or unavailable. You can click "Demo Walk 1" to test!', 'info');
      updateRecordingUIState('idle');
    }
  } else {
    // FINISH RECORDING
    await handleFinishWalk();
  }
}

// Handle Pause / Resume
function handleTogglePause() {
  if (!state.isRecording) return;

  if (!state.isPaused) {
    // Pause
    state.isPaused = true;
    audioEngine.pause();
    visualizer.pause();
    if (state.settings.soundCues) soundEffects.playPause();
    updateRecordingUIState('paused');
    showToast('Walk paused', 'info');
  } else {
    // Resume
    state.isPaused = false;
    audioEngine.resume();
    visualizer.resume();
    if (state.settings.soundCues) soundEffects.playStartRecord();
    updateRecordingUIState('recording');
    showToast('Walk resumed', 'success');
  }
}

// Finish Walk & Extract Ideas
async function handleFinishWalk() {
  if (!state.isRecording && !transcriber.isDemoMode) return;

  // Sound Cue
  if (state.settings.soundCues) soundEffects.playSuccess();

  // Stop Timers
  clearInterval(state.timerInterval);
  clearInterval(state.stepInterval);

  // Stop Engines
  const audioResult = await audioEngine.stop(state.currentSessionId);
  const rawTranscript = transcriber.stop();
  visualizer.stop();

  if (state.isPocketMode) exitPocketMode();

  // Show Processing Banner
  const processingCard = document.getElementById('processingCard');
  if (processingCard) processingCard.classList.add('active');

  const durationSec = state.walkSeconds;
  const stepsWalked = state.walkSteps;

  try {
    // Synthesize Ideas with Local NLP or Gemini
    const result = await ideaExtractor.processWalkTranscript(rawTranscript, {
      durationSeconds: durationSec,
      steps: stepsWalked
    });

    // Create Final Walk Session Record
    const sessionRecord = {
      id: state.currentSessionId || 'walk-' + Date.now(),
      title: result.title,
      date: new Date().toISOString(),
      durationSeconds: durationSec,
      stepsEstimated: stepsWalked,
      wordCount: result.wordCount,
      paceWpm: result.paceWpm,
      tags: result.tags,
      sparkScore: result.sparkScore,
      executiveSummary: result.executiveSummary,
      transcript: rawTranscript,
      polishedTranscript: result.polishedTranscript,
      hasAudio: !!audioResult?.blob,
      ideas: result.ideas.map(i => ({ ...i, sessionId: state.currentSessionId })),
      actionItems: result.actionItems.map(a => ({ ...a, sessionId: state.currentSessionId }))
    };

    // Save to Persistent Storage
    storage.addSession(sessionRecord);

    // Confetti celebration!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Reset Recording State
    state.isRecording = false;
    state.isPaused = false;
    updateRecordingUIState('idle');

    if (processingCard) processingCard.classList.remove('active');

    // Update Counts & Refresh Views
    updateCounts();
    renderIdeas();
    renderActionItems();
    renderSessions();

    showToast(`Walk processed! ${result.ideas.length} ideas and ${result.actionItems.length} to-dos captured!`, 'success');

    // Smoothly transition to Ideas tab to admire the results!
    setTimeout(() => {
      switchTab('ideas');
    }, 900);

  } catch (err) {
    console.error('Synthesis error:', err);
    if (processingCard) processingCard.classList.remove('active');
    state.isRecording = false;
    updateRecordingUIState('idle');
    showToast('Note saved with basic extraction.', 'info');
  }
}

// Start Telemetry Timers (Duration & Estimated Steps)
function startWalkTimers() {
  clearInterval(state.timerInterval);
  clearInterval(state.stepInterval);

  // Time tracker
  state.timerInterval = setInterval(() => {
    if (!state.isPaused) {
      state.walkSeconds++;
      const timeStr = formatTime(state.walkSeconds);
      const timeEl = document.getElementById('telemetryTime');
      const pocketTimeEl = document.getElementById('pocketTimer');
      if (timeEl) timeEl.textContent = timeStr;
      if (pocketTimeEl) pocketTimeEl.textContent = timeStr;

      // Update WPM estimate
      const words = transcriber.getTranscript().split(/\s+/).filter(Boolean).length;
      if (state.walkSeconds > 5) {
        const wpm = Math.round((words / state.walkSeconds) * 60);
        const wpmEl = document.getElementById('telemetryWpm');
        if (wpmEl) wpmEl.textContent = wpm;
      }
    }
  }, 1000);

  // Walking Cadence Step Simulator (~105-115 steps/min average walk)
  state.stepInterval = setInterval(() => {
    if (!state.isPaused) {
      state.walkSteps += 1;
      const stepsEl = document.getElementById('telemetrySteps');
      if (stepsEl) stepsEl.textContent = state.walkSteps;
    }
  }, 550);
}

// Update UI Buttons and Badges during recording
function updateRecordingUIState(status) {
  const mainBtn = document.getElementById('mainRecordBtn');
  const mainIcon = document.getElementById('mainRecordIcon');
  const pauseBtn = document.getElementById('pauseResumeBtn');
  const pauseIcon = document.getElementById('pauseBtnIcon');
  const finishBtn = document.getElementById('finishWalkBtn');
  const statusEl = document.getElementById('cockpitStatus');
  const statusText = document.getElementById('cockpitStatusText');
  const hintText = document.getElementById('statusHintText');
  const liveBadge = document.getElementById('liveBadge');

  if (status === 'recording') {
    mainBtn?.classList.add('recording');
    if (mainIcon) mainIcon.setAttribute('data-lucide', 'square');
    if (pauseBtn) pauseBtn.disabled = false;
    if (finishBtn) finishBtn.disabled = false;
    if (pauseIcon) pauseIcon.setAttribute('data-lucide', 'pause');

    statusEl?.classList.remove('paused');
    statusEl?.classList.add('recording');
    if (statusText) statusText.textContent = 'RECORDING WALK...';
    if (hintText) hintText.innerHTML = '<i data-lucide="footprints" style="width:14px;height:14px;"></i><span>Walking &amp; dictating... Tap square to finish</span>';
    if (liveBadge) liveBadge.style.display = 'inline-block';
  } else if (status === 'paused') {
    statusEl?.classList.remove('recording');
    statusEl?.classList.add('paused');
    if (statusText) statusText.textContent = 'WALK PAUSED';
    if (pauseIcon) pauseIcon.setAttribute('data-lucide', 'play');
    if (hintText) hintText.innerHTML = '<i data-lucide="pause" style="width:14px;height:14px;"></i><span>Recording paused. Tap resume when ready</span>';
  } else {
    // IDLE
    mainBtn?.classList.remove('recording');
    if (mainIcon) mainIcon.setAttribute('data-lucide', 'mic');
    if (pauseBtn) pauseBtn.disabled = true;
    if (finishBtn) finishBtn.disabled = true;

    statusEl?.classList.remove('recording', 'paused');
    if (statusText) statusText.textContent = 'READY TO WALK';
    if (hintText) hintText.innerHTML = '<i data-lucide="compass" style="width:14px;height:14px;"></i><span>Tap microphone to start walking monologue</span>';
    if (liveBadge) liveBadge.style.display = 'none';

    const meterBar = document.getElementById('audioLevelBar');
    if (meterBar) meterBar.style.width = '0%';
  }

  createIcons({ icons: appIcons });
}

// Live Speech Transcript Display
function updateLiveTranscriptDisplay(interim, final) {
  const emptyHint = document.getElementById('emptyTranscriptHint');
  const finalEl = document.getElementById('finalTranscriptText');
  const interimEl = document.getElementById('interimTranscriptText');
  const box = document.getElementById('liveTranscriptBox');

  if (emptyHint && (final || interim)) {
    emptyHint.style.display = 'none';
  }

  if (finalEl) finalEl.textContent = final ? final + ' ' : '';
  if (interimEl) interimEl.textContent = interim;

  // Auto-scroll box to bottom
  if (box) box.scrollTop = box.scrollHeight;
}

// Demo Walk Simulation
function runDemoWalk(sampleIdx) {
  state.currentSessionId = 'demo-walk-' + Date.now();
  state.walkSeconds = 0;
  state.walkSteps = 0;
  state.isRecording = true;
  state.isPaused = false;

  document.getElementById('finalTranscriptText').textContent = '';
  document.getElementById('interimTranscriptText').textContent = '';
  document.getElementById('emptyTranscriptHint').style.display = 'none';
  document.getElementById('liveBadge').style.display = 'inline-block';

  transcriber.startDemoWalk(sampleIdx);

  // Start visualizer with synthetic wave
  visualizer.start(audioEngine);
  startWalkTimers();
  updateRecordingUIState('recording');

  showToast(`Simulating Demo Walk ${sampleIdx + 1}... Thoughts are streaming!`, 'info');
}

// =========================================================
// RENDER: IDEAS LIST
// =========================================================
function renderIdeas() {
  const grid = document.getElementById('ideasGrid');
  if (!grid) return;

  let ideas = storage.getAllIdeas();

  // Filter
  if (state.activeFilter === 'breakthrough') {
    ideas = ideas.filter(i => i.type === 'breakthrough' || i.sparkScore >= 90);
  } else if (state.activeFilter === 'starred') {
    ideas = ideas.filter(i => i.isStarred);
  } else if (state.activeFilter !== 'all') {
    ideas = ideas.filter(i => i.category && i.category.toLowerCase() === state.activeFilter.toLowerCase());
  }

  // Search
  if (state.searchQuery) {
    ideas = ideas.filter(i =>
      i.title.toLowerCase().includes(state.searchQuery) ||
      i.description.toLowerCase().includes(state.searchQuery) ||
      (i.category && i.category.toLowerCase().includes(state.searchQuery))
    );
  }

  if (ideas.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 48px 20px; color: var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
        <i data-lucide="sparkles" style="width:40px; height:40px; color:var(--text-subtle); margin-bottom:12px;"></i>
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">No ideas found</h3>
        <p style="font-size:0.88rem; max-width:400px; margin:0 auto;">Record a walk to capture your thoughts, or adjust your search filter above.</p>
      </div>
    `;
    createIcons({ icons: appIcons });
    return;
  }

  grid.innerHTML = ideas.map(idea => {
    const isBreakthrough = idea.type === 'breakthrough' || idea.sparkScore >= 90;
    const dateFormatted = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today';

    return `
      <article class="idea-card ${isBreakthrough ? 'breakthrough' : ''}" data-id="${idea.id}">
        <div class="idea-card-header">
          <div class="idea-badges">
            <span class="category-badge">${idea.category || 'Idea'}</span>
            <span class="spark-score-badge">
              <i data-lucide="flame" style="width:12px;height:12px;"></i>
              ${idea.sparkScore || 85} Spark
            </span>
            ${isBreakthrough ? '<span class="brand-badge" style="font-size:0.65rem;">Breakthrough</span>' : ''}
          </div>

          <button class="idea-star-btn ${idea.isStarred ? 'starred' : ''}" data-action="toggle-star" data-id="${idea.id}" title="Star idea">
            <i data-lucide="star" style="width:18px;height:18px;" ${idea.isStarred ? 'fill="var(--brand-amber)"' : ''}></i>
          </button>
        </div>

        <div class="idea-body">
          <h3 class="idea-title">${escapeHtml(idea.title)}</h3>
          <p class="idea-desc">${escapeHtml(idea.description)}</p>
        </div>

        <div class="idea-footer">
          <span class="idea-session-link" data-action="view-session" data-session-id="${idea.sessionId}">
            ${escapeHtml(idea.sessionTitle || 'Walk Session')} • ${dateFormatted}
          </span>

          <div class="idea-card-actions">
            <button class="tiny-action-btn" data-action="edit-idea" data-id="${idea.id}" title="Edit Idea">
              <i data-lucide="edit-3" style="width:15px;height:15px;"></i>
            </button>
            <button class="tiny-action-btn" data-action="copy-idea" data-id="${idea.id}" title="Copy Idea">
              <i data-lucide="copy" style="width:15px;height:15px;"></i>
            </button>
            <button class="tiny-action-btn delete" data-action="delete-idea" data-id="${idea.id}" title="Delete Idea">
              <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach card event listeners
  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'toggle-star') {
        storage.toggleIdeaStar(id);
        renderIdeas();
      } else if (action === 'delete-idea') {
        if (confirm('Delete this idea?')) {
          storage.deleteIdea(id);
          renderIdeas();
          updateCounts();
          showToast('Idea removed');
        }
      } else if (action === 'edit-idea') {
        openEditModal(id);
      } else if (action === 'copy-idea') {
        const found = ideas.find(i => i.id === id);
        if (found) {
          navigator.clipboard.writeText(`💡 ${found.title}\n${found.description}\nCategory: #${found.category} | Spark: ${found.sparkScore}/100`);
          showToast('Idea copied to clipboard!');
        }
      } else if (action === 'view-session') {
        switchTab('sessions');
      }
    });
  });

  createIcons({ icons: appIcons });
}

// =========================================================
// RENDER: ACTION ITEMS / CHECKLIST
// =========================================================
function renderActionItems() {
  const container = document.getElementById('actionItemsList');
  if (!container) return;

  const actions = storage.getAllActionItems();

  if (actions.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 20px; color: var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
        <i data-lucide="check-square" style="width:40px; height:40px; color:var(--brand-emerald); margin-bottom:12px;"></i>
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">No Action Items Pending</h3>
        <p style="font-size:0.88rem; max-width:400px; margin:0 auto;">Take a walk and state what you need to build or follow up on. They'll appear here as a clean checklist!</p>
      </div>
    `;
    createIcons({ icons: appIcons });
    return;
  }

  container.innerHTML = actions.map(act => {
    return `
      <div class="action-item-row ${act.isDone ? 'done' : ''}" data-id="${act.id}">
        <div class="action-item-left">
          <button class="action-checkbox ${act.isDone ? 'checked' : ''}" data-action="toggle-done" data-id="${act.id}">
            <i data-lucide="check" style="width:14px;height:14px;"></i>
          </button>
          <div class="action-item-details">
            <span class="action-text">${escapeHtml(act.task)}</span>
            <div class="action-meta">
              <span class="priority-badge ${act.priority || 'medium'}">${act.priority || 'medium'}</span>
              <span>•</span>
              <span>${escapeHtml(act.category || 'General')}</span>
              <span>•</span>
              <span>From: ${escapeHtml(act.sessionTitle || 'Walk Note')}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="toggle-done"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const isDone = storage.toggleActionDone(id);
      if (isDone) {
        soundEffects.playCheck();
        confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
      }
      renderActionItems();
      updateCounts();
    });
  });

  createIcons({ icons: appIcons });
}

// =========================================================
// RENDER: WALK SESSIONS TIMELINE
// =========================================================
function renderSessions() {
  const container = document.getElementById('sessionsTimeline');
  if (!container) return;

  const sessions = storage.getSessions();

  if (sessions.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 20px; color: var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
        <i data-lucide="clock" style="width:40px; height:40px; color:var(--text-subtle); margin-bottom:12px;"></i>
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">No Walk Logs Yet</h3>
        <p style="font-size:0.88rem; max-width:400px; margin:0 auto;">Start a walk session from the Walk Hub to record your thoughts.</p>
      </div>
    `;
    createIcons({ icons: appIcons });
    return;
  }

  container.innerHTML = sessions.map(session => {
    const dateFormatted = new Date(session.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const durationStr = formatTime(session.durationSeconds || 0);

    return `
      <article class="session-card" data-session-id="${session.id}">
        <div class="session-header-row">
          <div>
            <h3 class="session-title">${escapeHtml(session.title)}</h3>
            <div class="session-date">${dateFormatted}</div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span class="spark-score-badge">
              <i data-lucide="flame" style="width:12px;height:12px;"></i>
              ${session.sparkScore || 88} Spark
            </span>
            <button class="tiny-action-btn delete" data-action="delete-session" data-session-id="${session.id}" title="Delete Walk">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>

        <!-- Telemetry Stats Pills -->
        <div class="session-stats-row">
          <div class="stat-pill">
            <i data-lucide="clock" style="width:14px;height:14px;color:var(--brand-orange);"></i>
            <span>${durationStr}</span>
          </div>
          <div class="stat-pill">
            <i data-lucide="footprints" style="width:14px;height:14px;color:var(--brand-emerald);"></i>
            <span>${session.stepsEstimated || 180} steps</span>
          </div>
          <div class="stat-pill">
            <i data-lucide="file-text" style="width:14px;height:14px;color:var(--brand-violet);"></i>
            <span>${session.wordCount || 0} words</span>
          </div>
          <div class="stat-pill">
            <i data-lucide="activity" style="width:14px;height:14px;color:var(--brand-cyan);"></i>
            <span>${session.paceWpm || 120} WPM</span>
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="session-summary">
          <strong>Summary:</strong> ${escapeHtml(session.executiveSummary || 'No summary available.')}
        </div>

        <!-- Audio Player Component -->
        <div class="session-audio-player" id="player-${session.id}">
          <button class="audio-play-toggle-btn" data-action="play-audio" data-session-id="${session.id}">
            <i data-lucide="play" style="width:16px;height:16px;"></i>
          </button>
          <div class="audio-progress-bar" data-action="scrub-audio" data-session-id="${session.id}">
            <div class="audio-progress-fill" style="width:0%;"></div>
          </div>
          <span class="audio-time-label">0:00 / ${durationStr}</span>
          <button class="audio-speed-btn" data-action="change-speed" data-session-id="${session.id}">1.0x</button>
        </div>

        <!-- Distilled Ideas preview -->
        ${session.ideas && session.ideas.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <span style="font-size:0.78rem; font-weight:700; text-transform:uppercase; color:var(--text-subtle);">Distilled Breakthroughs (${session.ideas.length})</span>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${session.ideas.map(i => `
                <span class="category-badge" style="background:rgba(255,92,0,0.12); color:var(--brand-orange); border-color:rgba(255,92,0,0.25);">
                  💡 ${escapeHtml(i.title)}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Toggle Spoken Transcript -->
        <div>
          <button class="transcript-toggle-btn" data-action="toggle-transcript" data-session-id="${session.id}">
            <i data-lucide="chevron-down" style="width:16px;height:16px;"></i>
            <span>View Full Spoken Transcript</span>
          </button>
          <div class="session-full-transcript" id="transcript-${session.id}">
            <p><strong>Spoken Monologue:</strong></p>
            <p style="margin-top:6px;">${escapeHtml(session.transcript || session.polishedTranscript || 'No transcript available.')}</p>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach session actions
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const sId = btn.dataset.sessionId;

      if (action === 'delete-session') {
        if (confirm('Delete this walk session and its audio recording?')) {
          storage.deleteSession(sId);
          renderSessions();
          updateCounts();
          showToast('Walk session deleted');
        }
      } else if (action === 'toggle-transcript') {
        const box = document.getElementById(`transcript-${sId}`);
        if (box) {
          box.classList.toggle('open');
          const isOpened = box.classList.contains('open');
          btn.querySelector('span').textContent = isOpened ? 'Hide Spoken Transcript' : 'View Full Spoken Transcript';
        }
      } else if (action === 'play-audio') {
        handlePlayAudio(sId, btn);
      } else if (action === 'change-speed') {
        handleChangeAudioSpeed(btn);
      }
    });
  });

  createIcons({ icons: appIcons });
}

// Audio Player Execution for Walk Sessions
async function handlePlayAudio(sessionId, playBtn) {
  const audio = state.audioElement;
  const playerContainer = document.getElementById(`player-${sessionId}`);
  const fill = playerContainer?.querySelector('.audio-progress-fill');
  const timeLabel = playerContainer?.querySelector('.audio-time-label');

  if (state.currentlyPlayingSessionId === sessionId && !audio.paused) {
    audio.pause();
    playBtn.innerHTML = '<i data-lucide="play" style="width:16px;height:16px;"></i>';
    createIcons({ icons: appIcons });
    return;
  }

  // Load audio blob from IndexedDB or generate synthetic sample audio
  const blob = await getAudioBlob(sessionId);

  if (blob) {
    audio.src = URL.createObjectURL(blob);
  } else {
    // If seed or demo walk without physical blob, notify user
    showToast('Simulating audio playback for recorded walk note', 'info');
    simulateAudioPlayback(sessionId, playerContainer);
    return;
  }

  state.currentlyPlayingSessionId = sessionId;
  audio.play();
  playBtn.innerHTML = '<i data-lucide="pause" style="width:16px;height:16px;"></i>';
  createIcons({ icons: appIcons });

  audio.ontimeupdate = () => {
    if (audio.duration && fill) {
      const pct = (audio.currentTime / audio.duration) * 100;
      fill.style.width = pct + '%';
      if (timeLabel) timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
  };

  audio.onended = () => {
    playBtn.innerHTML = '<i data-lucide="play" style="width:16px;height:16px;"></i>';
    if (fill) fill.style.width = '0%';
    createIcons({ icons: appIcons });
  };
}

// Fallback visual scrub simulator for seed sessions
function simulateAudioPlayback(sessionId, container) {
  if (!container) return;
  const fill = container.querySelector('.audio-progress-fill');
  const playBtn = container.querySelector('.audio-play-toggle-btn');
  let pct = 0;
  playBtn.innerHTML = '<i data-lucide="pause" style="width:16px;height:16px;"></i>';
  createIcons({ icons: appIcons });

  const simInterval = setInterval(() => {
    pct += 2;
    if (fill) fill.style.width = pct + '%';
    if (pct >= 100) {
      clearInterval(simInterval);
      if (fill) fill.style.width = '0%';
      playBtn.innerHTML = '<i data-lucide="play" style="width:16px;height:16px;"></i>';
      createIcons({ icons: appIcons });
    }
  }, 100);
}

function handleChangeAudioSpeed(speedBtn) {
  const audio = state.audioElement;
  const speeds = [1.0, 1.25, 1.5, 2.0];
  let cur = parseFloat(speedBtn.textContent) || 1.0;
  let nextIdx = (speeds.indexOf(cur) + 1) % speeds.length;
  let nextSpeed = speeds[nextIdx];
  audio.playbackRate = nextSpeed;
  speedBtn.textContent = `${nextSpeed.toFixed(1)}x`;
}

// =========================================================
// EXPORT TO MARKDOWN / NOTION MODAL
// =========================================================
function openExportModal() {
  const modal = document.getElementById('exportModal');
  const preview = document.getElementById('markdownExportPreview');
  if (!modal || !preview) return;

  const sessions = storage.getSessions();
  const allIdeas = storage.getAllIdeas();
  const allActions = storage.getAllActionItems();

  let md = `# 🚶 StrideNotes — Distilled Walk Ideas\n\n`;
  md += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;
  md += `## 💡 Breakthrough Ideas (${allIdeas.length})\n\n`;

  allIdeas.forEach(idea => {
    md += `### ${idea.title} [Spark: ${idea.sparkScore || 85}/100]\n`;
    md += `*Category: #${idea.category || 'General'}*\n`;
    md += `${idea.description}\n\n`;
  });

  md += `## 🎯 Action Items (${allActions.length})\n\n`;
  allActions.forEach(act => {
    md += `- [${act.isDone ? 'x' : ' '}] **${act.task}** (${act.priority || 'medium'} priority)\n`;
  });

  md += `\n## 🗂️ Walk Sessions Logs\n\n`;
  sessions.forEach(s => {
    md += `### ${s.title} (${new Date(s.date).toLocaleDateString()})\n`;
    md += `- **Duration**: ${formatTime(s.durationSeconds || 0)} | **Steps**: ${s.stepsEstimated || 0} | **Words**: ${s.wordCount || 0}\n`;
    md += `- **Executive Summary**: ${s.executiveSummary || ''}\n\n`;
  });

  preview.textContent = md;
  modal.classList.add('open');
  createIcons({ icons: appIcons });
}

function closeExportModal() {
  document.getElementById('exportModal')?.classList.remove('open');
}

function copyMarkdownToClipboard() {
  const preview = document.getElementById('markdownExportPreview');
  if (preview) {
    navigator.clipboard.writeText(preview.textContent);
    showToast('Markdown copied to clipboard! Ready to paste into Notion or Notes.', 'success');
    closeExportModal();
  }
}

function downloadMarkdownFile() {
  const preview = document.getElementById('markdownExportPreview');
  if (!preview) return;
  const blob = new Blob([preview.textContent], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stridenotes-export-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  showToast('Markdown file downloaded!');
  closeExportModal();
}

// =========================================================
// EDIT IDEA MODAL
// =========================================================
function openEditModal(ideaId) {
  const ideas = storage.getAllIdeas();
  const idea = ideas.find(i => i.id === ideaId);
  if (!idea) return;

  state.editingIdeaId = ideaId;
  const modal = document.getElementById('editIdeaModal');
  const titleInput = document.getElementById('editIdeaTitleInput');
  const descInput = document.getElementById('editIdeaDescInput');
  const catSelect = document.getElementById('editIdeaCategorySelect');
  const sparkInput = document.getElementById('editIdeaSparkInput');

  if (titleInput) titleInput.value = idea.title;
  if (descInput) descInput.value = idea.description;
  if (catSelect) catSelect.value = idea.category || 'Product';
  if (sparkInput) sparkInput.value = idea.sparkScore || 85;

  modal?.classList.add('open');
  createIcons({ icons: appIcons });
}

function closeEditModal() {
  document.getElementById('editIdeaModal')?.classList.remove('open');
  state.editingIdeaId = null;
}

function saveIdeaEdit() {
  if (!state.editingIdeaId) return;

  const title = document.getElementById('editIdeaTitleInput')?.value || '';
  const desc = document.getElementById('editIdeaDescInput')?.value || '';
  const category = document.getElementById('editIdeaCategorySelect')?.value || 'Product';
  const sparkScore = parseInt(document.getElementById('editIdeaSparkInput')?.value, 10) || 85;

  storage.updateIdea(state.editingIdeaId, {
    title,
    description: desc,
    category,
    sparkScore
  });

  closeEditModal();
  renderIdeas();
  renderSessions();
  showToast('Idea updated successfully!', 'success');
}

// JSON Backup & Restore
function exportJsonBackup() {
  const sessions = storage.getSessions();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `stridenotes-backup-${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('JSON backup downloaded!');
}

function resetSampleData() {
  if (confirm('Reset to initial walking notes demo data?')) {
    localStorage.removeItem('stridenotes_sessions_v2');
    location.reload();
  }
}

// Utility: Escape HTML for security
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start Application
initApp();
