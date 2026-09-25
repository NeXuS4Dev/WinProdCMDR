# WinProdCMDR — Windows Production Commander

**A suite of exactly 3 Windows management apps, wrapped in a pixel-faithful recreation of the classic Office 2016 ribbon UI — built with Electron and [Fluent UI React v8](https://developer.microsoft.com/en-us/fluentui#/).** *(Not WinUI.)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⌂  ⭯  ⌄          Task Manager — WinProdCMDR            ▁  ❐  ✕        │ ← title bar + QAT (app color)
├──────────────────────────────────────────────────────────────────────────┤
│  File   Home   View                     🔍 Search            ⌄           │ ← ribbon tabs (Word/Excel/PowerPoint colors)
├──────────────────────────────────────────────────────────────────────────┤
│ │ End task │ │ Run new task │ │ Update speed ⌄     │                     │ ← 96px ribbon with groups,
│ │  (big)   │ │   (big)      │ │ Paused ▾          │                     │    large/small buttons,
│ │ End task │ Processes     │ Update speed       │                     │    dividers & screentips
├──────────────────────────────────────────────────────────────────────────┤
│  chrome.exe      6231   Running   2.1 %   312.4 MB   WinProdCMDR — …     │
│  explorer.exe    4108   Running   0.4 %    84.1 MB   File Explorer       │ ← working area
│  …                                                                       │
├──────────────────────────────────────────────────────────────────────────┤
│  Processes: 96   │ CPU: 12 %  │ Memory: 6.2 GB (39 %)      ⟳  ▤        │ ← status bar (app color)
└──────────────────────────────────────────────────────────────────────────┘
```

## The suite

| App | Color (classic Office 2016) | What it manages |
| --- | --- | --- |
| 🟩 **Task Manager** | Excel green `#217346` | Live process list (CPU/RAM, sort, search, columns), end task, run new task, performance charts |
| 🟧 **Services Manager** | PowerPoint orange `#d24726` | Full `services.msc` experience: start/stop/restart, startup types (incl. delayed-start), log-on accounts |
| 🟦 **System Info** | Word blue `#2b579a` | Complete OS/CPU/memory/storage/network/GPU report, copy & export, launcher for 11 Windows tools |

## App Browser

The launcher is a recreation of the **Office 2016 Start screen**: dark brand band, three large colored tiles, and a live system snapshot. Each tile opens its app in **its own ribbon window** (like opening Word, Excel and PowerPoint side by side). `File → App Browser` or the QAT home button returns to it.

## Ribbon fidelity checklist

- App-colored **title bar** with **Quick Access Toolbar** (save/export, refresh, home + customize menu) and Windows caption buttons (min/maximize/restore/close, red hover)
- **File tab → Backstage view** (Info page with system facts, App Browser, Exit)
- Tab strip with centered active tab, **"Tell me" search box** and **Ribbon Display Options** menu
- Three classic display modes: **Always show / Show tabs / Auto-hide** (hover to open, click content to collapse, double-click a tab to pin)
- 96px ribbon: groups with dividers and captions, large buttons, stacked small buttons, split buttons, galleries-style dropdowns, checkboxes, dialog-launcher chevrons
- **Screentips** (enhanced tooltips) on every control, `F5` refresh, `Esc` to close overlays
- Inactive windows gray out their chrome; status bar shows live facts, like Excel's

## Real Windows management (PowerShell)

On Windows, every operation executes **real PowerShell** (Windows PowerShell 5.1 — preinstalled everywhere) with safe, base64-encoded scripts and environment-variable parameters — no string injection:

| Operation | Implementation |
| --- | --- |
| Process list + live CPU % | `Get-Process`, delta-`CPU` sampling in the main process |
| End task | `Stop-Process -Id <pid> -Force` |
| Run new task | `Start-Process` |
| Services + delayed-start flags | `Get-CimInstance Win32_Service` + `HKLM\…\DelayedAutostart` |
| Start/stop/restart | `Start-Service` / `Stop-Service -Force` / `Restart-Service -Force` |
| Startup type | `Set-Service` (+ registry write for delayed) |
| System info | `Win32_OperatingSystem`, `Win32_ComputerSystem`, `Win32_Processor`, `Win32_LogicalDisk`, `Win32_NetworkAdapterConfiguration`, `Win32_VideoController` |
| Windows tools | whitelisted `Start-Process` (`taskmgr`, `msinfo32`, `devmgmt`, `resmon`, `cleanmgr`, …) |
| Exports | native **save dialog** + file write |

Some operations (ending processes, controlling services, `Set-Service`) need elevation — run the suite **as administrator** for full power; read-only views work without it.

**Not on Windows?** The suite detects it and runs a built-in **simulation** with realistic data, so the entire UI is explorable anywhere — clearly badged "Demo data" on the start screen, status bars and Backstage.

## Develop

```bash
npm install
npm run dev        # Vite (renderer HMR) + esbuild watch + Electron
npm run web        # browser preview only (demo data) — great for a quick look
npm test           # render smoke tests (vitest + jsdom + Testing Library)
npm run typecheck  # strict TS over renderer + main
npm run build      # production renderer + main bundles
npm run dist       # Windows installer (NSIS) via electron-builder
```

The renderer uses **Fluent UI React v8** — the very component library that implements the Office 2016 look (DetailsList, ContextualMenu, Dialog, MessageBar, Callout…) — plus all **1,700+ Segoe MDL2 icons as crisp SVGs** (no icon font, no CDN) and Selawik/Segoe UI typography.

## Repository layout

```
electron/    main process (windows, IPC), PowerShell bridge, ops dispatcher
shared/      app registry & Office palettes, data types, simulation engine
src/
  chrome/    OfficeWindow: title bar + QAT, tabs, ribbon, backstage, status bar
  apps/      Task Manager · Services Manager · System Info
  start/     App Browser (Office Start screen)
  components/ charts, cards, notices
  styles/    office.css — the classic Office 2016 look, in ~700 lines of CSS
scripts/     dev orchestrator, esbuild config
```

---

*WinProdCMDR is an independent open-source project (BSD-3-Clause). It is not affiliated with or endorsed by Microsoft. "Office", "Excel", "Word" and "PowerPoint" are trademarks of their respective owner.*
