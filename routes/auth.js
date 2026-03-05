const express = require('express');
const router = express.Router();
const { lerAlunos } = require('../helpers/db');

router.get('/login', (req, res) => {
  if (req.session.aluno) return res.redirect('/portal');
  res.render('login', { erro: null });
});

router.post('/login', (req, res) => {
  const { matricula, senha } = req.body;
  try {
    const alunos = lerAlunos();
    const aluno = alunos.find(a => a.matricula === matricula && a.senha === senha);
    if (!aluno) return res.render('login', { erro: 'Matrícula ou senha inválidos.' });
    req.session.aluno = aluno;
    if (!aluno.perfilCompleto) return res.redirect('/portal/completar-perfil');
    res.redirect('/portal');
  } catch (err) {
    console.error(err);
    res.render('login', { erro: 'Erro ao carregar dados.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
