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

function getDaysAgo(date, nowMs = Date.now()) {
  const created = new Date(date).getTime();
  const diffMs = nowMs - created;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

function getLongestStreak(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return 0;
  }

  let maxStreak = 0;
  let current = 0;

  for (const val of history) {
    if (val === true) {
      current += 1;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }

  return maxStreak;
}

function getStreakBonus(streak) {
  if (streak >= 30) {
    return 20;
  }
  if (streak >= 14) {
    return 15;
  }
  if (streak >= 7) {
    return 10;
  }
  if (streak >= 3) {
    return 5;
  }
  return 0;
}

function getCircadianMultiplier(lightLevel, now = new Date()) {
  if (lightLevel === undefined || lightLevel === null) {
    return 1;
  }

  const hour = now.getHours();

  if (hour >= 6 && hour <= 8) {
    return 0.5;
  }

  return 1;
}

function normalizeAqi(aqi) {
  if (aqi === undefined || aqi === null) {
    return null;
  }

  // Auto-detect scale: >5 means 0-500 scale, otherwise 1-5 scale
  if (aqi > 5) {
    // 0-500 US EPA scale
    return normalize(aqi, 0, 500);
  }

  // 1-5 scale
  return normalize(aqi, 1, 5);
}

/**
 * Calculate mood stress score with temporal decay and trend detection
 * Uses exponential decay weighting by days-ago
 */
function calculateMoodScore(moodEntries, now = new Date()) {
  if (!moodEntries || moodEntries.length === 0) {
    return { score: null, hasData: false, trend: null };
  }

  const lambda = 0.35; // decay constant ~ half-life 2 days
  let weightedSum = 0;
  let weightTotal = 0;
  const nowMs = now.getTime();

  for (const entry of moodEntries) {
    const daysAgo = getDaysAgo(entry.createdAt, nowMs);
    const decayWeight = Math.exp(-lambda * daysAgo);
    const stress = normalize(entry.moodLevel, 1, 10, true);
    weightedSum += stress * decayWeight;
    weightTotal += decayWeight;
  }

  const avgScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Trend detection: improving / worsening / null
  let trend = null;
  if (moodEntries.length >= 2) {
    const sortedAsc = [...moodEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    // Compare older half vs newer half
    const half = Math.floor(sortedAsc.length / 2);
    const older = sortedAsc.slice(0, half);
    const newer = sortedAsc.slice(-half);

    if (older.length > 0 && newer.length > 0) {
      const olderAvg =
        older.reduce((sum, e) => sum + e.moodLevel, 0) / older.length;
      const newerAvg =
        newer.reduce((sum, e) => sum + e.moodLevel, 0) / newer.length;
      const diff = newerAvg - olderAvg;

      if (diff >= 0.5) {
        trend = 'improving';
      } else if (diff <= -0.5) {
        trend = 'worsening';
      }
    }
  }

  return { score: Math.round(avgScore), hasData: true, trend };
}

/**
 * Calculate habit completion stress score with streak bonus
 * Based on completion rate + longest streak from completion_history
 */
function calculateHabitScore(habits) {
  if (!habits || habits.length === 0) {
    return { score: null, hasData: false, streak: 0, longestStreak: 0 };
  }

  const activeHabits = habits.filter((h) => h.isActive !== false);

  if (activeHabits.length === 0) {
    return { score: null, hasData: false, streak: 0, longestStreak: 0 };
  }

  const completedCount = activeHabits.filter((h) => h.completedToday).length;
  const completionRate = completedCount / activeHabits.length;
  let stressScore = normalize(completionRate, 0, 1, true);

  // Streak bonus: read completionHistory / completion_history
  let longestStreak = 0;
  for (const habit of activeHabits) {
    const raw =
      habit.completionHistory ?? habit.completion_history ?? habit.history ?? [];
    const streak = getLongestStreak(Array.isArray(raw) ? raw : []);
    longestStreak = Math.max(longestStreak, streak);
  }

  const bonus = getStreakBonus(longestStreak);
  stressScore = Math.max(0, stressScore - bonus);

  return {
    score: Math.round(stressScore),
    hasData: true,
    streak: longestStreak,
    longestStreak,
  };
}

/**
 * Calculate environmental stress score from weather and AQI
 * Combines temperature (Vietnam 20-26°C), AQI (auto-detect), humidity, light circadian
 */
function calculateEnvironmentScore(weather, airQuality, now = new Date()) {
  const factors = [];
  let circadianMultiplier = 1;

  // Temperature - Vietnam optimized 20-26°C (optimal)
  if (weather?.temperature !== undefined && weather.temperature !== null) {
    const temp = weather.temperature;
    let tempStress = 0;
    if (temp >= 20 && temp <= 26) {
      // Optimal range for Vietnam climate
      tempStress = 0;
    } else if (temp < 15) {
      tempStress = normalize(15 - temp, 0, 15);
    } else if (temp > 30) {
      tempStress = normalize(temp - 30, 0, 15);
    } else if (temp < 20) {
      tempStress = normalize(20 - temp, 0, 5);
    } else if (temp > 26) {
      tempStress = normalize(temp - 26, 0, 4);
    }
    factors.push({ name: 'temperature', value: tempStress, weight: 0.3 });
  }

  // Humidity (>85% or <30%, low weight 0.05)
  const humidity = weather?.humidity;
  if (humidity !== undefined && humidity !== null) {
    let humStress = 0;
    if (humidity > 85) {
      humStress = normalize(humidity - 85, 0, 15);
    } else if (humidity < 30) {
      humStress = normalize(30 - humidity, 0, 30);
    }
    factors.push({ name: 'humidity', value: humStress, weight: 0.05 });
  }

  // AQI auto-detect
  const aqiVal = airQuality?.aqi ?? airQuality?.airQualityIndex ?? weather?.airQualityIndex;
  if (aqiVal !== undefined && aqiVal !== null) {
    const aqiStress = normalizeAqi(aqiVal);
    if (aqiStress !== null) {
      factors.push({ name: 'airQuality', value: aqiStress, weight: 0.4 });
    }
  }

  // Weather condition stress
  if (weather?.description) {
    const stressfulConditions = [
      'rain',
      'storm',
      'snow',
      'fog',
      'haze',
      'thunderstorm',
      'drizzle',
    ];
    const desc = weather.description.toLowerCase();
    const hasStressfulWeather = stressfulConditions.some((c) => desc.includes(c));
    if (hasStressfulWeather) {
      factors.push({ name: 'weatherCondition', value: 60, weight: 0.15 });
    }
  }

  // Light circadian adjustment (6-8AM window)
  let lightStress = null;
  const lightLevel = weather?.lightLevel ?? airQuality?.lightLevel;
  if (lightLevel !== undefined && lightLevel !== null) {
    circadianMultiplier = getCircadianMultiplier(lightLevel, now);
    if (lightLevel < 100) {
      lightStress = normalize(100 - lightLevel, 0, 100) * circadianMultiplier;
    } else if (lightLevel > 1000) {
      lightStress = normalize(lightLevel - 1000, 0, 500) * circadianMultiplier;
    } else {
      lightStress = 0;
    }
    factors.push({ name: 'lightLevel', value: lightStress, weight: 0.1 });
  } else {
    circadianMultiplier = getCircadianMultiplier(null, now);
  }

  if (factors.length === 0) {
    return { score: null, hasData: false, circadianMultiplier };
  }

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedScore =
    factors.reduce((sum, f) => sum + f.value * f.weight, 0) / totalWeight;

  return { score: Math.round(weightedScore), hasData: true, circadianMultiplier };
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
  const now = new Date();
  const mood = calculateMoodScore(moodEntries, now);
  const habit = calculateHabitScore(habits);
  const environment = calculateEnvironmentScore(weather, airQuality, now);

  const sources = [
    { name: 'mood', ...mood, baseWeight: 0.4 },
    { name: 'habits', ...habit, baseWeight: 0.3 },
    { name: 'environment', ...environment, baseWeight: 0.3 },
  ];

  const availableSources = sources.filter((s) => s.hasData);
  const missingSources = sources.filter((s) => !s.hasData);

  if (availableSources.length === 0) {
    return {
      score: null,
      category: 'unknown',
      label: 'Insufficient Data',
      breakdown: { mood: null, habits: null, environment: null },
      message: 'Log your first mood or habit to see your cortisol risk score.',
      warnings: ['No data available — log a mood or complete a habit to get started.'],
      circadianMultiplier: environment.circadianMultiplier ?? 1,
      timestamp: now.toISOString(),
    };
  }

  // Redistribute weights from missing sources
  const missingWeight = missingSources.reduce((sum, s) => sum + s.baseWeight, 0);
  const availableWeight = availableSources.reduce((sum, s) => sum + s.baseWeight, 0);

  const adjustedSources = availableSources.map((s) => ({
    ...s,
    adjustedWeight: s.baseWeight + (s.baseWeight / availableWeight) * missingWeight,
  }));

  // Calculate weighted score
  const weightedScore = adjustedSources.reduce(
    (sum, s) => sum + s.score * s.adjustedWeight,
    0,
  );

  const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

  // Determine category
  let category;
  let label;
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

  // Warnings for stale data
  const warnings = [];
  if (!mood.hasData) {
    warnings.push('Mood data is missing — log a mood entry for a more accurate score.');
  } else if (moodEntries && moodEntries.length > 0) {
    const latest = [...moodEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const daysSince = getDaysAgo(latest.createdAt);
    if (daysSince > 3) {
      warnings.push('Mood data is stale — your last entry was more than 3 days ago.');
    }
  }

  if (!habit.hasData) {
    warnings.push('No habits tracked — add habits to calibrate your score.');
  }

  if (!environment.hasData) {
    warnings.push('Environmental data unavailable — allow location access for a complete assessment.');
  } else if (environment.score === null) {
    warnings.push('Environmental data is incomplete.');
  }

  if (availableSources.length < 3) {
    warnings.push('Score is based on limited data and may be less accurate.');
  }

  // Build dynamic message
  const messages = [];
  if (mood.hasData && mood.score > 66) {
    messages.push('recent low mood');
  }
  if (habit.hasData && habit.score > 66) {
    messages.push('low habit completion');
  }
  if (environment.hasData && environment.score > 66) {
    messages.push('environmental stressors');
  }

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
      mood: mood.hasData
        ? {
            score: mood.score,
            weight: adjustedSources.find((s) => s.name === 'mood')?.adjustedWeight ?? 0.4,
            trend: mood.trend,
          }
        : null,
      habits: habit.hasData
        ? {
            score: habit.score,
            weight: adjustedSources.find((s) => s.name === 'habits')?.adjustedWeight ?? 0.3,
            streak: habit.streak,
          }
        : null,
      environment: environment.hasData
        ? {
            score: environment.score,
            weight: adjustedSources.find((s) => s.name === 'environment')?.adjustedWeight ?? 0.3,
          }
        : null,
    },
    message,
    warnings,
    circadianMultiplier: environment.circadianMultiplier ?? 1,
    timestamp: now.toISOString(),
  };
}

// Export helpers for testing
export {
  normalize,
  getDaysAgo,
  getLongestStreak,
  getStreakBonus,
  getCircadianMultiplier,
  normalizeAqi,
  calculateMoodScore,
  calculateHabitScore,
  calculateEnvironmentScore,
};
