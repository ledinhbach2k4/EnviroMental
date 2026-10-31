#!/usr/bin/env node
/**
 * scripts/test-artemis-ping.js
 * Pings the Artemis backend service to check whether the 503 Service Unavailable
 * outage is resolved without invoking the full @adrata/artemis-mcp connect CLI.
 *
 * Usage:
 *   node scripts/test-artemis-ping.js
 *   node scripts/test-artemis-ping.js --watch
 *   node scripts/test-artemis-ping.js --watch --interval 10
 */

const DEFAULT_BASE_URL = process.env.ARTEMIS_API_URL || 'https://artemis.staging.adrata.com';
const CONNECT_ENDPOINT = '/api/v1/artemis/connect/device';

// Parse command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const intervalIndex = args.findIndex((arg) => arg === '--interval' || arg === '-i');
const intervalSec = intervalIndex !== -1 && args[intervalIndex + 1]
  ? parseInt(args[intervalIndex + 1], 10)
  : 5;

async function pingEndpoint(url, options = {}) {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const elapsed = Date.now() - startTime;
    return {
      ok: response.status < 500,
      status: response.status,
      statusText: response.statusText,
      elapsed,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      ok: false,
      status: null,
      statusText: err.name === 'AbortError' ? 'Timeout (8s)' : err.message,
      elapsed,
    };
  }
}

async function runCheck() {
  const timestamp = new Date().toLocaleTimeString();
  const baseTarget = DEFAULT_BASE_URL.replace(/\/+$/, '');
  const connectTarget = `${baseTarget}${CONNECT_ENDPOINT}`;

  console.log(`[${timestamp}] Pinging Artemis backend...`);
  console.log(`  -> Base:    ${baseTarget}`);
  console.log(`  -> Connect: ${connectTarget}`);

  // Test Connect device endpoint (POST)
  const connectResult = await pingEndpoint(connectTarget, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace: 'mobile' }),
  });

  // Test Base endpoint (GET)
  const baseResult = await pingEndpoint(baseTarget, { method: 'GET' });

  console.log(`  Base Status:    ${baseResult.status ?? 'ERR'} ${baseResult.statusText} (${baseResult.elapsed}ms)`);
  console.log(`  Connect Status: ${connectResult.status ?? 'ERR'} ${connectResult.statusText} (${connectResult.elapsed}ms)`);

  if (connectResult.status === 503 || baseResult.status === 503) {
    console.log(`  [OUTAGE] Artemis is still returning 503 (Service Temporarily Unavailable).`);
    return false;
  } else if (connectResult.status && connectResult.status < 500) {
    console.log(`  [ONLINE] Artemis responded with HTTP ${connectResult.status} (Backend is alive!).`);
    return true;
  } else {
    console.log(`  [UNAVAILABLE] Service unreachable or returned status: ${connectResult.status ?? 'Connection Error'}`);
    return false;
  }
}

async function main() {
  if (isWatch) {
    console.log(`Starting Artemis ping watch mode (interval: ${intervalSec}s). Press Ctrl+C to stop.\n`);
    const checkAndLoop = async () => {
      const isUp = await runCheck();
      console.log('---');
      if (isUp) {
        console.log('Artemis backend is operational! You can run: npx @adrata/artemis-mcp connect mobile\n');
      }
      setTimeout(checkAndLoop, intervalSec * 1000);
    };
    await checkAndLoop();
  } else {
    const isUp = await runCheck();
    process.exitCode = isUp ? 0 : 1;
  }
}

main().catch((err) => {
  console.error('Fatal error running ping script:', err);
  process.exit(1);
});
