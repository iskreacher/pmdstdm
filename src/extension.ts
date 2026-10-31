import * as vscode from 'vscode';
import { RestNotification } from './restNotification';
import { SoundService } from './sound';
import { TimerController, type TimerState } from './timer';

const STATE_KEY = 'pmdstdm.timerState';
const DEFAULT_WORK_SECONDS = 25 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;
const DEFAULT_PANIC_SECONDS = 5 * 60;

export function activate(context: vscode.ExtensionContext) {
  const modeItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 103);
  const timerItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 102);
  const settingsItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
  const restNotification = new RestNotification();
  const soundService = new SoundService(context);

  const state: TimerState = context.globalState.get<TimerState>(STATE_KEY) ?? {
    mode: 'pomodoro',
    phase: 'work',
    remainingSeconds: DEFAULT_WORK_SECONDS,
    isRunning: false,
    hasStarted: false,
    savedAt: Date.now(),
  };

  const timer = new TimerController(
    state,
    (nextState) => void context.globalState.update(STATE_KEY, nextState),
    (nextState) => {
      updateStatusBar(nextState, modeItem, timerItem);
      restNotification.sync(nextState);
    },
    (phase) => {
      if (phase === 'work') {
        soundService.play('restStarted');
        void vscode.window.showInformationMessage('🍅 Time to rest.');
      } else if (phase === 'break') {
        soundService.play('workStarted');
        void vscode.window.showInformationMessage('🍅 Back to work...');
      } else {
        soundService.play('panicFinished');
        void vscode.window.showErrorMessage('💀 You lost.');
      }
    },
    {
      workSeconds: DEFAULT_WORK_SECONDS,
      breakSeconds: DEFAULT_BREAK_SECONDS,
      panicSeconds: DEFAULT_PANIC_SECONDS,
    },
  );

  modeItem.command = 'pmdstdm.switchMode';
  timerItem.command = 'pmdstdm.toggleTimer';
  settingsItem.command = 'pmdstdm.openSettings';
  settingsItem.text = '⚙';
  settingsItem.tooltip = 'PMDSPT: settings and controls';

  context.subscriptions.push(
    modeItem,
    timerItem,
    settingsItem,
    restNotification,
    soundService,
    timer,
    vscode.commands.registerCommand('pmdstdm.switchMode', () => timer.switchMode()),
    vscode.commands.registerCommand('pmdstdm.toggleTimer', () => {
      const wasRunning = state.isRunning;
      const wasPanicMode = state.mode === 'panic';
      void vscode.window.showInformationMessage(timer.toggle());
      if (!wasRunning && wasPanicMode) {
        soundService.play('panicStarted');
      }
    }),
    vscode.commands.registerCommand('pmdstdm.openSettings', () => openSettings(timer, soundService)),
  );

  modeItem.show();
  timerItem.show();
  settingsItem.show();
  timer.restoreForStartup();
}

async function openSettings(timer: TimerController, soundService: SoundService) {
  const selected = await vscode.window.showQuickPick(
    [
      { label: 'Set Panic Mode time', value: 'panic' },
      { label: 'Reset timer', value: 'reset' },
      { label: 'Sound settings', value: 'sound' },
    ],
    { placeHolder: 'PMDSPT settings' },
  );

  if (selected?.value === 'reset') {
    timer.reset();
    return;
  }

  if (selected?.value === 'sound') {
    await soundService.configure();
    return;
  }

  if (selected?.value === 'panic') {
    const seconds = await promptForPanicDuration();
    if (seconds !== undefined) {
      timer.setPanicDuration(seconds);
    }
  }
}

async function promptForPanicDuration(): Promise<number | undefined> {
  while (true) {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter time as minutes, MM:SS or HH:MM:SS',
      placeHolder: '10, 05:30 or 01:05:00',
    });

    if (input === undefined) {
      return undefined;
    }

    const error = validateTime(input);
    if (!error) {
      return parseTime(input);
    }

    await vscode.window.showErrorMessage(error);
  }
}

function updateStatusBar(
  state: TimerState,
  modeItem: vscode.StatusBarItem,
  timerItem: vscode.StatusBarItem,
) {
  modeItem.text = state.mode === 'pomodoro' ? '🍅' : '💀';
  modeItem.tooltip = state.mode === 'pomodoro' ? 'PMDSPT: switch to Panic Mode' : 'PMDSPT: switch to Pomodoro';
  timerItem.text = formatTime(state.remainingSeconds);
  timerItem.tooltip = state.isRunning ? 'PMDSPT: pause timer' : 'PMDSPT: start timer';
}

function validateTime(value: string): string | null {
  const parts = value.trim().split(':');
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return 'Use minutes, MM:SS or HH:MM:SS';
  }

  const numbers = parts.map(Number);
  if (parts.length > 1 && numbers.slice(1).some((number) => number > 59)) {
    return 'Minutes and seconds must be between 0 and 59';
  }

  return numbers.every((number) => number === 0) ? 'Time must be greater than zero' : null;
}

function parseTime(value: string): number {
  const parts = value.trim().split(':').map(Number);
  if (parts.length === 1) {
    return parts[0] * 60;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function deactivate() {}
