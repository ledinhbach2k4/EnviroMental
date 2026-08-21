/**
 * Cortisol Risk Score Service
 * Calculates an estimated cortisol risk score (0-100) based on:
 * - Mood data (40% weight)
 * - Habit completion (30% weight)
 * - Environmental factors (30% weight)
 * 
 * NOT a medical diagnosis - for wellness awareness only.
 */

function normalize(value, min, max, invert = false) {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = (clamped - min) / (max - min);
  return invert ? (1 - normalized) * 100 : normalized * 100;
}

/**
 * Calculate mood stress score from recent mood entries
 * Mood levels 1-10 (1=very sad, 10=very happy)
 * Map to stress: 1=100, 5=50, 10=0
 * Average last 3 days of mood entries
 */
function calculateMoodScore(moodEntries) {
  if (!moodEntries || moodEntries.length === 0) {
    return { score: null, hasData: false };
  }

  // Sort by date descending and take last 3 days
  const sorted = [...moodEntries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = sorted.slice(0, 3);
  
  const moodStressValues = recent.map(entry => {
    // moodLevel is 1-10, invert to stress (1=100 stress, 10=0 stress)
    return normalize(entry.moodLevel, 1, 10, true);
  });

  const avgScore = moodStressValues.reduce((a, b) => a + b, 0) / moodStressValues.length;
  
  return { score: Math.round(avgScore), hasData: true };
}

/**
 * Calculate habit completion stress score
 * Based on completion rate of active habits for today
 * 0% completed = 100 stress, 100% completed = 0 stress
 */
function calculateHabitScore(habits) {
  if (!habits || habits.length === 0) {
    return { score: null, hasData: false };
  }

  const activeHabits = habits.filter(h => h.isActive !== false);
  
  if (activeHabits.length === 0) {
    return { score: null, hasData: false };
  }

  const completedCount = activeHabits.filter(h => h.completedToday).length;
  const completionRate = completedCount / activeHabits.length;
  
  // 0% = 100 stress, 100% = 0 stress
  const stressScore = normalize(completionRate, 0, 1, true);
  
  return { score: Math.round(stressScore), hasData: true };
}

/**
 * Calculate environmental stress score from weather and AQI
 * Combines temperature extremes, AQI, and weather conditions
 */
function calculateEnvironmentScore(weather, airQuality) {
  const factors = [];
  
  // Temperature stress (extreme temps increase stress)
  if (weather?.temperature !== undefined) {
    const temp = weather.temperature;
    // Optimal range 18-24°C, stress increases outside this range
    let tempStress = 0;
    if (temp < 10) tempStress = normalize(10 - temp, 0, 10); // Cold stress
    else if (temp > 28) tempStress = normalize(temp - 28, 0, 15); // Heat stress
    else if (temp < 18) tempStress = normalize(18 - temp, 0, 8); // Cool stress
    else if (temp > 24) tempStress = normalize(temp - 24, 0, 8); // Warm stress
    factors.push({ name: 'temperature', value: tempStress, weight: 0.3 });
  }
  
  // AQI stress (higher AQI = more stress)
  if (airQuality?.aqi !== undefined) {
    const aqi = airQuality.aqi;
    // AQI 1-5 scale (1=Good, 5=Very Poor)
    const aqiStress = normalize(aqi, 1, 5);
    factors.push({ name: 'airQuality', value: aqiStress, weight: 0.5 });
  }
  
  // Weather condition stress
  if (weather?.description) {
    const stressfulConditions = ['rain', 'storm', 'snow', 'fog', 'haze', 'thunderstorm', 'drizzle'];
    const desc = weather.description.toLowerCase();
    const hasStressfulWeather = stressfulConditions.some(c => desc.includes(c));
    if (hasStressfulWeather) {
      factors.push({ name: 'weatherCondition', value: 60, weight: 0.2 });
    }
  }

  if (factors.length === 0) {
    return { score: null, hasData: false };
  }

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedScore = factors.reduce((sum, f) => sum + f.value * f.weight, 0) / totalWeight;
  
  return { score: Math.round(weightedScore), hasData: true };
}

/**
 * Calculate cortisol risk score with dynamic weight redistribution
 * 
 * Weights:
 * - Mood: 40%
 * - Habits: 30%
 * - Environment: 30%
 * 
 * If a data source is missing, redistribute its weight to available sources
 */
export function calculateCortisolScore({ moodEntries, habits, weather, airQuality }) {
  const mood = calculateMoodScore(moodEntries);
  const habit = calculateHabitScore(habits);
  const environment = calculateEnvironmentScore(weather, airQuality);

  const sources = [
    { name: 'mood', ...mood, baseWeight: 0.4 },
    { name: 'habits', ...habit, baseWeight: 0.3 },
    { name: 'environment', ...environment, baseWeight: 0.3 },
  ];

  const availableSources = sources.filter(s => s.hasData);
  const missingSources = sources.filter(s => !s.hasData);

  if (availableSources.length === 0) {
    return {
      score: null,
      category: 'unknown',
      label: 'Insufficient Data',
      breakdown: { mood: null, habits: null, environment: null },
      message: 'Log your first mood or habit to see your cortisol risk score.',
    };
  }

  // Redistribute weights from missing sources
  const missingWeight = missingSources.reduce((sum, s) => sum + s.baseWeight, 0);
  const availableWeight = availableSources.reduce((sum, s) => sum + s.baseWeight, 0);
  
  const adjustedSources = availableSources.map(s => ({
    ...s,
    adjustedWeight: s.baseWeight + (s.baseWeight / availableWeight) * missingWeight,
  }));

  // Calculate weighted score
  const weightedScore = adjustedSources.reduce(
    (sum, s) => sum + s.score * s.adjustedWeight, 
    0
  );

  const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

  // Determine category
  let category, label;
  if (finalScore <= 33) {
    category = 'low';
    label = 'Low Risk';
  } else if (finalScore <= 66) {
    category = 'medium';
    label = 'Medium Risk';
  } else {
    category = 'high';
    label = 'High Risk';
  }

  // Build dynamic message
  const messages = [];
  if (mood.hasData && mood.score > 66) messages.push('recent low mood');
  if (habit.hasData && habit.score > 66) messages.push('low habit completion');
  if (environment.hasData && environment.score > 66) messages.push('environmental stressors');
  
  let message;
  if (finalScore <= 33) {
    message = 'Your wellness indicators look good. Keep it up!';
  } else if (messages.length > 0) {
    message = `${messages.join(' and ')} ${messages.length > 1 ? 'are' : 'is'} increasing your stress risk.`;
  } else {
    message = 'Moderate stress indicators detected. Consider a quick break or breathing exercise.';
  }

  return {
    score: finalScore,
    category,
    label,
    breakdown: {
      mood: mood.hasData ? { score: mood.score, weight: adjustedSources.find(s => s.name === 'mood')?.adjustedWeight ?? 0.4 } : null,
      habits: habit.hasData ? { score: habit.score, weight: adjustedSources.find(s => s.name === 'habits')?.adjustedWeight ?? 0.3 } : null,
      environment: environment.hasData ? { score: environment.score, weight: adjustedSources.find(s => s.name === 'environment')?.adjustedWeight ?? 0.3 } : null,
    },
    message,
  };
}