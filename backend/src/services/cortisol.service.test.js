import { describe, it, expect } from "vitest";
import {
  calculateCortisolScore,
  calculateMoodScore,
  calculateHabitScore,
  calculateEnvironmentScore,
  getLongestStreak,
  getStreakBonus,
  normalizeAqi,
  getCircadianMultiplier,
} from "./cortisol.service.js";

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe("cortisol.service - temporal decay", () => {
  it("weights recent moods more than older moods", () => {
    const recentHigh = [
      { moodLevel: 10, createdAt: daysAgo(0) },
      { moodLevel: 1, createdAt: daysAgo(5) },
    ];
    const recentLow = [
      { moodLevel: 1, createdAt: daysAgo(0) },
      { moodLevel: 10, createdAt: daysAgo(5) },
    ];

    const highRecent = calculateMoodScore(recentHigh);
    const lowRecent = calculateMoodScore(recentLow);

    // High mood today -> low stress
    expect(highRecent.score).toBeLessThan(lowRecent.score);
    // With flat average both would be 50, with decay they differ
    expect(highRecent.score).toBeLessThan(50);
    expect(lowRecent.score).toBeGreaterThan(50);
  });

  it("decays older entries significantly", () => {
    const singleOld = [{ moodLevel: 1, createdAt: daysAgo(10) }];
    const singleRecent = [{ moodLevel: 1, createdAt: daysAgo(0) }];

    const old = calculateMoodScore(singleOld);
    const recent = calculateMoodScore(singleRecent);

    // Same mood level but both should be 100 stress regardless of age when single
    expect(old.score).toBe(100);
    expect(recent.score).toBe(100);

    const mixed = [
      { moodLevel: 1, createdAt: daysAgo(10) },
      { moodLevel: 10, createdAt: daysAgo(0) },
    ];
    const mixedScore = calculateMoodScore(mixed);
    // Recent 10 should dominate over old 1
    expect(mixedScore.score).toBeLessThan(30);
  });
});

describe("cortisol.service - mood trend", () => {
  it("detects improving trend", () => {
    const entries = [
      { moodLevel: 2, createdAt: daysAgo(4) },
      { moodLevel: 4, createdAt: daysAgo(3) },
      { moodLevel: 6, createdAt: daysAgo(1) },
      { moodLevel: 8, createdAt: daysAgo(0) },
    ];
    const result = calculateMoodScore(entries);
    expect(result.trend).toBe("improving");
  });

  it("detects worsening trend", () => {
    const entries = [
      { moodLevel: 8, createdAt: daysAgo(4) },
      { moodLevel: 6, createdAt: daysAgo(3) },
      { moodLevel: 4, createdAt: daysAgo(1) },
      { moodLevel: 2, createdAt: daysAgo(0) },
    ];
    const result = calculateMoodScore(entries);
    expect(result.trend).toBe("worsening");
  });

  it("returns null for stable mood", () => {
    const entries = [
      { moodLevel: 5, createdAt: daysAgo(4) },
      { moodLevel: 5, createdAt: daysAgo(2) },
      { moodLevel: 5, createdAt: daysAgo(0) },
    ];
    const result = calculateMoodScore(entries);
    expect(result.trend).toBeNull();
  });

  it("returns null for insufficient data", () => {
    const entries = [{ moodLevel: 5, createdAt: daysAgo(0) }];
    const result = calculateMoodScore(entries);
    expect(result.trend).toBeNull();
  });
});

describe("cortisol.service - streak bonus", () => {
  it("computes longest streak correctly", () => {
    expect(getLongestStreak([true, true, true])).toBe(3);
    expect(getLongestStreak([true, false, true, true])).toBe(2);
    expect(getLongestStreak([false, false])).toBe(0);
    expect(getLongestStreak([])).toBe(0);
    expect(getLongestStreak([true, true, false, true, true, true, true])).toBe(4);
  });

  it("applies bonus thresholds", () => {
    expect(getStreakBonus(2)).toBe(0);
    expect(getStreakBonus(3)).toBe(5);
    expect(getStreakBonus(7)).toBe(10);
    expect(getStreakBonus(14)).toBe(15);
    expect(getStreakBonus(30)).toBe(20);
  });

  it("reduces habit stress with streak", () => {
    const habitsNoStreak = [
      { isActive: true, completedToday: false, completionHistory: [] },
      { isActive: true, completedToday: false, completionHistory: [] },
    ];
    const habitsWithStreak = [
      {
        isActive: true,
        completedToday: false,
        completionHistory: [true, true, true, true, true, true, true],
      },
      { isActive: true, completedToday: false, completionHistory: [true, true, true, true, true, true, true] },
    ];

    const noStreak = calculateHabitScore(habitsNoStreak);
    const withStreak = calculateHabitScore(habitsWithStreak);

    // Same completion rate (0%) but streak reduces stress
    expect(noStreak.score).toBe(100);
    expect(withStreak.score).toBe(90); // 100 - 10 bonus
  });

  it("streak bonus does not go below 0", () => {
    const habits = [
      { isActive: true, completedToday: true, completionHistory: Array(30).fill(true) },
    ];
    const result = calculateHabitScore(habits);
    expect(result.score).toBe(0);
    expect(result.streak).toBe(30);
  });
});

describe("cortisol.service - AQI auto-detect", () => {
  it("normalizes 1-5 scale correctly", () => {
    expect(normalizeAqi(1)).toBe(0);
    expect(normalizeAqi(3)).toBe(50);
    expect(normalizeAqi(5)).toBe(100);
  });

  it("normalizes 0-500 scale correctly", () => {
    expect(normalizeAqi(0)).toBe(0);
    expect(normalizeAqi(250)).toBe(50);
    expect(normalizeAqi(500)).toBe(100);
  });

  it("auto-detects scale boundary", () => {
    // 5 should be 1-5 scale max
    expect(normalizeAqi(5)).toBe(100);
    // 6 should be treated as 0-500 scale (just above 1-5)
    // 6/500*100 = 1.2
    expect(normalizeAqi(6)).toBeCloseTo(1.2, 1);
    // 150 on 0-500
    expect(normalizeAqi(150)).toBe(30);
  });

  it("environment score uses correct AQI scaling", () => {
    const env1 = calculateEnvironmentScore({}, { aqi: 5 });
    const env2 = calculateEnvironmentScore({}, { aqi: 500 });
    // Both max values should give 100
    expect(env1.score).toBe(100);
    expect(env2.score).toBe(100);

    const envLow1 = calculateEnvironmentScore({}, { aqi: 1 });
    const envLow2 = calculateEnvironmentScore({}, { aqi: 0 });
    expect(envLow1.score).toBe(0);
    expect(envLow2.score).toBe(0);
  });
});

describe("cortisol.service - humidity and Vietnam temperature", () => {
  it("adds humidity stress at extremes", () => {
    const normal = calculateEnvironmentScore({ humidity: 50 }, {});
    expect(normal.hasData).toBe(true);
    expect(normal.score).toBe(0);

    const high = calculateEnvironmentScore({ humidity: 90 }, {});
    expect(high.score).toBeGreaterThan(0);

    const veryHigh = calculateEnvironmentScore({ humidity: 100 }, {});
    expect(veryHigh.score).toBe(100);

    const low = calculateEnvironmentScore({ humidity: 20 }, {});
    expect(low.score).toBeGreaterThan(0);
  });

  it("humidity weight is low (~0.05) vs AQI", () => {
    const humidOnly = calculateEnvironmentScore({ humidity: 100 }, {});
    const aqiOnly = calculateEnvironmentScore({}, { aqi: 5 });
    expect(humidOnly.score).toBeGreaterThan(0);
    expect(aqiOnly.score).toBe(100);
    // Both max, but combined weight differs
    // Humidity 100 with temp not present: score 100 but weight 0.05
    // AQI 5: score 100 weight 0.4 -> overall higher when both present
    const both = calculateEnvironmentScore({ humidity: 100 }, { aqi: 5 });
    // With both, score should be around weighted avg
    expect(both.score).toBeGreaterThan(50);
  });

  it("Vietnam temp range 20-26 optimal", () => {
    const optimal = calculateEnvironmentScore({ temperature: 23 }, {});
    expect(optimal.score).toBeLessThan(20);

    const edge = calculateEnvironmentScore({ temperature: 26 }, {});
    const outside = calculateEnvironmentScore({ temperature: 30 }, {});
    expect(outside.score).toBeGreaterThan(edge.score);

    const cold = calculateEnvironmentScore({ temperature: 10 }, {});
    expect(cold.score).toBeGreaterThan(30);
  });
});

describe("cortisol.service - circadian", () => {
  it("reduces light stress during 6-8AM", () => {
    const morning = new Date("2024-01-01T07:00:00");
    const noon = new Date("2024-01-01T12:00:00");

    const multMorning = getCircadianMultiplier(50, morning);
    const multNoon = getCircadianMultiplier(50, noon);

    expect(multMorning).toBe(0.5);
    expect(multNoon).toBe(1);

    const envMorning = calculateEnvironmentScore({ lightLevel: 50 }, {}, morning);
    const envNoon = calculateEnvironmentScore({ lightLevel: 50 }, {}, noon);

    expect(envMorning.score).toBeLessThan(envNoon.score);
  });

  it("no multiplier without light data", () => {
    const mult = getCircadianMultiplier(null, new Date("2024-01-01T07:00:00"));
    expect(mult).toBe(1);
  });
});

describe("cortisol.service - stale data warnings", () => {
  it("warns when mood data is stale", () => {
    const oldMood = [{ moodLevel: 5, createdAt: daysAgo(5) }];
    const result = calculateCortisolScore({
      moodEntries: oldMood,
      habits: [{ isActive: true, completedToday: true, completionHistory: [true] }],
      weather: { temperature: 23 },
      airQuality: { aqi: 2 },
    });
    expect(result.warnings.some((w) => w.toLowerCase().includes("mood") && w.toLowerCase().includes("stale"))).toBe(true);
  });

  it("warns when no mood data", () => {
    const result = calculateCortisolScore({
      moodEntries: [],
      habits: [{ isActive: true, completedToday: true }],
      weather: null,
      airQuality: null,
    });
    expect(result.warnings.some((w) => w.toLowerCase().includes("mood"))).toBe(true);
  });

  it("warns when environmental data missing", () => {
    const result = calculateCortisolScore({
      moodEntries: [{ moodLevel: 5, createdAt: new Date().toISOString() }],
      habits: [{ isActive: true, completedToday: true }],
      weather: null,
      airQuality: null,
    });
    expect(result.warnings.some((w) => w.toLowerCase().includes("environmental"))).toBe(true);
  });

  it("includes timestamp and circadianMultiplier", () => {
    const result = calculateCortisolScore({
      moodEntries: [{ moodLevel: 5, createdAt: new Date().toISOString() }],
      habits: [{ isActive: true, completedToday: true }],
      weather: { temperature: 23 },
      airQuality: { aqi: 2 },
    });
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
    expect(typeof result.circadianMultiplier).toBe("number");
  });

  it("clears warnings when data fresh", () => {
    const result = calculateCortisolScore({
      moodEntries: [{ moodLevel: 5, createdAt: new Date().toISOString() }],
      habits: [{ isActive: true, completedToday: true, completionHistory: [true] }],
      weather: { temperature: 23, humidity: 50, lightLevel: 500 },
      airQuality: { aqi: 1 },
    });
    // Should have limited data warning at most, not stale mood
    const hasStaleMood = result.warnings.some((w) => w.includes("more than 3 days"));
    expect(hasStaleMood).toBe(false);
  });
});

describe("cortisol.service - breakdown fields", () => {
  it("returns trend, streak, and preserves weights", () => {
    const result = calculateCortisolScore({
      moodEntries: [
        { moodLevel: 2, createdAt: daysAgo(3) },
        { moodLevel: 8, createdAt: daysAgo(0) },
      ],
      habits: [
        { isActive: true, completedToday: true, completionHistory: [true, true, true] },
      ],
      weather: { temperature: 23 },
      airQuality: { aqi: 2 },
    });

    expect(result.breakdown.mood.trend).toBe("improving");
    expect(result.breakdown.habits.streak).toBe(3);
    expect(result.breakdown.mood.weight).toBeGreaterThan(0);
    expect(result.breakdown.habits.weight).toBeGreaterThan(0);
  });

  it("keeps signature backward compatible", () => {
    const result = calculateCortisolScore({
      moodEntries: [{ moodLevel: 5, createdAt: new Date().toISOString() }],
      habits: [{ isActive: true, completedToday: true }],
      weather: null,
      airQuality: null,
    });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("breakdown");
    expect(result).toHaveProperty("message");
    // New fields
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("circadianMultiplier");
    expect(result).toHaveProperty("timestamp");
  });
});
