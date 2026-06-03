const fs = require('fs');
const path = require('path');

// Fixes a common Windows issue where .env is saved as UTF-16 (or with stray null bytes)
// which breaks dotenv parsing.
// This script converts backend/.env to UTF-8 *without changing any values*.
//
// Safer defaults:
// - writes a timestamped binary backup
// - outputs to a new file (backend/.env.utf8) unless you pass --inplace

const envPath = path.resolve(__dirname, '../.env');
const inplace = process.argv.includes('--inplace');
const outPath = inplace ? envPath : `${envPath}.utf8`;

console.log('Source:', envPath);
console.log('Output:', outPath);

const hasManyNulls = (buf) => {
    const sample = buf.subarray(0, Math.min(buf.length, 400));
    let nul = 0;
    for (const b of sample) if (b === 0x00) nul++;
    return nul >= 10;
};

const decodeUtf16be = (buf, offset = 0) => {
    const slice = buf.subarray(offset);
    const evenLen = slice.length - (slice.length % 2);
    const swapped = Buffer.allocUnsafe(evenLen);
    for (let i = 0; i < evenLen; i += 2) {
        swapped[i] = slice[i + 1];
        swapped[i + 1] = slice[i];
    }
    return swapped.toString('utf16le');
};

const scoreEnvText = (text) => {
    const s = String(text || '');
    const lines = s.split(/\r?\n/).slice(0, 80);
    let score = 0;
    for (const line of lines) {
        if (!line) continue;
        // typical env lines contain KEY=VALUE
        if (/^[A-Z0-9_]+\s*=/.test(line)) score += 5;
        if (line.includes('=')) score += 1;
        if (line.startsWith('#')) score += 1;
    }
    return score;
};

const decodePossiblyUtf16 = (buf) => {
    if (!Buffer.isBuffer(buf) || buf.length === 0) return '';

    // BOM checks (also try at offset 1 in case of a stray leading byte)
    const looksLikeBomAt = (i) => buf.length >= i + 2 && ((buf[i] === 0xff && buf[i + 1] === 0xfe) || (buf[i] === 0xfe && buf[i + 1] === 0xff));

    if (looksLikeBomAt(0)) {
        if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
        return decodeUtf16be(buf, 2);
    }
    if (looksLikeBomAt(1)) {
        if (buf[1] === 0xff && buf[2] === 0xfe) return buf.subarray(3).toString('utf16le');
        return decodeUtf16be(buf, 3);
    }

    // Heuristic: if there are many NUL bytes, it's probably UTF-16; try aligned and 1-byte shifted
    if (hasManyNulls(buf)) {
        const d0 = buf.toString('utf16le');
        const d1 = buf.length > 1 ? buf.subarray(1).toString('utf16le') : '';
        return scoreEnvText(d1) > scoreEnvText(d0) ? d1 : d0;
    }

    // Fallback: assume UTF-8
    return buf.toString('utf8');
};

const timestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

try {
    if (!fs.existsSync(envPath)) {
        console.error('❌ No .env found at:', envPath);
        process.exitCode = 1;
    } else {
        const original = fs.readFileSync(envPath);

        // Always keep a binary backup before writing anything.
        const backupPath = `${envPath}.binbak-${timestamp()}`;
        fs.writeFileSync(backupPath, original);
        console.log('Backup written:', backupPath);

        const decoded = decodePossiblyUtf16(original);
        const normalized = String(decoded).replace(/\r\n/g, '\n');

        if (scoreEnvText(normalized) < 2) {
            console.error('❌ Decoded output does not look like a .env file. Aborting to avoid corruption.');
            process.exitCode = 1;
        } else {
            fs.writeFileSync(outPath, normalized, { encoding: 'utf8' });
            console.log('✅ Wrote UTF-8 .env successfully.');
            if (!inplace) {
                console.log('Tip: Review the .utf8 file, then rerun with --inplace to overwrite the original.');
            }
        }
    }
} catch (err) {
    console.error('❌ Failed:', err?.message || err);
    process.exitCode = 1;
}
