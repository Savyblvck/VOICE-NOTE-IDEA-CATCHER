// Storage layer: IndexedDB for audio files & LocalStorage for structured notes/ideas

const DB_NAME = 'StrideNotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioRecordings';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save audio blob in IndexedDB
export async function saveAudioBlob(id, blob) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ id, blob, createdAt: Date.now() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB write error, falling back to session blob:', e);
    return false;
  }
}

// Retrieve audio blob
export async function getAudioBlob(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB read error:', e);
    return null;
  }
}

// Delete audio blob
export async function deleteAudioBlob(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(e);
  }
}

// LocalStorage Keys
const SESSIONS_KEY = 'stridenotes_sessions_v2';
const SETTINGS_KEY = 'stridenotes_settings_v2';

// Seed Initial Data
const SEED_SESSIONS = [
  {
    id: 'seed-session-1',
    title: 'Morning Walk: Voice Notes as Data Pipelines',
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    durationSeconds: 142,
    stepsEstimated: 240,
    wordCount: 88,
    paceWpm: 124,
    tags: ['#Product', '#AI', '#Mobile'],
    sparkScore: 94,
    executiveSummary: 'Identified the fatal flaw in standard voice memos: lack of distillation. Walking voice notes should be treated as live data streams that distill raw rambling into structured action cards.',
    transcript: "So I'm walking through the park this morning thinking about why voice notes usually fail. When people walk and record thoughts, their brain is in a diffused state, free association. But standard voice memo apps just dump a 10-minute MP3 file on you. Nobody ever listens back to a 10-minute monologue! The breakthrough idea is to treat walking voice notes as raw data pipelines. As you speak, we should parse out the core nuggets, give them a spark score, and turn rambles into clear bullet points. Next action item: build an instant single-thumb UI with pocket lock, and add a quick export to Markdown.",
    ideas: [
      {
        id: 'idea-101',
        sessionId: 'seed-session-1',
        title: 'Voice Notes as Raw Data Pipelines',
        description: 'Never force users to listen back to raw rambles. Automatically transcribe, parse intent, and synthesize core insights into high-yield cards.',
        type: 'breakthrough',
        category: 'Product',
        sparkScore: 96,
        isStarred: true,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'idea-102',
        sessionId: 'seed-session-1',
        title: 'Single-Thumb Walking Mode with Pocket Lock',
        description: 'Design oversized touch targets and a slide-to-unlock pocket shield so phones don\'t register accidental screen touches while swinging arms.',
        type: 'breakthrough',
        category: 'Mobile',
        sparkScore: 91,
        isStarred: false,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ],
    actionItems: [
      {
        id: 'act-101',
        sessionId: 'seed-session-1',
        task: 'Build instant single-thumb UI with pocket lock gesture',
        priority: 'high',
        isDone: true,
        category: 'Development'
      },
      {
        id: 'act-102',
        sessionId: 'seed-session-1',
        task: 'Implement 1-click export to Markdown and Notion format',
        priority: 'medium',
        isDone: false,
        category: 'Features'
      }
    ]
  },
  {
    id: 'seed-session-2',
    title: 'Evening Stroll: Cadence & Creative Ideation',
    date: new Date(Date.now() - 3600000 * 28).toISOString(),
    durationSeconds: 195,
    stepsEstimated: 330,
    wordCount: 112,
    paceWpm: 130,
    tags: ['#Habits', '#Creativity', '#Health'],
    sparkScore: 89,
    executiveSummary: 'Noticed that the highest quality creative insights occur after minute 10 of a walk as heart rate stabilizes. Exploring adding movement cadence telemetry to correlate physical stride with creative flow.',
    transcript: "Just doing my evening lap around the block. I noticed that my best ideas always hit on minute 12 of a walk when my heart rate settles into zone 2. What if we add a walking pace and step cadence meter directly into the recording screen? That way you can correlate your best ideas with physical movement. I need to test recording while keeping the phone in my jacket pocket using wired headphone mic. Let's make sure the audio compressor eliminates street traffic noise.",
    ideas: [
      {
        id: 'idea-201',
        sessionId: 'seed-session-2',
        title: 'Physical Cadence & Creative Flow Correlation',
        description: 'Correlate user walking steps and pace with the density of breakthrough ideas captured during different phases of an outdoor walk.',
        type: 'breakthrough',
        category: 'Creativity',
        sparkScore: 89,
        isStarred: true,
        createdAt: new Date(Date.now() - 3600000 * 28).toISOString()
      }
    ],
    actionItems: [
      {
        id: 'act-201',
        sessionId: 'seed-session-2',
        task: 'Test outdoor mic noise cancellation in windy conditions',
        priority: 'medium',
        isDone: false,
        category: 'Hardware'
      }
    ]
  }
];

export const storage = {
  // Get all walking sessions
  getSessions() {
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (!data) {
        this.saveSessions(SEED_SESSIONS);
        return SEED_SESSIONS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read sessions from storage', e);
      return SEED_SESSIONS;
    }
  },

  // Save sessions
  saveSessions(sessions) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions to storage', e);
    }
  },

  // Add new session
  addSession(session) {
    const sessions = this.getSessions();
    sessions.unshift(session);
    this.saveSessions(sessions);
    return session;
  },

  // Update session
  updateSession(sessionId, updates) {
    const sessions = this.getSessions().map(s => {
      if (s.id === sessionId) {
        return { ...s, ...updates };
      }
      return s;
    });
    this.saveSessions(sessions);
  },

  // Delete session
  deleteSession(sessionId) {
    const sessions = this.getSessions().filter(s => s.id !== sessionId);
    this.saveSessions(sessions);
    deleteAudioBlob(sessionId);
  },

  // Get aggregated flat list of all ideas across all sessions
  getAllIdeas() {
    const sessions = this.getSessions();
    const ideas = [];
    sessions.forEach(session => {
      if (session.ideas) {
        session.ideas.forEach(idea => {
          ideas.push({
            ...idea,
            sessionTitle: session.title,
            sessionDate: session.date
          });
        });
      }
    });
    return ideas;
  },

  // Get aggregated flat list of all action items
  getAllActionItems() {
    const sessions = this.getSessions();
    const actions = [];
    sessions.forEach(session => {
      if (session.actionItems) {
        session.actionItems.forEach(act => {
          actions.push({
            ...act,
            sessionTitle: session.title,
            sessionDate: session.date
          });
        });
      }
    });
    return actions;
  },

  // Toggle Idea Star
  toggleIdeaStar(ideaId) {
    const sessions = this.getSessions();
    let updated = false;
    for (const s of sessions) {
      if (s.ideas) {
        const found = s.ideas.find(i => i.id === ideaId);
        if (found) {
          found.isStarred = !found.isStarred;
          updated = true;
          break;
        }
      }
    }
    if (updated) this.saveSessions(sessions);
  },

  // Toggle Action Item Check
  toggleActionDone(actionId) {
    const sessions = this.getSessions();
    let updated = false;
    let newStatus = false;
    for (const s of sessions) {
      if (s.actionItems) {
        const found = s.actionItems.find(a => a.id === actionId);
        if (found) {
          found.isDone = !found.isDone;
          newStatus = found.isDone;
          updated = true;
          break;
        }
      }
    }
    if (updated) this.saveSessions(sessions);
    return newStatus;
  },

  // Edit Idea Content
  updateIdea(ideaId, updates) {
    const sessions = this.getSessions();
    for (const s of sessions) {
      if (s.ideas) {
        const index = s.ideas.findIndex(i => i.id === ideaId);
        if (index !== -1) {
          s.ideas[index] = { ...s.ideas[index], ...updates };
          this.saveSessions(sessions);
          return s.ideas[index];
        }
      }
    }
    return null;
  },

  // Delete single idea
  deleteIdea(ideaId) {
    const sessions = this.getSessions();
    for (const s of sessions) {
      if (s.ideas) {
        s.ideas = s.ideas.filter(i => i.id !== ideaId);
      }
    }
    this.saveSessions(sessions);
  },

  // Get Settings
  getSettings() {
    const defaults = {
      geminiApiKey: '',
      autoPocketLock: true,
      soundCues: true,
      hapticFeedback: true,
      outdoorHighContrast: false,
      speechLanguage: 'en-US'
    };
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    } catch {
      return defaults;
    }
  },

  // Save Settings
  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }
};
