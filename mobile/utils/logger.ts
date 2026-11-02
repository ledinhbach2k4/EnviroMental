import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Configuration constants
export const LOGS_DIR_NAME = 'logs/';
export const RETENTION_DAYS = 30;
export const RETENTION_PERIOD_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000; // 30 days in milliseconds
export const MAX_LOG_FILES = 30; // Maximum number of daily log files to retain
export const MAX_SINGLE_FILE_BYTES = 1024 * 1024; // 1 MB per daily log file
export const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB total log folder ceiling

// Store original console references to prevent recursion
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// State management
let isWriting = false;
let isIntercepting = false;
let dirEnsured = false;
let lastCleanupDate = '';
const writeQueue: string[] = [];

/**
 * Returns the dedicated directory for storing application logs.
 */
export const getLogsDirectory = (): string => {
  const base = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  return `${base}${LOGS_DIR_NAME}`;
};

/**
 * Generates a date-stamped log file name (e.g., 'log-2026-11-01.txt').
 */
export function getDailyLogFileName(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `log-${yyyy}-${mm}-${dd}.txt`;
}

/**
 * Parses the date from a daily log file name.
 */
export function parseLogFileDate(fileName: string): Date | null {
  const match = fileName.match(/^log-(\d{4})-(\d{2})-(\d{2})\.txt$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Returns the absolute path to the current day's log file.
 */
export const getCurrentLogFilePath = (date = new Date()): string => {
  return `${getLogsDirectory()}${getDailyLogFileName(date)}`;
};

/**
 * Legacy compatibility alias for current log file.
 */
export const getLogFilePath = (): string => {
  return getCurrentLogFilePath();
};

/**
 * Ensures the dedicated logs directory exists on the device.
 */
async function ensureLogsDirectory(): Promise<void> {
  if (dirEnsured) return;
  try {
    const dir = getLogsDirectory();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    dirEnsured = true;
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Failed to ensure logs directory:', err);
  }
}

/**
 * Safely serializes arguments into a formatted log string without throwing.
 */
function formatLogArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Automatically cleans up logs older than 30 days and enforces size/count limits.
 */
export async function cleanOldLogs(nowTimestamp = Date.now()): Promise<number> {
  let deletedCount = 0;
  try {
    await ensureLogsDirectory();
    const dir = getLogsDirectory();
    const files = await FileSystem.readDirectoryAsync(dir);

    const validLogFiles: { name: string; uri: string; date: Date; size: number }[] = [];

    for (const file of files) {
      if (!file.startsWith('log-') || !file.endsWith('.txt')) continue;
      const fileUri = `${dir}${file}`;
      const parsedDate = parseLogFileDate(file);
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      const fileDate =
        parsedDate ||
        (fileInfo.exists && 'modificationTime' in fileInfo && fileInfo.modificationTime
          ? new Date(fileInfo.modificationTime * 1000)
          : new Date(nowTimestamp));

      // Rule 1: Delete files older than 30 days (1 month)
      const ageMs = nowTimestamp - fileDate.getTime();
      if (ageMs > RETENTION_PERIOD_MS) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        deletedCount++;
        continue;
      }

      validLogFiles.push({ name: file, uri: fileUri, date: fileDate, size: fileSize });
    }

    // Sort remaining files chronologically (oldest first)
    validLogFiles.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Rule 2: Limit max number of daily log files to 30
    while (validLogFiles.length > MAX_LOG_FILES) {
      const oldest = validLogFiles.shift();
      if (oldest) {
        await FileSystem.deleteAsync(oldest.uri, { idempotent: true });
        deletedCount++;
      }
    }

    // Rule 3: Limit total directory size to 10 MB (delete oldest first if exceeded)
    let totalSize = validLogFiles.reduce((acc, f) => acc + f.size, 0);
    while (totalSize > MAX_TOTAL_SIZE_BYTES && validLogFiles.length > 1) {
      const oldest = validLogFiles.shift();
      if (oldest) {
        await FileSystem.deleteAsync(oldest.uri, { idempotent: true });
        totalSize -= oldest.size;
        deletedCount++;
      }
    }
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Log cleanup error:', err);
  }
  return deletedCount;
}

/**
 * Processes queued log entries asynchronously.
 */
async function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;

  try {
    await ensureLogsDirectory();

    const todayStr = getDailyLogFileName();
    if (lastCleanupDate !== todayStr) {
      lastCleanupDate = todayStr;
      // Trigger background cleanup asynchronously once per calendar day
      void cleanOldLogs();
    }

    const filePath = getCurrentLogFilePath();
    const batch = writeQueue.splice(0, writeQueue.length).join('');

    let currentContent = '';
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      // If single daily file exceeds 1MB, trim the top half
      if ('size' in fileInfo && fileInfo.size > MAX_SINGLE_FILE_BYTES) {
        const full = await FileSystem.readAsStringAsync(filePath);
        currentContent = '[... older logs trimmed ...]\n' + full.slice(full.length / 2);
      } else {
        currentContent = await FileSystem.readAsStringAsync(filePath);
      }
    }

    await FileSystem.writeAsStringAsync(filePath, currentContent + batch, {
      encoding: 'utf8',
    });
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Failed to write logs to disk:', err);
  } finally {
    isWriting = false;
    if (writeQueue.length > 0) {
      processWriteQueue();
    }
  }
}

/**
 * Enqueues a log entry with level and timestamp.
 */
function queueLog(level: 'ERROR' | 'WARN' | 'INFO', ...args: any[]) {
  if (isIntercepting) return;
  isIntercepting = true;
  try {
    const timestamp = new Date().toISOString();
    const formatted = formatLogArgs(args);
    const entry = `[${timestamp}] [${level}] ${formatted}\n`;
    writeQueue.push(entry);
    processWriteQueue();
  } catch {
    // Never let logging error disrupt application flow
  } finally {
    isIntercepting = false;
  }
}

/**
 * Initializes the global file logger and lifecycle manager.
 * Runs on client devices only (skips during Metro bundler/Node.js evaluation).
 */
export const initGlobalLogger = (): void => {
  // Check to prevent multiple initializations
  if ((globalThis as any).__loggerInitialized) return;

  // Safety check: only run on actual devices/client, not during Node.js/Metro bundling
  if (typeof window === 'undefined') return;

  // Intercept console.error and console.warn
  console.error = (...args: any[]) => {
    try {
      queueLog('ERROR', ...args);
    } catch {
      // Safe fallback
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    try {
      queueLog('WARN', ...args);
    } catch {
      // Safe fallback
    }
    originalConsoleWarn.apply(console, args);
  };

  (globalThis as any).__loggerInitialized = true;
  originalConsoleLog('[GlobalLogger] Automated local logging initialized with 30-day retention.');

  // Run initial retention cleanup on app startup
  void cleanOldLogs();
};

/**
 * Retrieves the list of available daily log files.
 */
export async function getLogFiles(): Promise<{ name: string; uri: string; size: number }[]> {
  try {
    await ensureLogsDirectory();
    const dir = getLogsDirectory();
    const files = await FileSystem.readDirectoryAsync(dir);
    const result: { name: string; uri: string; size: number }[] = [];

    for (const file of files) {
      if (file.startsWith('log-') && file.endsWith('.txt')) {
        const fileUri = `${dir}${file}`;
        const info = await FileSystem.getInfoAsync(fileUri);
        const size = info.exists && 'size' in info ? info.size : 0;
        result.push({ name: file, uri: fileUri, size });
      }
    }

    result.sort((a, b) => b.name.localeCompare(a.name)); // Newest first
    return result;
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Failed to list log files:', err);
    return [];
  }
}

/**
 * Retrieves log content for the current day (or specific date).
 */
export async function getLogContent(date = new Date()): Promise<string> {
  try {
    const filePath = getCurrentLogFilePath(date);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return 'No logs recorded for this day.';
    }
    return await FileSystem.readAsStringAsync(filePath);
  } catch (err) {
    return `Error reading log file: ${err}`;
  }
}

/**
 * Clears all log files from the device.
 */
export async function clearAllLogs(): Promise<boolean> {
  try {
    const dir = getLogsDirectory();
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      const files = await FileSystem.readDirectoryAsync(dir);
      for (const file of files) {
        if (file.startsWith('log-') && file.endsWith('.txt')) {
          await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
        }
      }
    }
    writeQueue.length = 0;
    return true;
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Failed to clear logs:', err);
    return false;
  }
}

/**
 * Compatibility alias for clearing logs.
 */
export const clearLogs = clearAllLogs;

/**
 * Programmatic helper to export/share logs if needed.
 */
export async function exportLogs(): Promise<{ success: boolean; message: string }> {
  try {
    const filePath = getCurrentLogFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) {
      await ensureLogsDirectory();
      await FileSystem.writeAsStringAsync(
        filePath,
        `[${new Date().toISOString()}] [INFO] EnviroMental Log Initialized - No errors reported today.\nPlatform: ${Platform.OS}\n`
      );
    }

    // Try dynamic expo-sharing if available
    try {
      // @ts-ignore - optional dynamic dependency
      // eslint-disable-next-line import/no-unresolved
      const Sharing = await import('expo-sharing');
      if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable && typeof Sharing.shareAsync === 'function') {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/plain',
            dialogTitle: 'Export EnviroMental Logs',
            UTI: 'public.plain-text',
          });
          return { success: true, message: 'Logs exported via sharing.' };
        }
      }
    } catch {
      // Fall through to standard Share API
    }

    const content = await getLogContent();
    await Share.share({
      title: 'EnviroMental App Error Logs',
      message: content || 'No logs recorded.',
    });
    return { success: true, message: 'Logs shared successfully.' };
  } catch (err: any) {
    originalConsoleError('[GlobalLogger] Export logs failed:', err);
    return { success: false, message: err?.message || 'Failed to export logs' };
  }
}
