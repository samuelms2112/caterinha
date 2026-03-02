const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { lerFaculdades, salvarFaculdades, lerAlunos, salvarAlunos, lerAdmin } = require('../helpers/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/logos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

function adminAutenticado(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  next();
}

function renderAdmin(res, view, data = {}) {
  res.render('admin/layout', { view, ...data });
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

router.get('/', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
  const faculdades = lerFaculdades();
  renderAdmin(res, 'dashboard', {
    title: 'Dashboard',
    admin: req.session.admin,
    totalAlunos: alunos.length,
    totalFaculdades: faculdades.length
  });
});

// ── Alunos ──

router.get('/alunos', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
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
    erro: null
  });
});

router.post('/alunos/novo', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
  const { matricula, nome, curso, periodo, validade, rg, cpf, unidade, faculdadeId, senha, modelo } = req.body;
  if (alunos.find(a => a.matricula === matricula)) {
    const faculdades = lerFaculdades();
    return renderAdmin(res, 'alunos-form', {
      title: 'Novo Aluno',
      admin: req.session.admin,
      aluno: req.body,
      faculdades,
      erro: 'Matrícula já cadastrada.'
    });
  }
  alunos.push({ matricula, nome, curso, periodo, validade, rg, cpf, unidade, faculdadeId, foto: 'default.png', senha, modelo: modelo || '1' });
  salvarAlunos(alunos);
  res.redirect('/admin/alunos');
});

router.get('/alunos/:matricula/editar', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
  const aluno = alunos.find(a => a.matricula === req.params.matricula);
  if (!aluno) return res.redirect('/admin/alunos');
  const faculdades = lerFaculdades();
  renderAdmin(res, 'alunos-form', {
    title: 'Editar Aluno',
    admin: req.session.admin,
    aluno,
    faculdades,
    erro: null
  });
});

router.post('/alunos/:matricula/editar', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
  const idx = alunos.findIndex(a => a.matricula === req.params.matricula);
  if (idx === -1) return res.redirect('/admin/alunos');
  const { nome, curso, periodo, validade, rg, cpf, unidade, faculdadeId, senha, modelo } = req.body;
  alunos[idx] = { ...alunos[idx], nome, curso, periodo, validade, rg, cpf, unidade, faculdadeId, senha, modelo };
  salvarAlunos(alunos);
  res.redirect('/admin/alunos');
});

router.post('/alunos/:matricula/deletar', adminAutenticado, async (req, res) => {
  const alunos = await lerAlunos();
  const novos = alunos.filter(a => a.matricula !== req.params.matricula);
  salvarAlunos(novos);
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

router.post('/faculdades/nova', adminAutenticado, upload.single('logo'), (req, res) => {
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
  const logo = req.file ? req.file.filename : '';
  faculdades.push({ id, nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao: parseInt(modeloPadrao) || 1, logo });
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

router.post('/faculdades/:id/editar', adminAutenticado, upload.single('logo'), (req, res) => {
  const faculdades = lerFaculdades();
  const idx = faculdades.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/faculdades');
  const { nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao } = req.body;
  const logo = req.file ? req.file.filename : faculdades[idx].logo;
  faculdades[idx] = { ...faculdades[idx], nome, sigla, cnpj, endereco, cidade, telefone, site, corPrimaria, corSecundaria, modeloPadrao: parseInt(modeloPadrao) || 1, logo };
  salvarFaculdades(faculdades);
  res.redirect('/admin/faculdades');
});

router.post('/faculdades/:id/deletar', adminAutenticado, (req, res) => {
  const faculdades = lerFaculdades();
  const novas = faculdades.filter(f => f.id !== req.params.id);
  salvarFaculdades(novas);
  res.redirect('/admin/faculdades');
});

module.exports = router;
