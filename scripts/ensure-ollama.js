// Runs automatically before `npm run dev` (see package.json's "predev").
// Best-effort only: AVA already falls back to its rule-based classifier
// whenever Ollama is unreachable (see src/controllers/triage/triageController.js),
// so this script must never fail or block dev startup — a machine with no
// Ollama installed at all is a fully supported configuration, not an error.
require('dotenv').config();
const http = require('http');
const { spawn } = require('child_process');

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');

function isOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get(OLLAMA_BASE_URL, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function tryStartOllama() {
  return new Promise((resolve) => {
    let child;
    try {
      // detached + ignored stdio + unref: this process keeps running after
      // `npm run dev`'s own setup step exits, the same way a manually
      // opened `ollama serve` terminal would.
      child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
    } catch (err) {
      resolve({ ok: false, reason: err.message });
      return;
    }

    child.once('error', (err) => {
      resolve({ ok: false, reason: err.message });
    });

    // Give it a moment to fail fast (e.g. "ollama" not on PATH) before we
    // consider the spawn attempt successful and let it run independently.
    setTimeout(() => {
      child.unref();
      resolve({ ok: true });
    }, 500);
  });
}

async function main() {
  if (await isOllamaRunning()) {
    console.log(`[ollama] already running at ${OLLAMA_BASE_URL} — AVA will use the LLM.`);
    return;
  }

  console.log(`[ollama] not detected at ${OLLAMA_BASE_URL} — attempting to start it...`);
  const result = await tryStartOllama();

  if (result.ok) {
    console.log('[ollama] start attempted — give it a few seconds to finish loading its model.');
  } else {
    console.log(`[ollama] could not start automatically (${result.reason}).`);
    console.log('[ollama] this is fine — AVA will use its rule-based fallback classifier instead.');
    console.log('[ollama] install Ollama from https://ollama.com if you want real LLM-based triage.');
  }
}

main();
