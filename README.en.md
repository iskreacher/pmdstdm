[Русская версия](README.md) | [English version](README.en.md)

# PMDSPT

PMDSPT is a VS Code extension that combines a Pomodoro timer with Panic Mode.

## Features

- Persistent status bar display:
  - `🍅` / `💀` — switch between Pomodoro and Panic Mode;
  - timer — start, pause, and resume the countdown;
  - `⚙` — timer and sound settings.
- Pomodoro work intervals and breaks.
- Panic Mode with a custom duration.
- Timer state persistence through VS Code extension storage.
- When the extension starts, Pomodoro resets to the initial work phase.
- Panic Mode state is restored after restarting VS Code.
- Persistent break notification that can be dismissed manually.
- Four sound events:
  - rest started;
  - work started;
  - Panic Mode started;
  - Panic Mode finished.
- Built-in WAV sounds and support for selecting custom WAV files.

## Status bar controls

The status bar displays the current mode, remaining time, and settings button:

```text
🍅 25:00 ⚙
```

Clicking the timer displays one of three states: `timer started`, `timer stopped`, or `timer resumed`.

## Panic Mode

Open the `⚙` menu and select `Set Panic Mode time`. The time can be entered in one of the following formats:

- minutes: `10`;
- minutes and seconds: `05:30`;
- hours, minutes, and seconds: `01:05:00`.

After Panic Mode finishes, the timer resets to its default duration, and the next launch is treated as a new start.

## Sound settings

Open the `⚙` menu and select `Sound settings`. The available actions are:

- enable or disable all sounds;
- choose a sound for each event;
- disable an individual event sound;
- restore the built-in default sounds;
- choose a custom WAV file.

Selected custom sounds are copied to the extension's global storage, so the original file may be moved afterwards.

## Development

Requirements:

- Node.js;
- npm;
- VS Code or Code OSS.

Install dependencies:

```bash
npm install
```

Validate and compile:

```bash
npm run check-types
npm run lint
npm run compile
```

To launch the Extension Development Host, open the project in VS Code and press `F5`. Select the `Run PMDSPT Extension` configuration.

Default extension intervals:

```text
Pomodoro work interval: 25 minutes
Pomodoro break: 5 minutes
Panic Mode default duration: 5 minutes
```

## Project information

- Author: `iskreacher`
- Full name and student group: Bazanov Kirill M3111
- Repository: https://github.com/iskreacher/pmdstdm

## License

This project is distributed under the MIT License. The full text is available in the [LICENSE](LICENSE) file.
