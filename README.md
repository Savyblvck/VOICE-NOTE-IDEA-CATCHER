# 🚶 StrideNotes — Voice-to-Idea Walk Recorder & AI Organizer

**StrideNotes** is an app designed specifically for thinkers, founders, and creators who do their best ideation while walking. It captures spontaneous voice notes, transcribes speech continuously in real-time, distills rambling thoughts into structured breakthrough ideas, and organizes them into an actionable list.

---

## ✨ Key Features

### 1. 🎙️ Designed for Walking & Movement
- **Oversized Single-Thumb Controls**: Large, high-contrast buttons optimized for one-handed operation while strolling outdoors.
- **Walk Telemetry HUD**: Real-time duration timer, cadence step estimator (~105-115 steps/min), and speaking pace tracker (Words Per Minute).
- **Pocket Shield Mode**: Fullscreen lock screen overlay preventing phantom screen touches when swinging your arms or keeping your phone in your coat pocket.
- **Outdoor Sun Mode**: One-tap toggle for high-contrast day-time walking vs. sleek dark mode for evening walks.
- **Acoustic & Tactile Cues**: Web Audio API chimes and mobile haptics for start, pause, finish, and checklist completion.

### 2. ⚡ Live Speech-to-Text Transcription
- **Continuous Speech Recognition**: Streams words in real-time using the browser's `SpeechRecognition` / `webkitSpeechRecognition` API.
- **Auto-Reconnection**: Automatically recovers from natural pauses or quiet trails without cutting off.
- **Demo Walk Simulators**: Built-in simulations ("Product Brainstorm" and "Habit & Cadence") to test the entire ideation pipeline instantly with zero microphone permissions required.

### 3. 💡 Intelligent Idea Extraction (Local NLP + Gemini AI)
- **Automatic Noise & Filler Removal**: Filters verbal crutches like *"um"*, *"uh"*, *"you know"*, *"like basically"*, and run-on sentences.
- **Multi-Tier Structured Synthesis**:
  - 💡 **Breakthrough Ideas**: Core insights distilled with a **Spark Score** (0–100 rating based on clarity and actionability).
  - 🎯 **Action Items / To-Dos**: Concrete next steps automatically categorized with High/Medium priority.
  - 🏷️ **Dynamic Tagging**: Automatically detects topics (`#Product`, `#Strategy`, `#Habits`, `#Creativity`, `#Engineering`).
  - 📝 **Executive Summary**: 2-sentence crisp TL;DR of the walking monologue.
  - ✍️ **Polished Transcript**: Clean, readable prose version of the raw monologue.
- **Dual Engine Architecture**:
  - **Local Heuristic NLP**: 100% private, instant, and works offline without any API keys.
  - **Google Gemini API (Optional)**: In Settings, add your Gemini API key (`gemini-2.5-flash` / `gemini-1.5-flash`) for deep generative refinement.

### 4. 🗂️ Master Ideas Inbox & Organization
- **Smart Filtering & Instant Search**: Filter by Breakthroughs, Starred, or Category pills (`#Product`, `#Strategy`, `#Habits`, etc.).
- **Interactive Checklists**: Check off action items with confetti and audio confirmation.
- **Session Timeline & Audio Player**: Listen back to recorded walks with interactive progress scrubbers, playback speed options (1.0x, 1.25x, 1.5x, 2.0x), and raw transcript toggles.
- **1-Click Export**:
  - Export all ideas as Markdown formatted for **Notion**, **Obsidian**, or **Apple Notes**.
  - Download JSON backups of all notes and sessions.

---

## 🚀 Getting Started

### Local Development
The app is currently running on Vite:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Mobile Use
To use it while walking outdoors:
1. Connect your phone to the same local Wi-Fi, or run `npm run dev -- --host` to access the IP address from your smartphone.
2. In your mobile browser (Safari on iOS or Chrome on Android), tap **"Add to Home Screen"** to run it as a standalone fullscreen app!

---

## 🛠️ Tech Stack
- **Core**: Vanilla HTML5, ES6 Modules, Modern CSS (Glassmorphism & Custom Properties)
- **Build Tool**: Vite 8
- **Audio & Speech**: Web Audio API (`AudioContext`, `AnalyserNode`), `MediaRecorder`, `webkitSpeechRecognition`, IndexedDB
- **Icons & Effects**: Lucide Icons, Canvas-Confetti
