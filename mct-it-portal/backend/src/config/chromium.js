const fs = require('fs');
const path = require('path');

const CHROMIUM_COMMANDS = process.platform === 'win32'
  ? ['chrome.exe', 'chromium.exe', 'msedge.exe']
  : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];

function findExecutableInPath() {
  const directories = (process.env.PATH || '').split(path.delimiter).filter(Boolean);

  for (const directory of directories) {
    for (const command of CHROMIUM_COMMANDS) {
      const candidate = path.join(directory, command);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        // Continuer jusqu'au prochain exécutable candidat.
      }
    }
  }

  return null;
}

const MACOS_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

function findExecutableInMacOs() {
  if (process.platform !== 'darwin') return null;
  for (const candidate of MACOS_CANDIDATES) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Continuer vers le candidat suivant.
    }
  }
  return null;
}

function getChromiumExecutablePath() {
  const configuredPath =
    process.env.CHROMIUM_EXECUTABLE_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;

  if (configuredPath) {
    const resolvedPath = path.resolve(configuredPath);
    try {
      fs.accessSync(resolvedPath, fs.constants.X_OK);
      return resolvedPath;
    } catch {
      throw new Error(`Chromium configuré mais inexécutable : ${resolvedPath}`);
    }
  }

  try {
    // Utilise une distribution embarquée si le paquet complet est installé.
    const puppeteer = require('puppeteer');
    const bundledPath = puppeteer.executablePath();
    if (bundledPath) return bundledPath;
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }

  const macOsPath = findExecutableInMacOs();
  if (macOsPath) return macOsPath;

  const executableFromPath = findExecutableInPath();
  if (executableFromPath) return executableFromPath;

  throw new Error(
    'Chromium introuvable. Définissez CHROMIUM_EXECUTABLE_PATH ou installez Chromium dans le PATH.'
  );
}


module.exports = { getChromiumExecutablePath };
