[OPEN] Debug Session: water-schedule-no-off

## Symptoms
- Supply Water schedule does not turn OFF motor.
- Auto ON/OFF by target water percentage does not turn OFF.
- Auto OFF by water flow/pressure (no-flow) does not turn OFF.
- Issues more visible when app is in background / screen off.

## Expected
- Motor/device1 should turn OFF at end-time window and/or when target level reached and/or when no-flow logic triggers, even in background.

## Hypotheses (Falsifiable)
- A: Background task is not firing (BackgroundFetch/headless not running), so OFF logic never executes.
- B: OFF logic runs but window/finish evaluation is wrong (time window calculation, timezone, overnight windows, stale rule times).
- C: OFF decision is made but server control/update fails (token missing, network errors), so device stays ON.
- D: No-flow logic never triggers because flow data is missing/NaN or device state reports isOn=false in background.
- E: Level/target calculation is wrong in headless (target missing → wrong %), so thresholds never meet OFF conditions.

## Evidence Plan
- Instrument background task entry (configure callback + headless) and log taskId + timestamps.
- Instrument automation evaluation per device (rules summary, computed level/flow/isOn, schedule active/finished decisions).
- Instrument control/update attempts (action/payload, ok/error).

## Runbook
1) Start Debug Server (port 7777).
2) Run `adb reverse tcp:7777 tcp:7777`.
3) Reproduce: enable Supply Water schedule, set target, enable no-flow, turn app to background, wait for OFF condition.
4) Collect logs from debug server.
