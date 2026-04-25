const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_PORT = process.env.PORT || '3456';
const APP_URL = `http://127.0.0.1:${DEFAULT_PORT}`;
let serverProcess;

function startServer() {
  const serverScript = path.join(__dirname, '..', 'src', 'server.js');
  serverProcess = spawn(process.execPath, [serverScript], {
    env: { ...process.env, PORT: DEFAULT_PORT },
    stdio: 'inherit'
  });
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Learnix server did not start in time.'));
            return;
          }
          setTimeout(tryConnect, 500);
        });
    };

    tryConnect();
  });
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'Learnix',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await mainWindow.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  startServer();

  try {
    await waitForServer(APP_URL);
    await createWindow();
  } catch (error) {
    console.error(error.message);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
