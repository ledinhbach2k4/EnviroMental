import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILENAME = 'app-error-log.txt';
const MAX_LOG_SIZE_BYTES = 500 * 1024; // 500 KB limit to prevent unbounded disk growth

// Get the absolute path to the log file in the app documents directory
export const getLogFilePath = (): string => {
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  return `${dir}${LOG_FILENAME}`;
};

let isWriting = false;
let isIntercepting = false;
const writeQueue: string[] = [];

// Safely serialize any arguments into a clean string without throwing
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

// Process pending log queue sequentially to avoid file write race conditions
async function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;

  try {
    const filePath = getLogFilePath();
    const batch = writeQueue.splice(0, writeQueue.length).join('');

    let currentContent = '';
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      // If file has grown too large, trim earlier logs
      if (fileInfo.size && fileInfo.size > MAX_LOG_SIZE_BYTES) {
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
    // Write directly using original console to avoid endless recursion
    originalConsoleWarn('[GlobalLogger] Failed to write logs to disk:', err);
  } finally {
    isWriting = false;
    if (writeQueue.length > 0) {
      processWriteQueue();
    }
  }
}

function queueLog(level: 'ERROR' | 'WARN', ...args: any[]) {
  if (isIntercepting) return;
  isIntercepting = true;
  try {
    const timestamp = new Date().toISOString();
    const formatted = formatLogArgs(args);
    const entry = `[${timestamp}] [${level}] ${formatted}\n`;
    writeQueue.push(entry);
    processWriteQueue();
  } catch {
    // Never let log queueing throw
  } finally {
    isIntercepting = false;
  }
}

// Store original console references
let originalConsoleError = console.error;
let originalConsoleWarn = console.warn;

/**
 * Initializes the global file logger.
 * Isolated strictly to client devices: will not run during Node.js/Metro bundling.
 */
export const initGlobalLogger = (): void => {
  // Check to prevent multiple initializations
  if ((globalThis as any).__loggerInitialized) return;

  // Safety check: only run on actual devices/client, not during Node.js/Metro bundling
  if (typeof window === 'undefined') return;

  // Capture current console references before overriding
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;

  console.error = (...args: any[]) => {
    try {
      queueLog('ERROR', ...args);
    } catch {
      // Safe fallback
    }
    // Always use original cached console method to avoid recursion
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    try {
      queueLog('WARN', ...args);
    } catch {
      // Safe fallback
    }
    // Always use original cached console method to avoid recursion
    originalConsoleWarn.apply(console, args);
  };

  (globalThis as any).__loggerInitialized = true;
  console.log('[GlobalLogger] Interceptors successfully initialized on client.');
};

/**
 * Retrieves the full string content of the current log file.
 */
export async function getLogContent(): Promise<string> {
  try {
    const filePath = getLogFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return 'No logs recorded yet.';
    }
    return await FileSystem.readAsStringAsync(filePath);
  } catch (err) {
    return `Error reading log file: ${err}`;
  }
}

/**
 * Clears/empties the log file.
 */
export async function clearLogs(): Promise<boolean> {
  try {
    const filePath = getLogFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
    writeQueue.length = 0;
    return true;
  } catch (err) {
    originalConsoleWarn('[GlobalLogger] Failed to clear logs:', err);
    return false;
  }
}

/**
 * Exports or shares the error logs.
 * Attempts to use expo-sharing for file export; falls back gracefully to React Native's Share API.
 */
export async function exportLogs(): Promise<{ success: boolean; message: string }> {
  try {
    const filePath = getLogFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) {
      // Create starter file so there's always something to share
      await FileSystem.writeAsStringAsync(
        filePath,
        `[${new Date().toISOString()}] [INFO] EnviroMental Log File Initialized - No errors reported.\nPlatform: ${Platform.OS}\n`
      );
    }

    // Try dynamic expo-sharing if available
    try {
      // @ts-ignore - optional dynamic dependency
      const Sharing = await import('expo-sharing');
      if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable && typeof Sharing.shareAsync === 'function') {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/plain',
            dialogTitle: 'Export EnviroMental Error Logs',
            UTI: 'public.plain-text',
          });
          return { success: true, message: 'Logs exported via sharing.' };
        }
      }
    } catch {
      // Fall through to standard React Native Share
    }

    // Standard React Native fallback
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
