export interface ElectronDesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface ElectronCheatScanResult {
  clean: boolean;
  detected_count: number;
  processes: Array<{
    process_name: string;
    label: string;
    killed?: boolean;
  }>;
}

export interface ElectronAppInfo {
  isDesktop: boolean;
  platform: string;
  arch: string;
  version: string;
  isKiosk: boolean;
}

export interface IElectronAPI {
  isDesktop: boolean;
  getDesktopSources: () => Promise<ElectronDesktopSource[]>;
  captureScreenFrame: () => Promise<string | null>;
  setKioskMode: (enable: boolean) => Promise<{ isKiosk: boolean }>;
  scanCheatProcesses: () => Promise<ElectronCheatScanResult>;
  getDesktopAppInfo: () => Promise<ElectronAppInfo>;
  exitExamApp: () => Promise<void>;
  onBlockedShortcut: (callback: (data: { shortcut: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
