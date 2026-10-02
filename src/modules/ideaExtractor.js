// Idea Extraction & Intelligence Engine: Local NLP Analyzer + Optional Gemini API Integration

// Common filler words and spoken ramblings while walking
const FILLER_REGEX = /\b(um|uh|er|ah|like, basically|like|you know|so yeah|sort of|kind of|i guess|i mean|anyway|right now)\b/gi;

export class IdeaExtractorEngine {
  constructor(settings = {}) {
    this.geminiApiKey = settings.geminiApiKey || '';
  }

  setApiKey(key) {
    this.geminiApiKey = key.trim();
  }

  // Main entrypoint: extracts structured ideas from transcript
  async processWalkTranscript(rawTranscript, walkStats = {}) {
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return this.createEmptyResult(walkStats);
    }

    // If user provided a Gemini API Key, try the Google Gemini LLM first
    if (this.geminiApiKey) {
      try {
        const geminiResult = await this.extractWithGemini(rawTranscript, walkStats);
        if (geminiResult) {
          return geminiResult;
        }
      } catch (e) {
        console.warn('Gemini API call failed, falling back to Local NLP Engine:', e);
      }
    }

    // Default: High-fidelity Local NLP & Heuristic Engine (100% offline, private, instant)
    return this.extractWithLocalNLP(rawTranscript, walkStats);
  }

  createEmptyResult(walkStats) {
    return {
      title: 'Quick Walk Note',
      executiveSummary: 'Short voice note recorded with no clear speech detected.',
      sparkScore: 50,
      tags: ['#QuickNote'],
      ideas: [],
      actionItems: [],
      polishedTranscript: '',
      wordCount: 0,
      durationSeconds: walkStats.durationSeconds || 0,
      stepsEstimated: walkStats.steps || 0,
      paceWpm: 0
    };
  }

  // Local NLP Heuristic Engine
  extractWithLocalNLP(rawTranscript, walkStats = {}) {
    const cleanedRaw = rawTranscript.replace(/\s+/g, ' ').trim();
    const sentences = this.splitIntoSentences(cleanedRaw);
    const wordCount = cleanedRaw.split(/\s+/).filter(Boolean).length;
    const durationSeconds = walkStats.durationSeconds || Math.max(15, Math.round(wordCount * 0.45));
    const paceWpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 120;
    const stepsEstimated = walkStats.steps || Math.round((durationSeconds / 60) * 105);

    const ideas = [];
    const actionItems = [];
    const detectedTags = new Set();

    // 1. Identify Breakthrough Ideas
    const ideaPatterns = [
      { regex: /(breakthrough|the big idea|best idea|what if we|what if|the real trick|real insight|the secret is|imagine an app|imagine if|a better way|solution is|realized that|why don't we|why doesn't someone|interesting concept)\b/i, weight: 15 },
      { regex: /(we should|could create|game changer|paradigm|core problem|opportunity|uniquely|crucial|essential)\b/i, weight: 10 }
    ];

    // 2. Identify Action Items / To-Dos
    const actionPatterns = [
      { regex: /(action item|next step|next action|i need to|we must|make sure to|don't forget to|follow up with|build an|implement|test out|call|email|draft|schedule|write down)\b/i }
    ];

    sentences.forEach((sentence, idx) => {
      const cleanSentence = sentence.replace(FILLER_REGEX, '').replace(/\s+/g, ' ').trim();
      if (cleanSentence.length < 15) return;

      // Check for Action Item
      let isAction = false;
      for (const pat of actionPatterns) {
        if (pat.regex.test(cleanSentence)) {
          isAction = true;
          const taskText = this.cleanActionSentence(cleanSentence);
          const isHighPriority = /\b(must|urgent|first|immediately|critical|today|asap)\b/i.test(cleanSentence);
          
          actionItems.push({
            id: 'act-' + Date.now() + '-' + idx,
            task: taskText,
            priority: isHighPriority ? 'high' : 'medium',
            isDone: false,
            category: this.categorizeSentence(cleanSentence)
          });
          break;
        }
      }

      // Check for Breakthrough Idea
      if (!isAction) {
        let isIdea = false;
        let ideaScore = 75;

        for (const pat of ideaPatterns) {
          if (pat.regex.test(cleanSentence)) {
            isIdea = true;
            ideaScore += pat.weight;
          }
        }

        // Also treat sentences with strong conceptual words as ideas
        if (/\b(concept|strategy|pipeline|architecture|friction|habit|leverage|cadence|workflow|algorithm)\b/i.test(cleanSentence)) {
          isIdea = true;
          ideaScore += 8;
        }

        if (isIdea || sentences.length <= 4) {
          const cat = this.categorizeSentence(cleanSentence);
          detectedTags.add('#' + cat);
          const spark = Math.min(99, Math.max(70, ideaScore + (cleanSentence.length > 50 ? 5 : 0)));
          const title = this.generateIdeaTitle(cleanSentence);

          ideas.push({
            id: 'idea-' + Date.now() + '-' + idx,
            title,
            description: cleanSentence,
            type: spark >= 90 ? 'breakthrough' : 'insight',
            category: cat,
            sparkScore: spark,
            isStarred: spark >= 92,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Fallback: If no ideas detected from conversational fragments, create a synthesized one from whole transcript
    if (ideas.length === 0 && cleanedRaw.length > 20) {
      const cat = this.categorizeSentence(cleanedRaw);
      detectedTags.add('#' + cat);
      ideas.push({
        id: 'idea-' + Date.now() + '-0',
        title: this.generateIdeaTitle(cleanedRaw),
        description: cleanedRaw.slice(0, 200) + (cleanedRaw.length > 200 ? '...' : ''),
        type: 'insight',
        category: cat,
        sparkScore: 85,
        isStarred: false,
        createdAt: new Date().toISOString()
      });
    }

    if (actionItems.length === 0 && sentences.length > 2) {
      // Suggest standard reflection action item
      actionItems.push({
        id: 'act-' + Date.now() + '-default',
        task: 'Review and refine ideas captured during this walk',
        priority: 'medium',
        isDone: false,
        category: 'Review'
      });
    }

    // Build default tags if few detected
    if (detectedTags.size === 0) {
      detectedTags.add('#WalkingThoughts');
      detectedTags.add('#Innovation');
    }

    // Polished Transcript: remove verbal clutter
    const polishedTranscript = this.polishText(cleanedRaw);

    // Title Generation
    const title = this.generateSessionTitle(ideas, polishedTranscript);

    // Executive Summary: 1-2 punchy sentences
    const executiveSummary = this.generateSummary(ideas, actionItems, polishedTranscript);

    // Average Spark Score
    const totalSpark = ideas.reduce((acc, i) => acc + i.sparkScore, 0);
    const overallSpark = ideas.length > 0 ? Math.round(totalSpark / ideas.length) : 84;

    return {
      title,
      executiveSummary,
      sparkScore: overallSpark,
      tags: Array.from(detectedTags).slice(0, 4),
      ideas,
      actionItems,
      polishedTranscript,
      wordCount,
      durationSeconds,
      stepsEstimated,
      paceWpm
    };
  }

  // Gemini API integration for deeper LLM synthesis
  async extractWithGemini(rawTranscript, walkStats) {
    const prompt = `You are the AI brain of StrideNotes, an app for thinkers who dictate thoughts while walking.
Analyze this raw spoken transcript from an outdoor walk.
Filter out all filler words, false starts, and rambling.
Extract high-yield breakthrough ideas, actionable to-dos, and an executive summary.

Spoken Walk Transcript:
"""
${rawTranscript}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "Short, catchy 4-7 word title for this walking session",
  "executiveSummary": "2 crisp sentences summarizing the core breakthrough and its significance.",
  "sparkScore": 88, // integer 0-100 indicating intellectual quality and actionability
  "tags": ["#Product", "#Strategy", "#Mobile"], // 2 to 4 relevant tags
  "ideas": [
    {
      "title": "Punchy 3-6 word idea headline",
      "description": "Clear 1-2 sentence description explaining the concept clearly.",
      "type": "breakthrough", // "breakthrough" or "insight"
      "category": "Product", // e.g. Product, Strategy, Habits, Engineering, Creativity, Personal
      "sparkScore": 94, // 0-100
      "isStarred": true
    }
  ],
  "actionItems": [
    {
      "task": "Concrete actionable next step starting with an imperative verb",
      "priority": "high", // "high" or "medium" or "low"
      "category": "Development"
    }
  ],
  "polishedTranscript": "Full transcript polished into clean, grammatical, eloquent prose without fluff."
}`;

    // Prefer gemini-2.5-flash or gemini-1.5-flash
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`
    ];

    let lastError = null;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || response.statusText);
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const durationSeconds = walkStats.durationSeconds || Math.max(20, Math.round(rawTranscript.split(/\s+/).length * 0.45));
          return {
            ...parsed,
            durationSeconds,
            stepsEstimated: walkStats.steps || Math.round((durationSeconds / 60) * 105),
            wordCount: rawTranscript.split(/\s+/).filter(Boolean).length,
            paceWpm: durationSeconds > 0 ? Math.round((rawTranscript.split(/\s+/).length / durationSeconds) * 60) : 120,
            ideas: (parsed.ideas || []).map((idea, i) => ({
              id: 'idea-gemini-' + Date.now() + '-' + i,
              ...idea
            })),
            actionItems: (parsed.actionItems || []).map((act, i) => ({
              id: 'act-gemini-' + Date.now() + '-' + i,
              isDone: false,
              ...act
            }))
          };
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Gemini API request failed');
  }

  // Helpers for text processing
  splitIntoSentences(text) {
    return text
      .split(/(?<=[.?!])\s+|(?<=\b(?:so yeah|anyway|next step|also|what if|another thing)\b)\s+/i)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  polishText(text) {
    let clean = text.replace(FILLER_REGEX, '').replace(/\s{2,}/g, ' ').trim();
    if (!clean) return text;
    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!/[.!?]$/.test(clean)) clean += '.';
    return clean;
  }

  cleanActionSentence(str) {
    let cleaned = str
      .replace(/^(action item:?|next step:?|next action:?|i need to|we must|make sure to|don't forget to|let's|remember to)\s*/i, '')
      .trim();
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return cleaned.replace(/[.]+$/, '');
  }

  generateIdeaTitle(str) {
    const stripped = str
      .replace(/^(what if we|what if|the breakthrough is|the real trick is|the real insight is|i realized that|we should|imagine an app that|imagine if)\s*/i, '')
      .trim();
    const words = stripped.split(/\s+/).slice(0, 6);
    let title = words.join(' ');
    title = title.replace(/[.,:;!?]+$/, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return title.length > 4 ? title : 'Breakthrough Walking Insight';
  }

  generateSessionTitle(ideas, transcript) {
    if (ideas.length > 0 && ideas[0].title) {
      return `Walk: ${ideas[0].title}`;
    }
    const words = transcript.split(/\s+/).slice(0, 5).join(' ').replace(/[.,!?]+$/, '');
    return `Walk: ${words || 'Idea Capture'}`;
  }

  generateSummary(ideas, actionItems, transcript) {
    if (ideas.length > 0) {
      const topIdea = ideas[0];
      let sum = `Explored "${topIdea.title}" — ${topIdea.description}.`;
      if (actionItems.length > 0) {
        sum += ` Priority next step: ${actionItems[0].task}.`;
      }
      return sum;
    }
    return transcript.slice(0, 160) + (transcript.length > 160 ? '...' : '');
  }

  categorizeSentence(text) {
    const lower = text.toLowerCase();
    if (/\b(app|ui|ux|software|feature|product|user|mobile|design|frontend|backend|click|button)\b/.test(lower)) return 'Product';
    if (/\b(market|startup|revenue|growth|competitor|business|customer|sales|pricing|strategy)\b/.test(lower)) return 'Strategy';
    if (/\b(habit|routine|walk|walking|health|cadence|sleep|energy|focus|mindset|morning)\b/.test(lower)) return 'Habits';
    if (/\b(write|writing|book|creative|story|essay|substack|podcast|video|content)\b/.test(lower)) return 'Creativity';
    if (/\b(api|code|database|deploy|server|git|bug|python|javascript|cloud)\b/.test(lower)) return 'Engineering';
    return 'Innovation';
  }
}
