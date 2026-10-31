import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import * as vscode from 'vscode';

export type SoundEvent = 'restStarted' | 'workStarted' | 'panicStarted' | 'panicFinished';

type SoundChoice = 'default' | 'none' | string;

const SOUND_STATE_KEY = 'pmdstdm.soundChoices';
const SOUNDS_ENABLED_KEY = 'pmdstdm.soundsEnabled';

const DEFAULT_FILES: Record<SoundEvent, string> = {
  restStarted: 'rest-start.wav',
  workStarted: 'work-start.wav',
  panicStarted: 'panic-start.wav',
  panicFinished: 'panic-finish.wav',
};

const EVENT_LABELS: Record<SoundEvent, string> = {
  restStarted: 'Rest started',
  workStarted: 'Work started',
  panicStarted: 'Panic Mode started',
  panicFinished: 'Panic Mode finished',
};

export class SoundService implements vscode.Disposable {
  private readonly choices: Record<SoundEvent, SoundChoice>;
  private enabled: boolean;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.choices = context.globalState.get<Record<SoundEvent, SoundChoice>>(SOUND_STATE_KEY) ?? {
      restStarted: 'default',
      workStarted: 'default',
      panicStarted: 'default',
      panicFinished: 'default',
    };
    this.enabled = context.globalState.get<boolean>(SOUNDS_ENABLED_KEY) ?? true;
  }

  public play(event: SoundEvent) {
    if (!this.enabled) {
      return;
    }

    const choice = this.choices[event];
    if (choice === 'none') {
      return;
    }

    const file = choice === 'default'
      ? this.context.asAbsolutePath(join('assets', 'sounds', DEFAULT_FILES[event]))
      : choice;

    playFile(file);
  }

  public async configure() {
    const selected = await vscode.window.showQuickPick(
      [
        { label: this.enabled ? 'Disable sounds' : 'Enable sounds', value: 'toggle' },
        { label: 'Choose sound for an event', value: 'choose' },
        { label: 'Reset all sounds to defaults', value: 'reset' },
      ],
      { placeHolder: 'PMDSPT sound settings' },
    );

    if (selected?.value === 'toggle') {
      this.enabled = !this.enabled;
      await this.context.globalState.update(SOUNDS_ENABLED_KEY, this.enabled);
      return;
    }

    if (selected?.value === 'reset') {
      for (const event of Object.keys(DEFAULT_FILES) as SoundEvent[]) {
        this.choices[event] = 'default';
      }
      await this.saveChoices();
      return;
    }

    if (selected?.value === 'choose') {
      await this.chooseSound();
    }
  }

  public dispose() {}

  private async chooseSound() {
    const event = await vscode.window.showQuickPick(
      (Object.keys(EVENT_LABELS) as SoundEvent[]).map((value) => ({
        label: EVENT_LABELS[value],
        value,
      })),
      { placeHolder: 'Choose an event' },
    );

    if (!event) {
      return;
    }

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Use default sound', value: 'default' },
        { label: 'Disable this sound', value: 'none' },
        { label: 'Choose a WAV file...', value: 'custom' },
      ],
      { placeHolder: EVENT_LABELS[event.value] },
    );

    if (!choice) {
      return;
    }

    if (choice.value !== 'custom') {
      this.choices[event.value] = choice.value;
      await this.saveChoices();
      return;
    }

    const files = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: { 'WAV audio': ['wav'] },
      openLabel: 'Use sound',
    });

    if (!files?.[0]) {
      return;
    }

    const directory = join(this.context.globalStorageUri.fsPath, 'sounds');
    mkdirSync(directory, { recursive: true });
    const destination = join(directory, `${event.value}.wav`);
    copyFileSync(files[0].fsPath, destination);
    this.choices[event.value] = destination;
    await this.saveChoices();
  }

  private saveChoices() {
    return this.context.globalState.update(SOUND_STATE_KEY, this.choices);
  }
}

function playFile(file: string) {
  if (process.platform === 'linux') {
    playLinux(file);
  } else if (process.platform === 'darwin') {
    spawnDetached('afplay', [file]);
  } else if (process.platform === 'win32') {
    const escaped = file.replaceAll("'", "''");
    spawnDetached('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(New-Object Media.SoundPlayer -ArgumentList '${escaped}').PlaySync()`,
    ]);
  }
}

function playLinux(file: string) {
  const player = spawn('pw-play', [file], { detached: true, stdio: 'ignore' });
  player.once('error', () => spawnDetached('paplay', [file]));
  player.unref();
}

function spawnDetached(command: string, args: string[]) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}
