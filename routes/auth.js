const express = require('express');
const router = express.Router();
const fs = require('fs');
const csv = require('csv-parser');

function carregarAlunos() {
  return new Promise((resolve, reject) => {
    const alunos = [];
    fs.createReadStream('./data/alunos.csv')
      .pipe(csv())
      .on('data', (row) => alunos.push(row))
      .on('end', () => resolve(alunos))
      .on('error', reject);
  });
}

router.get('/login', (req, res) => {
  if (req.session.aluno) return res.redirect('/portal');
  res.render('login', { erro: null });
});

router.post('/login', async (req, res) => {
  const { matricula, senha } = req.body;
  try {
    const alunos = await carregarAlunos();
    const aluno = alunos.find(
      (a) => a.matricula === matricula && a.senha === senha
    );
    if (!aluno) {
      return res.render('login', { erro: 'Matrícula ou senha inválidos.' });
    }
    req.session.aluno = aluno;
    res.redirect('/portal');
  } catch (err) {
    res.render('login', { erro: 'Erro ao carregar dados.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
