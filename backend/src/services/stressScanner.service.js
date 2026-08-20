/**
 * Stress Scanner Service - Main Orchestrator
 * Coordinates all analysis services to produce comprehensive wellness scan results
 */

import { db } from '../config/db.js';
import { stressScans } from '../db/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

import { calculateStressScore, getStressCategory } from './stressScoreCalculator.js';
import { analyzeSentiment } from './sentimentAnalyzer.js';
import { analyzeEnvironment } from './environmentalAnalyzer.js';
import { generateRecommendations } from './recommendationEngine.js';

async function fetchEnvironmentalData(userId, timeOfDay) {
  try {
    const envData = await db.query.environmentData.findFirst({
      where: and(
        eq(sql`user_id`, userId),
        eq(sql`time_of_day`, timeOfDay ?? 'current')
      ),
      orderBy: desc(sql`created_at`),
    });

    if (envData) {
      return {
        temperature: envData.temperature ?? undefined,
        humidity: envData.humidity ?? undefined,
        airQualityIndex: envData.airQualityIndex ?? undefined,
        noiseLevel: envData.noiseLevel ?? undefined,
        lightLevel: envData.lightLevel ?? undefined,
      };
    }
  } catch (error) {
    console.warn('Failed to fetch environmental data:', error);
  }
  return {};
}

export async function createStressScan(input) {
  const enrichedInput = { ...input };

  if (!input.temperature || !input.humidity || !input.airQualityIndex) {
    const envData = await fetchEnvironmentalData(input.userId, input.timeOfDay);
    enrichedInput.temperature = input.temperature ?? envData.temperature;
    enrichedInput.humidity = input.humidity ?? envData.humidity;
    enrichedInput.airQualityIndex = input.airQualityIndex ?? envData.airQualityIndex;
    enrichedInput.noiseLevel = input.noiseLevel ?? envData.noiseLevel;
    enrichedInput.lightLevel = input.lightLevel ?? envData.lightLevel;
  }

  const scoreComponents = calculateStressScore(enrichedInput);
  const { category: stressCategory } = getStressCategory(scoreComponents.weightedTotal);
  const sentiment = analyzeSentiment(enrichedInput.notes ?? '');
  const environment = analyzeEnvironment(enrichedInput);

  const recommendations = generateRecommendations({
    stressScore: scoreComponents.weightedTotal,
    selfAssessmentScore: scoreComponents.selfAssessmentScore,
    environmentalScore: scoreComponents.environmentalScore,
    breakdown: scoreComponents.breakdown,
    sentiment,
    environment,
    recentEvents: enrichedInput.recentNegativeEvents ?? [],
  });

  const [inserted] = await db.insert(stressScans).values({
    userId: enrichedInput.userId,
    stressLevel: enrichedInput.stressLevel,
    moodLevel: enrichedInput.moodLevel,
    anxietyLevel: enrichedInput.anxietyLevel,
    sleepQuality: enrichedInput.sleepQuality,
    energyLevel: enrichedInput.energyLevel,
    motivationLevel: enrichedInput.motivationLevel,
    notes: enrichedInput.notes,
    recentNegativeEvents: enrichedInput.recentNegativeEvents,
    temperature: enrichedInput.temperature,
    humidity: enrichedInput.humidity,
    airQualityIndex: enrichedInput.airQualityIndex,
    uvIndex: enrichedInput.uvIndex,
    noiseLevel: enrichedInput.noiseLevel,
    lightLevel: enrichedInput.lightLevel,
    timeSpentIndoors: enrichedInput.timeSpentIndoors,
    timeSpentOutdoors: enrichedInput.timeSpentOutdoors,
    locationType: enrichedInput.locationType,
    timeOfDay: enrichedInput.timeOfDay,
    stressScore: scoreComponents.weightedTotal,
    stressCategory,
    selfAssessmentScore: scoreComponents.selfAssessmentScore,
    environmentalScore: scoreComponents.environmentalScore,
    scoreBreakdown: scoreComponents.breakdown,
    sentiment: sentiment,
    environment: environment,
    recommendations: recommendations,
  }).returning();

  return {
    id: inserted.id,
    userId: inserted.userId,
    createdAt: inserted.createdAt,
    stressScore: inserted.stressScore,
    stressCategory: inserted.stressCategory,
    selfAssessmentScore: inserted.selfAssessmentScore,
    environmentalScore: inserted.environmentalScore,
    scoreBreakdown: inserted.scoreBreakdown,
    sentiment: inserted.sentiment,
    environment: inserted.environment,
    recommendations: inserted.recommendations,
  };
}

export async function getStressScanById(id, userId) {
  const scan = await db.query.stressScans.findFirst({
    where: and(eq(stressScans.id, id), eq(stressScans.userId, userId)),
  });

  if (!scan) return null;

  return {
    id: scan.id,
    userId: scan.userId,
    createdAt: scan.createdAt,
    stressScore: scan.stressScore,
    stressCategory: scan.stressCategory,
    selfAssessmentScore: scan.selfAssessmentScore,
    environmentalScore: scan.environmentalScore,
    scoreBreakdown: scan.scoreBreakdown,
    sentiment: scan.sentiment,
    environment: scan.environment,
    recommendations: scan.recommendations,
  };
}

export async function getStressScans(userId, options = {}) {
  const { limit = 20, offset = 0, days } = options;

  let whereClause = and(eq(stressScans.userId, userId));

  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    whereClause = and(whereClause, gte(stressScans.createdAt, cutoffDate));
  }

  const scans = await db.query.stressScans.findMany({
    where: whereClause,
    orderBy: desc(stressScans.createdAt),
    limit,
    offset,
  });

  return scans.map(scan => ({
    id: scan.id,
    userId: scan.userId,
    createdAt: scan.createdAt,
    stressScore: scan.stressScore,
    stressCategory: scan.stressCategory,
    selfAssessmentScore: scan.selfAssessmentScore,
    environmentalScore: scan.environmentalScore,
    scoreBreakdown: scan.scoreBreakdown,
    sentiment: scan.sentiment,
    environment: scan.environment,
    recommendations: scan.recommendations,
  }));
}

export async function getStressTrends(userId, days = 30) {
  const scans = await getStressScans(userId, { days, limit: 100 });

  if (scans.length === 0) {
    return {
      averageScore: 0,
      trend: 'stable',
      categoryDistribution: {},
      weeklyAverages: [],
    };
  }

  const averageScore = scans.reduce((sum, s) => sum + s.stressScore, 0) / scans.length;

  const categoryDistribution = {};
  for (const scan of scans) {
    categoryDistribution[scan.stressCategory] = (categoryDistribution[scan.stressCategory] || 0) + 1;
  }

  const weeklyMap = new Map();
  for (const scan of scans) {
    const date = new Date(scan.createdAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    const existing = weeklyMap.get(weekKey) || { sum: 0, count: 0 };
    existing.sum += scan.stressScore;
    existing.count += 1;
    weeklyMap.set(weekKey, existing);
  }

  const weeklyAverages = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({ week, average: Math.round(data.sum / data.count) }))
    .sort((a, b) => a.week.localeCompare(b.week));

  let trend = 'stable';
  if (weeklyAverages.length >= 2) {
    const recent = weeklyAverages.slice(-2);
    const diff = recent[1].average - recent[0].average;
    if (diff > 5) trend = 'worsening';
    else if (diff < -5) trend = 'improving';
  }

  return {
    averageScore: Math.round(averageScore),
    trend,
    categoryDistribution,
    weeklyAverages,
  };
}

export async function deleteStressScan(id, userId) {
  const result = await db.delete(stressScans)
    .where(and(eq(stressScans.id, id), eq(stressScans.userId, userId)));
  return (result.rowCount ?? 0) > 0;
}

export const stressScannerService = {
  createStressScan,
  getStressScanById,
  getStressScans,
  getStressTrends,
  deleteStressScan,
};