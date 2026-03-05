const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { lerFaculdades, salvarFaculdades, lerAlunos, salvarAlunos, lerAdmin } = require('../helpers/db');

const uploadFoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, 'foto_' + Date.now() + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

function adminAutenticado(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  next();
}

function renderAdmin(res, view, data = {}) {
  res.render('admin/layout', { view, ...data });
}

function gerarMatricula(alunos) {
  let mat;
  do {
    mat = Math.floor(100000000 + Math.random() * 900000000).toString();
  } while (alunos.find(a => a.matricula === mat));
  return mat;
}

// ── Login ──

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { erro: null });
});

router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  const admin = lerAdmin();
  if (usuario === admin.usuario && senha === admin.senha) {
    req.session.admin = { usuario };
    return res.redirect('/admin');
  }
  res.render('admin/login', { erro: 'Usuário ou senha inválidos.' });
});

router.get('/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

// ── Dashboard ──

router.get('/', adminAutenticado, (req, res) => {
  const alunos = lerAlunos();
  const faculdades = lerFaculdades();
  renderAdmin(res, 'dashboard', {
    title: 'Dashboard',
    admin: req.session.admin,
    totalAlunos: alunos.length,
    totalFaculdades: faculdades.length
  });
});

// ── Alunos ──

router.get('/alunos', adminAutenticado, (req, res) => {
  const alunos = lerAlunos();
  const faculdades = lerFaculdades();
  const filtro = req.query.faculdadeId || '';
  const alunosFiltrados = filtro ? alunos.filter(a => a.faculdadeId === filtro) : alunos;
  renderAdmin(res, 'alunos-lista', {
    title: 'Alunos',
    admin: req.session.admin,
    alunos: alunosFiltrados,
    faculdades,
    filtro
  });
});

router.get('/alunos/novo', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  renderAdmin(res, 'alunos-form', {
    title: 'Novo Aluno',
    admin: req.session.admin,
    aluno: null,
    faculdades,
    erro: null,
    novo: false
  });
});

router.post('/alunos/novo', adminAutenticado, uploadFoto.single('foto'), (req, res) => {
  const alunos = lerAlunos();
  const { nome, curso, faculdadeId, validade, modelo } = req.body;
  const matricula = gerarMatricula(alunos);
  const senha = matricula; // senha inicial = matrícula
  const foto = req.file ? req.file.filename : 'default.png';
  alunos.push({
    matricula,
    nome,
    curso,
    faculdadeId,
    validade: validade || '',
    modelo: modelo || '1',
    foto,
    senha,
    rg: '',
    cpf: '',
    periodo: '',
    unidade: '',
    perfilCompleto: false
  });
  salvarAlunos(alunos);
  res.redirect('/admin/alunos/' + matricula + '/editar?novo=1');
});

router.get('/alunos/:matricula/editar', adminAutenticado, (req, res) => {
  const alunos = lerAlunos();
  const aluno = alunos.find(a => a.matricula === req.params.matricula);
  if (!aluno) return res.redirect('/admin/alunos');
  const faculdades = lerFaculdades();
  renderAdmin(res, 'alunos-form', {
    title: 'Editar Aluno',
    admin: req.session.admin,
    aluno,
    faculdades,
    erro: null,
    novo: req.query.novo === '1'
  });
});

router.post('/alunos/:matricula/editar', adminAutenticado, uploadFoto.single('foto'), (req, res) => {
  const alunos = lerAlunos();
  const idx = alunos.findIndex(a => a.matricula === req.params.matricula);
  if (idx === -1) return res.redirect('/admin/alunos');
  const { nome, curso, periodo, validade, rg, cpf, unidade, faculdadeId, senha, modelo, perfilCompleto } = req.body;
  const foto = req.file ? req.file.filename : alunos[idx].foto;
  alunos[idx] = {
    ...alunos[idx],
    nome,
    curso,
    periodo,
    validade,
    rg,
    cpf,
    unidade,
    faculdadeId,
    senha,
    modelo,
    foto,
    perfilCompleto: perfilCompleto === 'true'
  };
  salvarAlunos(alunos);
  res.redirect('/admin/alunos');
});

router.post('/alunos/:matricula/deletar', adminAutenticado, (req, res) => {
  const alunos = lerAlunos();
  salvarAlunos(alunos.filter(a => a.matricula !== req.params.matricula));
  res.redirect('/admin/alunos');
});

// ── Faculdades ──

router.get('/faculdades', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  renderAdmin(res, 'faculdades-lista', {
    title: 'Faculdades',
    admin: req.session.admin,
    faculdades
  });
});

router.get('/faculdades/nova', adminAutenticado, (req, res) => {
  renderAdmin(res, 'faculdades-form', {
    title: 'Nova Faculdade',
    admin: req.session.admin,
    faculdade: null,
    erro: null
  });
});

router.post('/faculdades/nova', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  const { id, nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao } = req.body;
  if (faculdades.find(f => f.id === id)) {
    return renderAdmin(res, 'faculdades-form', {
      title: 'Nova Faculdade',
      admin: req.session.admin,
      faculdade: req.body,
      erro: 'ID já cadastrado.'
    });
  }
  faculdades.push({ id, nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao: parseInt(modeloPadrao) || 1 });
  salvarFaculdades(faculdades);
  res.redirect('/admin/faculdades');
});

router.get('/faculdades/:id/editar', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  const faculdade = faculdades.find(f => f.id === req.params.id);
  if (!faculdade) return res.redirect('/admin/faculdades');
  renderAdmin(res, 'faculdades-form', {
    title: 'Editar Faculdade',
    admin: req.session.admin,
    faculdade,
    erro: null
  });
});

router.post('/faculdades/:id/editar', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  const idx = faculdades.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/faculdades');
  const { nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao } = req.body;
  faculdades[idx] = { ...faculdades[idx], nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao: parseInt(modeloPadrao) || 1 };
  salvarFaculdades(faculdades);
  res.redirect('/admin/faculdades');
});

router.post('/faculdades/:id/deletar', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  salvarFaculdades(faculdades.filter(f => f.id !== req.params.id));
  res.redirect('/admin/faculdades');
});

module.exports = router;
