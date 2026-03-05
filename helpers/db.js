const fs = require('fs');
const path = require('path');
const { encrypt, decrypt, isEncrypted } = require('./crypto');

const FACULDADES_PATH = path.join(__dirname, '../data/faculdades.json');
const ALUNOS_PATH     = path.join(__dirname, '../data/alunos.json');
const ALUNOS_CSV_PATH = path.join(__dirname, '../data/alunos.csv');
const ADMIN_PATH      = path.join(__dirname, '../data/admin.json');

// ── Helpers ──────────────────────────────────────────────────────────

function readJSON(raw) {
  const text = raw.trim();
  if (isEncrypted(text)) {
    try {
      return JSON.parse(decrypt(text));
    } catch (e) {
      // Chave errada ou arquivo corrompido — trata como texto plano
      console.error('[db] Falha ao decriptar, tentando como JSON puro:', e.message);
    }
  }
  // Remove BOM se houver e parseia como JSON puro
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

// ── Faculdades ──────────────────────────────────────────────────────

function lerFaculdades() {
  const raw = fs.readFileSync(FACULDADES_PATH, 'utf-8');
  const wasEncrypted = isEncrypted(raw.trim());
  const arr = readJSON(raw);

  // Garante que toda faculdade tem campo id
  const result = arr.map(f => ({
    id: f.id || f.sigla.toLowerCase(),
    ...f,
  }));

  // Migração: se estava em texto claro, salva encriptado
  if (!wasEncrypted) salvarFaculdades(result);

  return result;
}

function salvarFaculdades(arr) {
  fs.writeFileSync(FACULDADES_PATH, encrypt(JSON.stringify(arr)), 'utf-8');
}

// ── Alunos ──────────────────────────────────────────────────────────

// Parser CSV simples para migração única do CSV legado
function parseCSVMigration() {
  if (!fs.existsSync(ALUNOS_CSV_PATH)) return [];
  const content = fs.readFileSync(ALUNOS_CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    obj.perfilCompleto = true;
    return obj;
  });
}

function lerAlunos() {
  if (!fs.existsSync(ALUNOS_PATH)) {
    // Primeira execução: migra do CSV legado
    const alunos = parseCSVMigration();
    salvarAlunos(alunos);
    return alunos;
  }
  return readJSON(fs.readFileSync(ALUNOS_PATH, 'utf-8'));
}

function salvarAlunos(arr) {
  fs.writeFileSync(ALUNOS_PATH, encrypt(JSON.stringify(arr)), 'utf-8');
}

// ── Admin ────────────────────────────────────────────────────────────

function lerAdmin() {
  const raw = fs.readFileSync(ADMIN_PATH, 'utf-8');
  const wasEncrypted = isEncrypted(raw.trim());
  const data = readJSON(raw);
  if (!wasEncrypted) {
    fs.writeFileSync(ADMIN_PATH, encrypt(JSON.stringify(data)), 'utf-8');
  }
  return data;
}

module.exports = { lerFaculdades, salvarFaculdades, lerAlunos, salvarAlunos, lerAdmin };
