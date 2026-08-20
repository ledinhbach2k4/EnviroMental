/**
 * Recommendation Engine Service
 * Generates personalized wellness recommendations based on stress scan results
 * Categories: immediate actions, lifestyle changes, environmental adjustments, professional help
 */

import { getStressCategory } from './stressScoreCalculator.js';

const IMMEDIATE_ACTIONS = [
  {
    id: 'breathing-4-7-8',
    category: 'immediate',
    priority: 'high',
    title: '4-7-8 Breathing Technique',
    description: 'Inhale for 4 seconds, hold for 7, exhale for 8. Repeat 4 cycles to activate parasympathetic nervous system.',
    actionable: true,
    estimatedTimeMinutes: 2,
  },
  {
    id: 'grounding-5-4-3-2-1',
    category: 'immediate',
    priority: 'high',
    title: '5-4-3-2-1 Grounding Exercise',
    description: 'Identify 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Reduces anxiety spiral.',
    actionable: true,
    estimatedTimeMinutes: 3,
  },
  {
    id: 'progressive-muscle-relaxation',
    category: 'immediate',
    priority: 'medium',
    title: 'Progressive Muscle Relaxation',
    description: 'Tense and release each muscle group from toes to head. Reduces physical tension from stress.',
    actionable: true,
    estimatedTimeMinutes: 10,
  },
  {
    id: 'cold-water-face',
    category: 'immediate',
    priority: 'medium',
    title: 'Cold Water on Face',
    description: 'Splash cold water on face or hold ice pack to cheeks. Triggers mammalian dive reflex, slowing heart rate.',
    actionable: true,
    estimatedTimeMinutes: 1,
  },
  {
    id: 'brief-walk',
    category: 'immediate',
    priority: 'medium',
    title: '5-Minute Walk Outside',
    description: 'Brief outdoor movement changes environment, increases oxygen, and breaks rumination cycles.',
    actionable: true,
    estimatedTimeMinutes: 5,
  },
];

const LIFESTYLE_RECOMMENDATIONS = [
  {
    id: 'sleep-hygiene',
    category: 'lifestyle',
    priority: 'high',
    title: 'Improve Sleep Hygiene',
    description: 'Consistent bedtime, dark cool room, no screens 1hr before bed, limit caffeine after 2pm. Target 7-9 hours.',
    actionable: true,
  },
  {
    id: 'regular-exercise',
    category: 'lifestyle',
    priority: 'high',
    title: 'Regular Physical Activity',
    description: '150 min moderate or 75 min vigorous exercise weekly. Even 10-min walks reduce cortisol and boost mood.',
    actionable: true,
  },
  {
    id: 'mindfulness-daily',
    category: 'lifestyle',
    priority: 'medium',
    title: 'Daily Mindfulness Practice',
    description: '10 minutes daily meditation or mindful breathing. Reduces amygdala reactivity over time.',
    actionable: true,
    estimatedTimeMinutes: 10,
  },
  {
    id: 'social-connection',
    category: 'lifestyle',
    priority: 'medium',
    title: 'Meaningful Social Connection',
    description: 'Schedule regular check-ins with friends/family. Social support buffers stress and improves resilience.',
    actionable: true,
  },
  {
    id: 'digital-boundaries',
    category: 'lifestyle',
    priority: 'medium',
    title: 'Digital Boundaries',
    description: 'Set app limits, notification-free hours, no phones in bedroom. Reduces information overload and comparison.',
    actionable: true,
  },
  {
    id: 'nutrition-hydration',
    category: 'lifestyle',
    priority: 'low',
    title: 'Balanced Nutrition & Hydration',
    description: 'Regular meals with protein, complex carbs, omega-3s. Hydrate 2-3L water daily. Limit alcohol/sugar.',
    actionable: true,
  },
  {
    id: 'time-management',
    category: 'lifestyle',
    priority: 'low',
    title: 'Time Management & Boundaries',
    description: 'Use time-blocking, learn to say no, delegate, schedule breaks. Prevents overwhelm and burnout.',
    actionable: true,
  },
];

const ENVIRONMENTAL_RECOMMENDATIONS = {
  temperature: [
    { id: 'temp-adjust', category: 'environmental', priority: 'high', title: 'Adjust Room Temperature', description: 'Set thermostat to 18-24°C (65-75°F). Use layers, fans, or space heater as needed.', actionable: true },
  ],
  humidity: [
    { id: 'humidity-control', category: 'environmental', priority: 'medium', title: 'Control Humidity', description: 'Use humidifier (if <30%) or dehumidifier (if >60%). Target 40-60% for comfort and health.', actionable: true },
  ],
  airQualityIndex: [
    { id: 'air-purifier', category: 'environmental', priority: 'high', title: 'Use Air Purifier', description: 'HEPA filter reduces PM2.5, allergens. Keep windows closed during high pollution. Monitor AQI apps.', actionable: true },
    { id: 'indoor-plants', category: 'environmental', priority: 'low', title: 'Add Air-Purifying Plants', description: 'Snake plant, spider plant, peace lily naturally filter indoor air. Low maintenance.', actionable: true },
  ],
  noiseLevel: [
    { id: 'noise-reduction', category: 'environmental', priority: 'high', title: 'Reduce Noise Exposure', description: 'White noise machine, earplugs, soundproof curtains, rugs. Create quiet sanctuary for sleep/focus.', actionable: true },
  ],
  lightLevel: [
    { id: 'light-optimize', category: 'environmental', priority: 'medium', title: 'Optimize Light Exposure', description: 'Bright morning light (10k+ lux), dim warm lights evening. Blue-light filters after sunset. Red/amber night lights.', actionable: true },
  ],
  uvIndex: [
    { id: 'uv-protection', category: 'environmental', priority: 'medium', title: 'UV Protection', description: 'SPF 30+ broad spectrum, reapply every 2hrs. Hat, sunglasses, shade 10am-4pm. Vitamin D supplement if deficient.', actionable: true },
  ],
  timeSpentIndoors: [
    { id: 'outdoor-time', category: 'environmental', priority: 'high', title: 'Increase Outdoor Time', description: 'Target 30-60 min daily natural light. Morning walk, lunch outside, garden time. Boosts vitamin D, circadian rhythm, mood.', actionable: true },
  ],
  timeSpentOutdoors: [
    { id: 'maintain-outdoor', category: 'environmental', priority: 'low', title: 'Maintain Outdoor Habits', description: 'Current outdoor time is beneficial. Continue regular nature exposure for stress resilience.', actionable: true },
  ],
};

const PROFESSIONAL_RECOMMENDATIONS = [
  {
    id: 'therapy-cbt',
    category: 'professional',
    priority: 'high',
    title: 'Cognitive Behavioral Therapy (CBT)',
    description: 'Evidence-based for anxiety, depression, stress. Teaches thought restructuring and coping skills. Many offer telehealth.',
    actionable: true,
  },
  {
    id: 'therapy-mbsr',
    category: 'professional',
    priority: 'medium',
    title: 'Mindfulness-Based Stress Reduction (MBSR)',
    description: '8-week structured program combining mindfulness meditation and yoga. Proven to reduce stress and improve wellbeing.',
    actionable: true,
  },
  {
    id: 'psychiatrist',
    category: 'professional',
    priority: 'high',
    title: 'Psychiatric Evaluation',
    description: 'If symptoms persist >2 weeks or impair daily function. Can assess for medication, rule out medical causes.',
    actionable: true,
  },
  {
    id: 'crisis-line',
    category: 'professional',
    priority: 'high',
    title: 'Crisis Resources',
    description: '988 (US Suicide & Crisis Lifeline), Crisis Text Line: HOME to 741741, or local emergency services. Available 24/7.',
    actionable: true,
  },
];

function selectImmediate(context) {
  const selected = [];

  if (context.stressScore >= 75 || context.sentiment.urgencyLevel === 'high') {
    selected.push(...IMMEDIATE_ACTIONS.slice(0, 3));
  } else if (context.stressScore >= 50 || context.sentiment.urgencyLevel === 'medium') {
    selected.push(IMMEDIATE_ACTIONS[0], IMMEDIATE_ACTIONS[1], IMMEDIATE_ACTIONS[3]);
  } else {
    selected.push(IMMEDIATE_ACTIONS[0]);
  }

  return selected;
}

function selectLifestyle(context) {
  const selected = [];

  if (context.breakdown.sleepQuality > 60) {
    selected.push(LIFESTYLE_RECOMMENDATIONS.find(r => r.id === 'sleep-hygiene'));
  }
  if (context.breakdown.energyLevel > 60 || context.breakdown.motivationLevel > 60) {
    selected.push(LIFESTYLE_RECOMMENDATIONS.find(r => r.id === 'regular-exercise'));
  }
  if (context.stressScore > 40) {
    selected.push(LIFESTYLE_RECOMMENDATIONS.find(r => r.id === 'mindfulness-daily'));
  }
  if (context.recentEvents.length > 2) {
    selected.push(LIFESTYLE_RECOMMENDATIONS.find(r => r.id === 'social-connection'));
  }

  selected.push(LIFESTYLE_RECOMMENDATIONS.find(r => r.id === 'digital-boundaries'));

  return [...new Set(selected)].slice(0, 4);
}

function selectEnvironmental(context) {
  const selected = [];

  for (const factor of context.environment.factors) {
    if (factor.riskLevel === 'high' || factor.riskLevel === 'moderate') {
      const recs = ENVIRONMENTAL_RECOMMENDATIONS[factor.name];
      if (recs) selected.push(...recs);
    }
  }

  if (context.environment.overallRisk === 'low') {
    selected.push(ENVIRONMENTAL_RECOMMENDATIONS.timeSpentOutdoors[0]);
  }

  return [...new Set(selected)].slice(0, 4);
}

function selectProfessional(context) {
  const selected = [];

  const stressCategory = getStressCategory(context.stressScore);
  const urgencyLevel = context.sentiment.urgencyLevel;

  if (urgencyLevel === 'high' || stressCategory.category === 'severe') {
    selected.push(PROFESSIONAL_RECOMMENDATIONS.find(r => r.id === 'crisis-line'));
    selected.push(PROFESSIONAL_RECOMMENDATIONS.find(r => r.id === 'psychiatrist'));
  } else if (urgencyLevel === 'medium' || stressCategory.category === 'high') {
    selected.push(PROFESSIONAL_RECOMMENDATIONS.find(r => r.id === 'therapy-cbt'));
    selected.push(PROFESSIONAL_RECOMMENDATIONS.find(r => r.id === 'therapy-mbsr'));
  } else if (stressCategory.category === 'moderate') {
    selected.push(PROFESSIONAL_RECOMMENDATIONS.find(r => r.id === 'therapy-cbt'));
  }

  return [...new Set(selected)].slice(0, 3);
}

export function generateRecommendations(context) {
  return {
    immediate: selectImmediate(context),
    lifestyle: selectLifestyle(context),
    environmental: selectEnvironmental(context),
    professional: selectProfessional(context),
    disclaimer: 'These recommendations are for informational purposes only and do not constitute medical advice. ' +
      'If you are experiencing severe distress, thoughts of self-harm, or a mental health crisis, ' +
      'please contact emergency services (911 in US) or a crisis line (988 in US) immediately.',
  };
}