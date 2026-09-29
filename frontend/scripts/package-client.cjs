const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');
const outDir = path.join(rootDir, 'dist-client');
const appTarget = path.join(outDir, 'resources', 'app');

console.log('📦 Bắt đầu đóng gói Standalone Portable Client...');

// 1. Tạo thư mục output
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(appTarget, { recursive: true });

// 2. Copy toàn bộ Electron runtime
fs.cpSync(electronDist, outDir, { recursive: true });

// 3. Đổi tên electron.exe thành ExamSystemClient.exe
const origExe = path.join(outDir, 'electron.exe');
const newExe = path.join(outDir, 'ExamSystemClient.exe');
if (fs.existsSync(origExe)) {
  fs.renameSync(origExe, newExe);
}

// 4. Copy dist, electron, và package.json vào resources/app
fs.cpSync(path.join(rootDir, 'dist'), path.join(appTarget, 'dist'), { recursive: true });
fs.cpSync(path.join(rootDir, 'electron'), path.join(appTarget, 'electron'), { recursive: true });
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appTarget, 'package.json'));

// 5. Tạo file server_config.json
const serverConfig = {
  server_url: "http://192.168.2.8:5173"
};
fs.writeFileSync(path.join(outDir, 'server_config.json'), JSON.stringify(serverConfig, null, 2), 'utf8');

console.log('✅ ĐÓNG GÓI HOÀN TẤT!');
console.log(`📁 Thư mục ứng dụng: ${outDir}`);
console.log(`🚀 File thực thi: ${newExe}`);
