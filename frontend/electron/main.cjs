const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

let mainWindow = null;
let isKioskActive = false;

// Danh sách các phần mềm gian lận / điều khiển / máy ảo / chat bị cấm trong phòng thi
const BLACKLISTED_PROCESSES = {
  // Remote & Chia sẻ màn hình
  'teamviewer.exe': 'TeamViewer (Điều khiển từ xa)',
  'anydesk.exe': 'AnyDesk (Điều khiển từ xa)',
  'ultraviewer.exe': 'UltraViewer (Điều khiển từ xa)',
  'rustdesk.exe': 'RustDesk (Điều khiển từ xa)',
  'mstsc.exe': 'Remote Desktop Connection',
  'vncviewer.exe': 'VNC Viewer',
  'parsec.exe': 'Parsec (Chia sẻ màn hình)',

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

const fs = require('fs');

// Đọc trước Server URL để gắn vào Chromium command line switch
let targetServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173,http://192.168.2.8:5173,http://192.168.2.8';
const cliUrl = process.argv.find((arg) => arg.startsWith('http://') || arg.startsWith('https://'));
if (cliUrl) {
  targetServerUrl = cliUrl;
} else {
  const configPath = path.join(path.dirname(process.execPath), 'server_config.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.server_url) targetServerUrl = cfg.server_url;
    } catch {}
  }
}

// 1. Cho phép Chromium dùng Camera/Microphone trên địa chỉ IP HTTP mạng LAN như HTTPS
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', `${targetServerUrl},http://192.168.2.8:5173,http://192.168.2.8,http://localhost:5173`);
// 2. Tự động cấp quyền phần cứng media stream không cần dialog
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-features', 'HardwareMediaKeyHandling,MediaStreamTrack');
app.commandLine.appendSwitch('ignore-certificate-errors');

// 3. Tối ưu GPU Hardware Acceleration & Chống lag/freeze khi chạy nền
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function createWindow() {
  const { session } = require('electron');
  
  // Tự động cấp tất cả quyền camera, micro, quay màn hình cho ứng dụng thi
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  if (session.defaultSession.setDevicePermissionHandler) {
    session.defaultSession.setDevicePermissionHandler(() => true);
  }

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
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // Tùy chỉnh User-Agent để Backend/Frontend nhận diện môi trường Desktop Secure Client
  const userAgent = mainWindow.webContents.getUserAgent() + ' ExamSystemDesktop/1.0';
  mainWindow.webContents.setUserAgent(userAgent);

  const fs = require('fs');
  let startUrl = process.env.ELECTRON_START_URL;

  // Kiểm tra tham số dòng lệnh: e.g. exam-system-client.exe http://192.168.2.8:5173
  const cliUrl = process.argv.find((arg) => arg.startsWith('http://') || arg.startsWith('https://'));
  if (!startUrl && cliUrl) {
    startUrl = cliUrl;
  }

  // Kiểm tra file server_config.json cạnh file .exe
  if (!startUrl) {
    const configPath = path.join(path.dirname(process.execPath), 'server_config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.server_url) {
          startUrl = config.server_url;
        }
      } catch (err) {
        console.warn('Lỗi đọc server_config.json:', err);
      }
    }
  }

  // Fallback mặc định
  if (!startUrl) {
    startUrl = app.isPackaged
      ? `file://${path.join(__dirname, '../dist/index.html')}`
      : 'http://localhost:5173';
  }

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
function setKioskMode(enable) {
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

// Quét và CƯỠNG CHẾ TẮT (Force Shutdown) tiến trình gian lận đang chạy trên hệ điều hành
async function scanRunningProcesses() {
  const suspiciousFound = [];

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
            // CƯỠNG CHẾ ĐÓNG ỨNG DỤNG NGAY LẬP TỨC
            let wasKilled = false;
            try {
              await execAsync(`taskkill /F /IM ${procName}`);
              wasKilled = true;
              console.log(`[Anti-Cheat Kiosk] ĐÃ CƯỠNG CHẾ ĐÓNG ỨNG DỤNG CẤM: ${procName}`);
            } catch (kErr) {
              console.warn(`[Anti-Cheat Kiosk] Không thể kill ${procName}:`, kErr);
            }

            suspiciousFound.push({
              process_name: procName,
              label: BLACKLISTED_PROCESSES[procName],
              killed: wasKilled,
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
          try {
            await execAsync(`pkill -9 -f ${procName}`);
          } catch {}

          suspiciousFound.push({
            process_name: procName,
            label: BLACKLISTED_PROCESSES[winName] || BLACKLISTED_PROCESSES[procName],
            killed: true,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error scanning/killing cheat processes:', err);
  }

  return {
    clean: suspiciousFound.length === 0,
    detected_count: suspiciousFound.length,
    processes: suspiciousFound,
  };
}

// Đăng ký các IPC Handlers giao tiếp an toàn với React UI
function setupIpcHandlers() {
  let isCapturing = false;
  // Chụp ảnh màn hình máy tính trực tiếp (Native Screen Capture)
  ipcMain.handle('capture-screen-frame', async () => {
    if (isCapturing) return null;
    isCapturing = true;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 640, height: 360 },
      });
      if (sources && sources.length > 0) {
        return sources[0].thumbnail.toDataURL();
      }
      return null;
    } catch (err) {
      console.error('Error capturing native screen frame:', err);
      return null;
    } finally {
      isCapturing = false;
    }
  });

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
  ipcMain.handle('set-kiosk-mode', (_event, enable) => {
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
