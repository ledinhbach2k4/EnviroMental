/**
 * Sentiment Analyzer Service
 * Analyzes free-text notes for stress-related keywords and emotional tone
 * Returns sentiment score and detected stress indicators
 */

const STRESS_KEYWORDS = [
  'overwhelmed', 'burnout', 'exhausted', 'anxious', 'panic', 'stressed',
  'pressure', 'deadline', 'crisis', 'breakdown', 'meltdown', 'fatigue',
  'insomnia', 'sleepless', 'worried', 'fear', 'dread', 'hopeless',
  'helpless', 'trapped', 'suffocating', 'drowning', 'breaking point',
  'mental exhaustion', 'emotional exhaustion', 'chronic stress',
];

const POSITIVE_KEYWORDS = [
  'calm', 'relaxed', 'peaceful', 'content', 'happy', 'joyful',
  'grateful', 'optimistic', 'hopeful', 'confident', 'energized',
  'refreshed', 'recharged', 'balanced', 'centered', 'grounded',
  'mindful', 'present', 'serene', 'tranquil',
];

const URGENCY_KEYWORDS = {
  high: ['crisis', 'emergency', 'suicide', 'self-harm', 'hurt myself', 'end it all', 'can\'t go on'],
  medium: ['breakdown', 'meltdown', 'overwhelmed', 'can\'t cope', 'breaking point', 'desperate'],
  low: ['struggling', 'difficult', 'hard time', 'rough patch', 'stressed out'],
};

const EMOTION_PATTERNS = {
  anxiety: ['anxious', 'worried', 'nervous', 'on edge', 'panic', 'fear', 'dread', 'uneasy'],
  sadness: ['sad', 'depressed', 'down', 'blue', 'melancholy', 'grief', 'sorrow', 'lonely'],
  anger: ['angry', 'frustrated', 'irritated', 'annoyed', 'furious', 'rage', 'mad', 'resentful'],
  fatigue: ['tired', 'exhausted', 'drained', 'worn out', 'burnout', 'fatigue', 'no energy'],
  hope: ['hopeful', 'optimistic', 'looking forward', 'excited', 'motivated', 'inspired'],
  calm: ['calm', 'relaxed', 'peaceful', 'serene', 'tranquil', 'centered', 'grounded'],
};

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

export function analyzeSentiment(notes) {
  if (!notes || !notes.trim()) {
    return {
      sentimentScore: 0,
      stressKeywords: [],
      emotionTags: [],
      urgencyLevel: 'none',
    };
  }

  const tokens = tokenize(notes);

  const stressMatches = STRESS_KEYWORDS.filter(k =>
    tokens.some(t => t === k || t.includes(k))
  );
  const positiveMatches = POSITIVE_KEYWORDS.filter(k =>
    tokens.some(t => t === k || t.includes(k))
  );

  let urgency = 'none';
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some(k => notes.toLowerCase().includes(k))) {
      urgency = level;
      break;
    }
  }

  const detectedEmotions = [];
  for (const [emotion, keywords] of Object.entries(EMOTION_PATTERNS)) {
    if (keywords.some(k => notes.toLowerCase().includes(k))) {
      detectedEmotions.push(emotion);
    }
  }

  const stressCount = stressMatches.length;
  const positiveCount = positiveMatches.length;
  const totalTokens = tokens.length;

  let sentimentScore = 0;
  if (totalTokens > 0) {
    sentimentScore = (positiveCount - stressCount) / Math.max(5, totalTokens * 0.1);
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  }

  return {
    sentimentScore: Number(sentimentScore.toFixed(2)),
    stressKeywords: stressMatches,
    emotionTags: detectedEmotions,
    urgencyLevel: urgency,
  };
}

export function getSentimentLabel(score) {
  if (score <= -0.5) return 'Very Negative';
  if (score <= -0.1) return 'Negative';
  if (score < 0.1) return 'Neutral';
  if (score < 0.5) return 'Positive';
  return 'Very Positive';
}