/**
 * Stress Score Calculator Service
 * Computes a 0-100 stress score from self-assessment and environmental inputs
 * Algorithm based on research-backed weighting of stress factors
 */

const WEIGHTS = {
  stressLevel: 0.20,
  moodLevel: 0.10,
  anxietyLevel: 0.15,
  sleepQuality: 0.10,
  energyLevel: 0.05,
  motivationLevel: 0.05,
  recentEvents: 0.05,
  temperature: 0.03,
  humidity: 0.02,
  airQuality: 0.08,
  noiseLevel: 0.07,
  lightLevel: 0.03,
  timeIndoors: 0.02,
  timeOutdoors: 0.02,
  uvIndex: 0.03,
};

function normalizeStress(value, min, max, invert = false) {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = (clamped - min) / (max - min);
  return invert ? (1 - normalized) * 100 : normalized * 100;
}

function calculateSelfAssessmentScore(input) {
  const breakdown = {
    stressLevel: 0, moodLevel: 0, anxietyLevel: 0, sleepQuality: 0,
    energyLevel: 0, motivationLevel: 0, recentEvents: 0,
    temperature: 0, humidity: 0, airQuality: 0, noiseLevel: 0,
    lightLevel: 0, timeIndoors: 0, timeOutdoors: 0, uvIndex: 0,
  };

  breakdown.stressLevel = normalizeStress(input.stressLevel, 1, 10);
  breakdown.moodLevel = normalizeStress(input.moodLevel ?? 5, 1, 10, true);
  breakdown.anxietyLevel = normalizeStress(input.anxietyLevel ?? 5, 1, 10);
  breakdown.sleepQuality = normalizeStress(input.sleepQuality ?? 5, 1, 10, true);
  breakdown.energyLevel = normalizeStress(input.energyLevel ?? 5, 1, 10, true);
  breakdown.motivationLevel = normalizeStress(input.motivationLevel ?? 5, 1, 10, true);

  const eventCount = input.recentNegativeEvents?.length ?? 0;
  breakdown.recentEvents = Math.min(100, eventCount * 15);

  const score =
    breakdown.stressLevel * WEIGHTS.stressLevel +
    breakdown.moodLevel * WEIGHTS.moodLevel +
    breakdown.anxietyLevel * WEIGHTS.anxietyLevel +
    breakdown.sleepQuality * WEIGHTS.sleepQuality +
    breakdown.energyLevel * WEIGHTS.energyLevel +
    breakdown.motivationLevel * WEIGHTS.motivationLevel +
    breakdown.recentEvents * WEIGHTS.recentEvents;

  return { score: Math.round(score), breakdown };
}

function calculateEnvironmentalScore(input) {
  const breakdown = {
    stressLevel: 0, moodLevel: 0, anxietyLevel: 0, sleepQuality: 0,
    energyLevel: 0, motivationLevel: 0, recentEvents: 0,
    temperature: 0, humidity: 0, airQuality: 0, noiseLevel: 0,
    lightLevel: 0, timeIndoors: 0, timeOutdoors: 0, uvIndex: 0,
  };

  if (input.temperature !== undefined) {
    const temp = input.temperature;
    if (temp < 15 || temp > 28) {
      breakdown.temperature = normalizeStress(Math.abs(temp - 22), 0, 15);
    } else {
      breakdown.temperature = normalizeStress(Math.abs(temp - 22), 0, 7);
    }
  }

  if (input.humidity !== undefined) {
    const hum = input.humidity;
    if (hum < 30 || hum > 70) {
      breakdown.humidity = normalizeStress(Math.abs(hum - 50), 0, 30);
    } else {
      breakdown.humidity = normalizeStress(Math.abs(hum - 50), 0, 15);
    }
  }

  if (input.airQualityIndex !== undefined) {
    breakdown.airQuality = normalizeStress(input.airQualityIndex, 0, 200);
  }

  if (input.noiseLevel !== undefined) {
    breakdown.noiseLevel = normalizeStress(input.noiseLevel, 30, 85);
  }

  if (input.lightLevel !== undefined) {
    if (input.lightLevel < 100) {
      breakdown.lightLevel = normalizeStress(100 - input.lightLevel, 0, 100);
    } else if (input.lightLevel > 1000) {
      breakdown.lightLevel = normalizeStress(input.lightLevel - 1000, 0, 500);
    } else {
      breakdown.lightLevel = 0;
    }
  }

  if (input.timeSpentIndoors !== undefined) {
    breakdown.timeIndoors = normalizeStress(input.timeSpentIndoors, 0, 16);
  }

  if (input.timeSpentOutdoors !== undefined) {
    breakdown.timeOutdoors = normalizeStress(input.timeSpentOutdoors, 0, 4, true);
  }

  if (input.uvIndex !== undefined) {
    breakdown.uvIndex = normalizeStress(input.uvIndex, 0, 8);
  }

  const score =
    breakdown.temperature * WEIGHTS.temperature +
    breakdown.humidity * WEIGHTS.humidity +
    breakdown.airQuality * WEIGHTS.airQuality +
    breakdown.noiseLevel * WEIGHTS.noiseLevel +
    breakdown.lightLevel * WEIGHTS.lightLevel +
    breakdown.timeIndoors * WEIGHTS.timeIndoors +
    breakdown.timeOutdoors * WEIGHTS.timeOutdoors +
    breakdown.uvIndex * WEIGHTS.uvIndex;

  return { score: Math.round(score), breakdown };
}

export function calculateStressScore(input) {
  const selfAssessment = calculateSelfAssessmentScore(input);
  const environmental = calculateEnvironmentalScore(input);

  const combinedBreakdown = {
    ...selfAssessment.breakdown,
    ...environmental.breakdown,
  };

  const weightedTotal = Math.round(
    selfAssessment.score * 0.7 + environmental.score * 0.3
  );

  return {
    selfAssessmentScore: selfAssessment.score,
    environmentalScore: environmental.score,
    weightedTotal: Math.max(0, Math.min(100, weightedTotal)),
    breakdown: combinedBreakdown,
  };
}

export function getStressCategory(score) {
  if (score <= 25) return { category: 'low', label: 'Low Stress', color: '#4CAF50' };
  if (score <= 50) return { category: 'moderate', label: 'Moderate Stress', color: '#FFC107' };
  if (score <= 75) return { category: 'high', label: 'High Stress', color: '#FF9800' };
  return { category: 'severe', label: 'Severe Stress', color: '#F44336' };
}