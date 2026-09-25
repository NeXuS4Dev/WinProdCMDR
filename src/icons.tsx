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
  ChevronUpIcon, ChromeCloseIcon, ChromeFullScreenIcon, ChromeMinimizeIcon, ChromeRestoreIcon,
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

/* Window chrome glyphs on the authentic MDL2 2048 grid.
   ChromeClose / ChromeMinimize / ChromeRestore ship with the package (real
   Segoe MDL2 path data, 205-unit strokes). ChromeMaximize (E922) is missing
   from the SVG set, so it is re-drawn here on the same grid with the same
   stroke weight: a 1638×1638 square outline centered in the 2048 box. */
const ChromeMaximizeGlyph: React.FunctionComponent = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 2048 2048" style={{ display: "block" }} focusable="false" aria-hidden="true">
    <path d="M1843 205v1638H205V205h1638zM1638 410H410v1228h1228V410z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

const SVGS: Record<string, React.FunctionComponent> = {
  Accept: AcceptIcon, Add: AddIcon, AreaChart: AreaChartIcon, Archive: ArchiveIcon,
  BarChart4: BarChart4Icon, Cancel: CancelIcon, Chart: ChartIcon, CheckMark: CheckMarkIcon,
  ChevronDown: ChevronDownIcon, ChevronDownSmall: ChevronDownSmallIcon, ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon, ChevronUp: ChevronUpIcon, ChromeClose: ChromeCloseIcon,
  ChromeFullScreen: ChromeFullScreenIcon, ChromeMinimize: ChromeMinimizeIcon,
  ChromeMaximize: ChromeMaximizeGlyph, ChromeRestore: ChromeRestoreIcon, CircleRing: CircleRingIcon,
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
