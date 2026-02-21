const fs = require('fs');
const dotenv = require('dotenv');

function tryParseUtf16EnvFile(envPath, override) {
  const buffer = fs.readFileSync(envPath);
  // If the file has lots of NUL bytes, it's likely UTF-16LE.
  if (!buffer.includes(0)) return null;

  const text = buffer.toString('utf16le').replace(/^\uFEFF/, '');
  const parsed = dotenv.parse(text);

  for (const [key, value] of Object.entries(parsed)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return parsed;
}

/**
 * Load an env file into process.env.
 * Supports normal UTF-8 .env files and UTF-16LE (common on Windows if saved with that encoding).
 */
function loadEnv(envPath, { override = true } = {}) {
  const result = dotenv.config({ path: envPath, override });
  if (result?.parsed && Object.keys(result.parsed).length > 0) {
    return result;
  }

  try {
    const parsed = tryParseUtf16EnvFile(envPath, override);
    if (parsed && Object.keys(parsed).length > 0) {
      return { parsed };
    }
  } catch {
    // ignore
  }

  return result;
}

module.exports = { loadEnv };
