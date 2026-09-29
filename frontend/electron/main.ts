import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let isKioskActive = false;

// Danh sách các phần mềm gian lận / điều khiển / máy ảo / chat bị cấm trong phòng thi
const BLACKLISTED_PROCESSES: Record<string, string> = {
  // Remote & Chia sẻ màn hình
  'teamviewer.exe': 'TeamViewer (Điều khiển từ xa)',
  'anydesk.exe': 'AnyDesk (Điều khiển từ xa)',
  'ultraviewer.exe': 'UltraViewer (Điều khiển từ xa)',
  'rustdesk.exe': 'RustDesk (Điều khiển từ xa)',
  'mstsc.exe': 'Remote Desktop Connection',
  'vncviewer.exe': 'VNC Viewer',
  'parsec.exe': 'Parsec (Chia sẻ màn hình/Game)',

  // Chat & Voice trợ giúp
  'discord.exe': 'Discord',
  'telegram.exe': 'Telegram',
  'zalo.exe': 'Zalo',
  'skype.exe': 'Skype',
  'slack.exe': 'Slack',
  'viber.exe': 'Viber',
  'whatsapp.exe': 'WhatsApp',

  // Ứng dụng AI & Gian lận khác
  'chatgpt.exe': 'ChatGPT Desktop',
  'copilot.exe': 'Microsoft Copilot Desktop',

  // Quay/Camera ảo & Máy ảo
  'obs64.exe': 'OBS Studio (Phần mềm quay / Camera ảo)',
  'obs32.exe': 'OBS Studio (Phần mềm quay / Camera ảo)',
  'obs.exe': 'OBS Studio',
  'vmware.exe': 'VMware Workstation (Máy ảo)',
  'virtualbox.exe': 'VirtualBox (Máy ảo)',
  'vboxheadless.exe': 'VirtualBox Headless',
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'ExamSystem - Ứng dụng Thi & Giám sát Chuyên Dụng (Secure Anti-Cheat)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Tùy chỉnh User-Agent để Backend/Frontend nhận diện môi trường Desktop Secure Client
  const userAgent = mainWindow.webContents.getUserAgent() + ' ExamSystemDesktop/1.0';
  mainWindow.webContents.setUserAgent(userAgent);

  const startUrl = process.env.ELECTRON_START_URL || (app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5173');

  if (startUrl.startsWith('file://')) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
      console.error('Error loading dist/index.html:', err);
    });
  } else {
    mainWindow.loadURL(startUrl).catch((err) => {
      console.error(`Error loading URL ${startUrl}:`, err);
    });
  }

  // Chặn mở popup trình duyệt ngoài
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Bật / Tắt chế độ Kiosk Lockdown trong lúc thi
function setKioskMode(enable: boolean) {
  if (!mainWindow) return;
  isKioskActive = enable;

  if (enable) {
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setKiosk(true);

    // Đăng ký chặn các phím tắt hệ thống
    const shortcutsToBlock = [
      'Alt+Tab',
      'Alt+F4',
      'Alt+Space',
      'Ctrl+Shift+Esc',
      'Ctrl+Alt+Delete',
      'PrintScreen',
      'F11',
      'F12',
      'CommandOrControl+Shift+I',
      'CommandOrControl+R',
    ];

    shortcutsToBlock.forEach((shortcut) => {
      try {
        globalShortcut.register(shortcut, () => {
          // Bắt phím tắt và không cho thực thi
          if (mainWindow) {
            mainWindow.webContents.send('blocked-shortcut-detected', { shortcut });
          }
        });
      } catch (err) {
        console.warn(`Không thể register phím tắt ${shortcut}:`, err);
      }
    });
  } else {
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    globalShortcut.unregisterAll();
  }
}

// Quét tiến trình đang chạy trên hệ điều hành
async function scanRunningProcesses() {
  const suspiciousFound: Array<{ process_name: string; label: string }> = [];

  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 3000 });
      const lines = stdout.split('\r\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^"([^"]+)"/);
        if (match && match[1]) {
          const procName = match[1].toLowerCase().trim();
          if (BLACKLISTED_PROCESSES[procName]) {
            suspiciousFound.push({
              process_name: procName,
              label: BLACKLISTED_PROCESSES[procName],
            });
          }
        }
      }
    } else {
      // Unix / MacOS
      const { stdout } = await execAsync('ps -A -o comm=', { timeout: 3000 });
      const lines = stdout.split('\n');

      for (const line of lines) {
        const procName = path.basename(line.trim().toLowerCase());
        const winName = `${procName}.exe`;
        if (BLACKLISTED_PROCESSES[winName] || BLACKLISTED_PROCESSES[procName]) {
          suspiciousFound.push({
            process_name: procName,
            label: BLACKLISTED_PROCESSES[winName] || BLACKLISTED_PROCESSES[procName],
          });
        }
      }
    }
  } catch (err) {
    console.error('Error scanning processes:', err);
  }

  return {
    clean: suspiciousFound.length === 0,
    detected_count: suspiciousFound.length,
    processes: suspiciousFound,
  };
}

// Đăng ký các IPC Handlers giao tiếp an toàn với React UI
function setupIpcHandlers() {
  // Lấy danh sách màn hình từ OS trực tiếp (không popup)
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 320, height: 180 },
      });
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
      }));
    } catch (err) {
      console.error('Error getting desktop sources:', err);
      return [];
    }
  });

  // Bật / Tắt chế độ Kiosk Lockdown
  ipcMain.handle('set-kiosk-mode', (_event, enable: boolean) => {
    setKioskMode(enable);
    return { isKiosk: isKioskActive };
  });

  // Quét tiến trình gian lận
  ipcMain.handle('scan-cheat-processes', async () => {
    return await scanRunningProcesses();
  });

  // Kiểm tra trạng thái ứng dụng Desktop
  ipcMain.handle('get-desktop-app-info', () => {
    return {
      isDesktop: true,
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      isKiosk: isKioskActive,
    };
  });

  // Đóng / Thoát ứng dụng an toàn khi đã nộp bài
  ipcMain.handle('exit-exam-app', () => {
    setKioskMode(false);
    app.quit();
  });
}

// Khởi chạy vòng đời Electron
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
