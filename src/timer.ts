export type TimerMode = 'pomodoro' | 'panic';

export type TimerPhase = 'work' | 'break' | 'panic';

export interface TimerState {
  mode: TimerMode;
  phase: TimerPhase;
  remainingSeconds: number;
  isRunning: boolean;
  hasStarted: boolean;
  savedAt: number;
}

export interface TimerDurations {
  workSeconds: number;
  breakSeconds: number;
  panicSeconds: number;
}

export class TimerController {
  private interval: NodeJS.Timeout | undefined;

  public constructor(
    private readonly state: TimerState,
    private readonly saveState: (state: TimerState) => void,
    private readonly onUpdate: (state: TimerState) => void,
    private readonly onFinish: (phase: TimerPhase) => void,
    private readonly durations: TimerDurations,
  ) {}

  public restore() {
    if (this.state.isRunning) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.state.savedAt) / 1000));
      this.advance(elapsedSeconds);
      this.state.savedAt = Date.now();
      this.save();
    }

    this.onUpdate(this.state);
    if (this.state.isRunning) {
      this.startInterval();
    }
  }

  public toggle(): 'timer started' | 'timer stopped' | 'timer resumed' {
    if (this.state.isRunning) {
      this.pause();
      return 'timer stopped';
    }

    const action = this.state.hasStarted ? 'timer resumed' : 'timer started';
    if (this.state.remainingSeconds <= 0) {
      this.state.remainingSeconds = this.defaultSeconds();
    }
    this.state.hasStarted = true;
    this.state.isRunning = true;
    this.state.savedAt = Date.now();
    this.save();
    this.onUpdate(this.state);
    this.startInterval();
    return action;
  }

  public switchMode() {
    this.pause();
    this.state.mode = this.state.mode === 'pomodoro' ? 'panic' : 'pomodoro';
    this.state.phase = this.state.mode === 'pomodoro' ? 'work' : 'panic';
    this.state.remainingSeconds = this.state.mode === 'pomodoro' ? this.durations.workSeconds : this.durations.panicSeconds;
    this.state.hasStarted = false;
    this.state.savedAt = Date.now();
    this.save();
    this.onUpdate(this.state);
  }

  public setPanicDuration(seconds: number) {
    this.pause();
    this.state.mode = 'panic';
    this.state.phase = 'panic';
    this.state.remainingSeconds = seconds;
    this.state.savedAt = Date.now();
    this.save();
    this.onUpdate(this.state);
  }

  public reset() {
    this.pause();
    this.state.phase = this.state.mode === 'pomodoro' ? 'work' : 'panic';
    this.state.remainingSeconds = this.state.mode === 'pomodoro' ? this.durations.workSeconds : this.durations.panicSeconds;
    this.state.hasStarted = false;
    this.state.savedAt = Date.now();
    this.save();
    this.onUpdate(this.state);
  }

  public dispose() {
    this.pause();
  }

  private pause() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    if (this.state.isRunning) {
      this.state.isRunning = false;
      this.state.savedAt = Date.now();
      this.save();
      this.onUpdate(this.state);
    }
  }

  private startInterval() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.advance(1);
      this.state.savedAt = Date.now();
      this.save();
      this.onUpdate(this.state);
    }, 1000);
  }

  private advance(seconds: number) {
    let remaining = seconds;

    while (remaining > 0 && this.state.isRunning) {
      if (this.state.remainingSeconds > remaining) {
        this.state.remainingSeconds -= remaining;
        remaining = 0;
        continue;
      }

      remaining -= this.state.remainingSeconds;
      this.state.remainingSeconds = 0;
      this.onFinish(this.state.phase);

      if (this.state.mode === 'panic') {
        this.state.isRunning = false;
        this.state.remainingSeconds = this.durations.panicSeconds;
        this.state.savedAt = Date.now();
        this.pause();
        this.save();
        this.onUpdate(this.state);
        return;
      }

      if (this.state.phase === 'work') {
        this.state.phase = 'break';
        this.state.remainingSeconds = this.durations.breakSeconds;
      } else {
        this.state.phase = 'work';
        this.state.remainingSeconds = this.durations.workSeconds;
      }
    }
  }

  private defaultSeconds() {
    if (this.state.mode === 'panic') {
      return this.durations.panicSeconds;
    }
    return this.state.phase === 'break' ? this.durations.breakSeconds : this.durations.workSeconds;
  }

  private save() {
    this.saveState({ ...this.state });
  }
}
