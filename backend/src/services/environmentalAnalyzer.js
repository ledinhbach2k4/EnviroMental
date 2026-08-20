/**
 * Environmental Analyzer Service
 * Analyzes environmental factors and their impact on mental wellness
 * Provides risk assessment and contextual insights
 */

const OPTIMAL_RANGES = {
  temperature: { min: 18, max: 24, unit: '°C' },
  humidity: { min: 40, max: 60, unit: '%' },
  airQualityIndex: { min: 0, max: 50, unit: 'AQI' },
  noiseLevel: { min: 30, max: 50, unit: 'dB' },
  lightLevel: { min: 300, max: 1000, unit: 'lux' },
  uvIndex: { min: 0, max: 3, unit: '' },
  timeSpentIndoors: { min: 0, max: 12, unit: 'hrs' },
  timeSpentOutdoors: { min: 1, max: 4, unit: 'hrs' },
};

function assessFactor(name, value) {
  if (value === undefined) return null;

  const range = OPTIMAL_RANGES[name];
  const { min, max, unit } = range;

  let riskLevel = 'low';
  let impact = '';

  if (value < min) {
    const deviation = (min - value) / (min > 0 ? min : 1);
    if (deviation > 0.5) {
      riskLevel = 'high';
      impact = `Significantly below optimal (${min}-${max}${unit}). May cause discomfort or health concerns.`;
    } else {
      riskLevel = 'moderate';
      impact = `Below optimal range (${min}-${max}${unit}). Consider adjustments.`;
    }
  } else if (value > max) {
    const deviation = (value - max) / (max > 0 ? max : 1);
    if (deviation > 0.5) {
      riskLevel = 'high';
      impact = `Significantly above optimal (${min}-${max}${unit}). May cause stress or health concerns.`;
    } else {
      riskLevel = 'moderate';
      impact = `Above optimal range (${min}-${max}${unit}). Consider adjustments.`;
    }
  } else {
    riskLevel = 'low';
    impact = `Within optimal range (${min}-${max}${unit}).`;
  }

  return { name, value, unit, optimalRange: { min, max }, riskLevel, impact };
}

function getContextualInsights(input) {
  const insights = [];

  if (input.locationType === 'urban' && (input.airQualityIndex ?? 0) > 100) {
    insights.push('Urban area with elevated air pollution. Consider air purifier or limiting outdoor time during peak traffic.');
  }

  if (input.timeOfDay === 'night' && (input.lightLevel ?? 0) > 100) {
    insights.push('High light exposure at night. Blue light may disrupt circadian rhythm and sleep quality.');
  }

  if ((input.timeSpentIndoors ?? 0) > 10 && (input.timeSpentOutdoors ?? 0) < 1) {
    insights.push('Extended indoor time with minimal outdoor exposure. Vitamin D and natural light deficiency risk.');
  }

  if ((input.noiseLevel ?? 0) > 70 && input.timeOfDay === 'night') {
    insights.push('Nighttime noise pollution. Consider white noise, earplugs, or soundproofing for better sleep.');
  }

  if ((input.uvIndex ?? 0) > 5 && (input.timeSpentOutdoors ?? 0) > 2) {
    insights.push('High UV exposure during extended outdoor time. Apply sunscreen and seek shade during peak hours (10am-4pm).');
  }

  if ((input.humidity ?? 50) < 30) {
    insights.push('Low humidity may cause dry skin, respiratory irritation, and increased susceptibility to viruses.');
  }

  if ((input.humidity ?? 50) > 70) {
    insights.push('High humidity promotes mold growth and can worsen respiratory conditions. Consider dehumidifier.');
  }

  return insights;
}

export function analyzeEnvironment(input) {
  const factors = [];

  const factorNames = [
    'temperature', 'humidity', 'airQualityIndex', 'noiseLevel',
    'lightLevel', 'uvIndex', 'timeSpentIndoors', 'timeSpentOutdoors',
  ];

  for (const name of factorNames) {
    const factor = assessFactor(name, input[name]);
    if (factor) factors.push(factor);
  }

  const highRiskCount = factors.filter(f => f.riskLevel === 'high').length;
  const moderateRiskCount = factors.filter(f => f.riskLevel === 'moderate').length;

  let overallRisk = 'low';
  if (highRiskCount >= 2) overallRisk = 'high';
  else if (highRiskCount >= 1 || moderateRiskCount >= 3) overallRisk = 'moderate';

  const contextualInsights = getContextualInsights(input);

  const recommendations = [];
  if (overallRisk !== 'low') {
    recommendations.push('Consider adjusting your environment to reduce stress triggers.');
  }
  recommendations.push(...contextualInsights);

  if (recommendations.length === 0) {
    recommendations.push('Your environment appears supportive of mental wellness. Maintain current habits.');
  }

  const riskDescriptions = factors
    .filter(f => f.riskLevel !== 'low')
    .map(f => `${f.name} (${f.riskLevel})`)
    .join(', ');

  let summary = 'Environmental conditions are within optimal ranges.';
  if (overallRisk !== 'low') {
    summary = `Areas of concern: ${riskDescriptions || 'multiple factors'}. ${contextualInsights[0] || ''}`;
  }

  return {
    factors,
    overallRisk,
    summary: summary.trim(),
    recommendations,
  };
}