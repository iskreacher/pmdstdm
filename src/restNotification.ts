import * as vscode from 'vscode';
import type { TimerState } from './timer';

export class RestNotification implements vscode.Disposable {
  private resolveNotification: (() => void) | undefined;
  private isVisible = false;
  private wasDismissed = false;
  private phase: TimerState['phase'] | undefined;

  public sync(state: TimerState) {
    const isBreak = state.mode === 'pomodoro' && state.phase === 'break';

    if (!isBreak) {
      this.phase = state.phase;
      this.wasDismissed = false;
      this.hide();
      return;
    }

    if (this.phase !== 'break') {
      this.phase = 'break';
      this.wasDismissed = false;
    }

    if (!this.isVisible && !this.wasDismissed) {
      this.show();
    }
  }

  public dispose() {
    this.hide();
  }

  private show() {
    this.isVisible = true;

    void vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PMDSPT: время отдыха',
        cancellable: true,
      },
      (_progress, token) => new Promise<void>((resolve) => {
        this.resolveNotification = () => {
          this.resolveNotification = undefined;
          this.isVisible = false;
          resolve();
        };

        token.onCancellationRequested(() => {
          this.resolveNotification = undefined;
          this.isVisible = false;
          this.wasDismissed = true;
          resolve();
        });
      }),
    );
  }

  private hide() {
    this.resolveNotification?.();
    this.resolveNotification = undefined;
    this.isVisible = false;
  }
}
