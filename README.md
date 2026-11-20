# Tower Builder

A local Python and HTML demo for the Achilles rehabilitation game and physician portal. The browser simulates heel height and lowering time. The server records sessions in SQLite and ships with fictional sample history.

## Run

Requires Python 3. No packages to install.

```powershell
py -3 app.py
```

Open http://127.0.0.1:8000 for the game or http://127.0.0.1:8000/physician for the physician portal. If your Python installation uses the `python` command, run `python app.py`. Press Ctrl+C to stop the server.

On this Windows workspace, you can also use the bundled Codex Python if Windows reports that `py` or `python` is unavailable.

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" app.py
```

## Demo flow

1. Choose a simulation scenario and press **Auto rep** to preview a landing. For manual play, press **Raise**, then hold **Lower** and release to land. The Up and Down arrow keys also work. Each repetition places a block. A repetition outside the displayed height or time range lands off-center.
2. Optionally enter a fictional pain score and save the session. You can save a partial session or complete all 12 reps to unlock the next level.
3. Open **Physician portal** and filter the source to **Simulator**. Review aggregate results, change the trend metric, and select a date for repetition details. **Refresh data** retrieves sessions saved since the portal was opened.

The height and pace targets are demo values from the mockup. The server binds to loopback and has no user accounts. Use fictional data only.
