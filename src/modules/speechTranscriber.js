// Continuous Speech Recognition Engine with auto-reconnect and demo simulation

export class SpeechTranscriberEngine {
  constructor(options = {}) {
    this.recognition = null;
    this.isListening = false;
    this.isManualStop = false;
    this.language = options.language || 'en-US';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.onInterim = options.onInterim || (() => {});
    this.onFinal = options.onFinal || (() => {});
    this.onError = options.onError || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.demoTimer = null;
    this.isDemoMode = false;
  }

  isSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  start() {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.isManualStop = false;
    this.isDemoMode = false;

    if (!this.isSupported()) {
      console.warn('SpeechRecognition is not natively supported in this browser.');
      this.onError('Speech recognition not supported in this browser. You can still record audio or use Demo Walk simulation!');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChange({ isListening: true });
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const cleaned = transcriptPart.trim();
          if (cleaned) {
            // Capitalize first letter of finalized segment if needed
            const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            this.finalTranscript += (this.finalTranscript ? ' ' : '') + formatted;
            this.onFinal(formatted, this.finalTranscript);
          }
        } else {
          interim += transcriptPart;
        }
      }
      this.interimTranscript = interim;
      this.onInterim(interim, this.finalTranscript);
    };

    this.recognition.onerror = (event) => {
      // 'no-speech' is common while walking through quiet park paths
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'aborted') {
        return;
      }
      console.warn('Speech recognition error event:', event.error);
      this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChange({ isListening: false });
      
      // Auto-restart if we didn't manually stop (handles mobile browser dropouts while walking)
      if (!this.isManualStop) {
        try {
          this.recognition.start();
        } catch (e) {
          // Restart throttled or already running
        }
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition', err);
      this.onError(err.message || 'Microphone speech recognition initialization failed.');
    }
  }

  stop() {
    this.isManualStop = true;
    this.isListening = false;
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.onStateChange({ isListening: false });
    return this.finalTranscript;
  }

  // Realistic Demo Walk Simulation for rapid testing and zero-mic demonstrations
  startDemoWalk(sampleIndex = 0) {
    this.stop();
    this.isDemoMode = true;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.isListening = true;
    this.onStateChange({ isListening: true, isDemo: true });

    const samples = [
      [
        "Hey, starting my morning walk around the reservoir.",
        "Thinking about how creators and builders capture their fleeting thoughts.",
        "The problem is, when walking, your mind is wandering and 80% is filler or half-baked ramblings.",
        "What if an app automatically strips the fluff and isolates the core breakthrough idea?",
        "For example, let's build an automated Idea Spark Score that highlights high-conviction thoughts.",
        "And we must add an Action Items checklist that pulls out to-dos like emailing Sarah about the launch.",
        "Next step: add a single-thumb pocket mode so it never misclicks in my coat pocket.",
        "That's it, heading back home now."
      ],
      [
        "Out for a brisk evening stroll down Market Street.",
        "I just realized that most productivity tools fail because they demand immediate organization.",
        "When you're walking, you can't categorize or tag cards into kanban columns.",
        "The real insight is: Voice notes should be completely zero-friction input, with AI doing all the sorting.",
        "We need tags like #Product, #Personal, and #Strategy generated automatically based on vocabulary.",
        "Action item: implement one-click Notion and Markdown export so people can sync notes into their second brain.",
        "Also test audio playback with speed controls like 1.5x and 2x."
      ]
    ];

    const sentences = samples[sampleIndex % samples.length];
    let sIdx = 0;

    this.demoTimer = setInterval(() => {
      if (sIdx < sentences.length) {
        const sentence = sentences[sIdx];
        this.onInterim(sentence, this.finalTranscript);

        setTimeout(() => {
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + sentence;
          this.interimTranscript = '';
          this.onFinal(sentence, this.finalTranscript);
        }, 1200);

        sIdx++;
      } else {
        clearInterval(this.demoTimer);
        this.demoTimer = null;
      }
    }, 2500);
  }

  getTranscript() {
    return this.finalTranscript + (this.interimTranscript ? ' ' + this.interimTranscript : '');
  }
}
