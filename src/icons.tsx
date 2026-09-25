/**
 * WinProdCMDR — icon registry.
 *
 * Registers the Fluent UI React MDL2 **SVG** icons (the same glyphs Office 2016
 * drew with its Segoe MDL2 Assets font) into Fluent's global icon registry, so
 * `<Icon iconName="..."/>` renders crisp inline SVGs with no external font/CDN
 * dependency. The four window-chrome glyphs missing from the SVG set are
 * re-drawn 1:1 as inline SVG paths.
 */

import * as React from 'react';
import { registerIcons } from '@fluentui/react';
import {
  AcceptIcon, AddIcon, AreaChartIcon, ArchiveIcon, BarChart4Icon, CancelIcon, ChartIcon,
  CheckMarkIcon, ChevronDownIcon, ChevronDownSmallIcon, ChevronLeftIcon, ChevronRightIcon,
  ChevronUpIcon, ChromeCloseIcon, ChromeFullScreenIcon, ChromeMinimizeIcon,
  CircleRingIcon, ClearIcon, CodeIcon, ColorSolidIcon, CompletedIcon, CopyIcon, DeleteIcon,
  DeveloperToolsIcon, Devices4Icon, Devices3Icon, DiagnosticIcon, DonutChartIcon, DownloadIcon,
  ErrorBadgeIcon, ErrorIcon, FilterIcon, FolderOpenIcon, GlobeIcon, HardDriveIcon, HealthIcon,
  HeartIcon, HomeIcon, Info2Icon, InfoIcon, InfoSolidIcon, InternetSharingIcon, LightningBoltIcon,
  LineChartIcon, ListIcon, LockIcon, OpenFileIcon, PageIcon, PauseIcon, PlayIcon, PowerButtonIcon,
  ProcessingIcon, ProcessingRunIcon, RedoIcon, RefreshIcon, RepairIcon, ReportDocumentIcon,
  SaveIcon, SearchIcon, SecurityGroupIcon, ServerIcon, ServerProcessesIcon, SettingsIcon,
  SortIcon, SpeedHighIcon, StatusCircleBlockIcon, StatusCircleCheckmarkIcon, StatusCircleErrorXIcon,
  StatusCircleExclamationIcon, StatusCircleInfoIcon, StopIcon, SyncIcon, SystemIcon, TaskManagerIcon,
  TilesIcon, UndoIcon, UserGaugeIcon, ViewIcon, PinnedIcon,
} from '@fluentui/react-icons-mdl2';

/* Window chrome glyphs (MDL2 E921–E8BB), re-drawn on a 10×10 grid. */
const ChromeMaximizeGlyph: React.FunctionComponent = () => (
  <svg width="1em" height="1em" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M0.5 0.5h9v9h-9zM1.5 1.5v7h7v-7z" fill="currentColor" fillRule="evenodd" />
  </svg>
);
const ChromeRestoreGlyph: React.FunctionComponent = () => (
  <svg width="1em" height="1em" viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M2.5 0.5h7v7h-2v2h-7v-7h2v-2zM3.5 3.5v-1h-2v5h5v-2h-3v-2zM4.5 1.5v2h3v3h1v-5h-4z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const SVGS: Record<string, React.FunctionComponent> = {
  Accept: AcceptIcon, Add: AddIcon, AreaChart: AreaChartIcon, Archive: ArchiveIcon,
  BarChart4: BarChart4Icon, Cancel: CancelIcon, Chart: ChartIcon, CheckMark: CheckMarkIcon,
  ChevronDown: ChevronDownIcon, ChevronDownSmall: ChevronDownSmallIcon, ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon, ChevronUp: ChevronUpIcon, ChromeClose: ChromeCloseIcon,
  ChromeFullScreen: ChromeFullScreenIcon, ChromeMinimize: ChromeMinimizeIcon,
  ChromeMaximize: ChromeMaximizeGlyph, ChromeRestore: ChromeRestoreGlyph, CircleRing: CircleRingIcon,
  Clear: ClearIcon, Code: CodeIcon, ColorSolid: ColorSolidIcon, Completed: CompletedIcon,
  Copy: CopyIcon, Delete: DeleteIcon, DeveloperTools: DeveloperToolsIcon, Devices4: Devices4Icon,
  Devices3: Devices3Icon, Diagnostic: DiagnosticIcon, DonutChart: DonutChartIcon, Download: DownloadIcon,
  Error: ErrorIcon, ErrorBadge: ErrorBadgeIcon, Filter: FilterIcon, FolderOpen: FolderOpenIcon,
  Globe: GlobeIcon, HardDrive: HardDriveIcon, Health: HealthIcon, Heart: HeartIcon, Home: HomeIcon,
  Info: InfoIcon, Info2: Info2Icon, InfoSolid: InfoSolidIcon, InternetSharing: InternetSharingIcon,
  LightningBolt: LightningBoltIcon, LineChart: LineChartIcon, List: ListIcon, Lock: LockIcon,
  OpenFile: OpenFileIcon, Page: PageIcon, Pause: PauseIcon, Play: PlayIcon, PowerButton: PowerButtonIcon,
  Processing: ProcessingIcon, ProcessingRun: ProcessingRunIcon, Redo: RedoIcon, Refresh: RefreshIcon,
  Repair: RepairIcon, ReportDocument: ReportDocumentIcon, Save: SaveIcon, Search: SearchIcon,
  SecurityGroup: SecurityGroupIcon, Server: ServerIcon, ServerProcesses: ServerProcessesIcon,
  Settings: SettingsIcon, Sort: SortIcon, SpeedHigh: SpeedHighIcon,
  StatusCircleBlock: StatusCircleBlockIcon, StatusCircleCheckmark: StatusCircleCheckmarkIcon,
  StatusCircleErrorX: StatusCircleErrorXIcon, StatusCircleExclamation: StatusCircleExclamationIcon,
  StatusCircleInfo: StatusCircleInfoIcon, Stop: StopIcon, Sync: SyncIcon, System: SystemIcon,
  TaskManager: TaskManagerIcon, Tiles: TilesIcon, Undo: UndoIcon, UserGauge: UserGaugeIcon,
  View: ViewIcon, Pin: PinnedIcon,
};

export function registerOfficeIcons(): void {
  registerIcons({
    icons: Object.fromEntries(Object.entries(SVGS).map(([name, C]) => [name, <C />])),
  });
}
