const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const FACULDADES_PATH = path.join(__dirname, '../data/faculdades.json');
const ALUNOS_PATH = path.join(__dirname, '../data/alunos.csv');
const ADMIN_PATH = path.join(__dirname, '../data/admin.json');

const CSV_HEADER = 'matricula,nome,curso,periodo,validade,rg,cpf,unidade,faculdadeId,foto,senha,modelo';

function lerFaculdades() {
  return JSON.parse(fs.readFileSync(FACULDADES_PATH, 'utf-8'));
}

function salvarFaculdades(arr) {
  fs.writeFileSync(FACULDADES_PATH, JSON.stringify(arr, null, 2), 'utf-8');
}

function lerAlunos() {
  return new Promise((resolve, reject) => {
    const alunos = [];
    fs.createReadStream(ALUNOS_PATH)
      .pipe(csv())
      .on('data', (row) => alunos.push(row))
      .on('end', () => resolve(alunos))
      .on('error', reject);
  });
}

function escaparCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function salvarAlunos(arr) {
  const linhas = arr.map(a =>
    [
      a.matricula, a.nome, a.curso, a.periodo, a.validade,
      a.rg, a.cpf, a.unidade, a.faculdadeId, a.foto, a.senha, a.modelo
    ].map(escaparCsv).join(',')
  );
  fs.writeFileSync(ALUNOS_PATH, CSV_HEADER + '\n' + linhas.join('\n') + '\n', 'utf-8');
}

function lerAdmin() {
  return JSON.parse(fs.readFileSync(ADMIN_PATH, 'utf-8'));
}

module.exports = { lerFaculdades, salvarFaculdades, lerAlunos, salvarAlunos, lerAdmin };
