const { spawn, execFile } = require('child_process');
const adbService = require('./adbService');
const security = require('../utils/security');

// Map of serial -> { childProcess, pid, serial, startTime, status, options, logBuffer }
const activeSessions = new Map();
const MAX_LOG_LINES = 200;

/**
 * Builds sparse CLI argument array for scrcpy
 */
function buildScrcpyArgs(serial, options = {}) {
  if (!security.isValidSerial(serial)) {
    throw new Error(`Invalid device serial: ${serial}`);
  }

  const args = ['-s', serial];

  // Bitrate (default: 8M)
  const bitRate = security.sanitizeBitrate(options.bitRate, '8M');
  if (bitRate) {
    args.push('-b', bitRate);
  }

  // Display Flags
  if (options.turnScreenOff) {
    args.push('-S');
  }
  if (options.stayAwake !== false) {
    args.push('-w');
  }
  if (options.fullscreen) {
    args.push('-f');
  }

  // Quick Launch App
  if (options.packageName && security.isValidPackageName(options.packageName)) {
    args.push(`--start-app=${options.packageName}`);
  }

  // Optional Custom Flags
  if (typeof options.customFlags === 'string' && options.customFlags.trim()) {
    const customParts = options.customFlags.trim().split(/\s+/).filter(Boolean);
    customParts.forEach((part) => {
      // Basic sanity check to avoid passing quotes or dangerous metacharacters
      if (/^[a-zA-Z0-9_\-=.+/:@]+$/.test(part)) {
        args.push(part);
      }
    });
  }

  return args;
}

/**
 * Spawns scrcpy child process and streams logs
 */
function launchSession(serial, options = {}, callbacks = {}) {
  if (!security.isValidSerial(serial)) {
    throw new Error(`Invalid device serial: ${serial}`);
  }

  // If already running, stop old session first
  if (activeSessions.has(serial)) {
    const existing = activeSessions.get(serial);
    if (existing && existing.status === 'running') {
      stopSession(serial);
    }
  }

  const scrcpyPath = adbService.findBinary('scrcpy');
  const args = buildScrcpyArgs(serial, options);

  console.log(`[scrcpyService] Spawning: "${scrcpyPath}" ${args.join(' ')}`);

  const child = spawn(scrcpyPath, args, {
    windowsHide: true,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const session = {
    serial,
    pid: child.pid,
    startTime: new Date().toISOString(),
    status: 'running',
    options,
    logBuffer: [],
    childProcess: child,
  };

  function appendLog(type, line) {
    const entry = {
      timestamp: new Date().toISOString(),
      type, // 'stdout' | 'stderr' | 'system'
      line: line.trim(),
    };
    if (entry.line) {
      session.logBuffer.push(entry);
      if (session.logBuffer.length > MAX_LOG_LINES) {
        session.logBuffer.shift();
      }
      if (callbacks.onLog) callbacks.onLog(entry);
      if (type === 'stdout' && callbacks.onStdout) callbacks.onStdout(entry.line);
      if (type === 'stderr' && callbacks.onStderr) callbacks.onStderr(entry.line);
    }
  }

  appendLog('system', `[scrcpy-qol] Session started for ${serial} (PID: ${child.pid})`);
  appendLog('system', `[scrcpy-qol] Command: scrcpy ${args.join(' ')}`);

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    lines.forEach((l) => appendLog('stdout', l));
  });

  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    lines.forEach((l) => appendLog('stderr', l));
  });

  child.on('error', (err) => {
    appendLog('stderr', `Process error: ${err.message}`);
    session.status = 'error';
    if (callbacks.onError) callbacks.onError(err);
  });

  child.on('exit', (code, signal) => {
    session.status = 'stopped';
    session.exitCode = code;
    session.signal = signal;
    appendLog('system', `[scrcpy-qol] Session ended (Exit code: ${code !== null ? code : signal})`);
    activeSessions.delete(serial);
    if (callbacks.onExit) callbacks.onExit({ code, signal, serial });
  });

  activeSessions.set(serial, session);

  return {
    success: true,
    serial,
    pid: child.pid,
    args,
  };
}

/**
 * Cleanly terminates scrcpy session using Windows taskkill process-tree kill
 */
function stopSession(serial) {
  const session = activeSessions.get(serial);
  if (!session || !session.childProcess) {
    return { success: false, error: 'No active session found for this device.' };
  }

  const pid = session.pid;
  try {
    if (process.platform === 'win32' && pid) {
      // /F = Forcefully terminate, /T = Terminate process tree (all child sub-processes)
      execFile('taskkill', ['/pid', pid.toString(), '/f', '/t'], (err) => {
        if (err) {
          try {
            session.childProcess.kill('SIGKILL');
          } catch (_) {}
        }
      });
    } else {
      session.childProcess.kill('SIGTERM');
    }
  } catch (err) {
    console.error(`[scrcpyService] Error killing process ${pid}:`, err.message);
  }

  session.status = 'stopped';
  activeSessions.delete(serial);

  return { success: true, serial, pid };
}

function getActiveSessions() {
  const list = [];
  activeSessions.forEach((s) => {
    list.push({
      serial: s.serial,
      pid: s.pid,
      startTime: s.startTime,
      status: s.status,
      options: s.options,
    });
  });
  return list;
}

function getSessionLogs(serial) {
  const session = activeSessions.get(serial);
  return session ? session.logBuffer : [];
}

// Cleanup all child processes on server shutdown
function cleanupAll() {
  activeSessions.forEach((s, serial) => {
    stopSession(serial);
  });
}

process.on('exit', cleanupAll);
process.on('SIGINT', () => {
  cleanupAll();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupAll();
  process.exit();
});

module.exports = {
  buildScrcpyArgs,
  launchSession,
  stopSession,
  getActiveSessions,
  getSessionLogs,
};
