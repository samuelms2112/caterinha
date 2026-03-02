const express = require('express');
const router = express.Router();
const fs = require('fs');
const csv = require('csv-parser');
const crypto = require('crypto');
const { lerFaculdades, lerAlunos } = require('../helpers/db');

function gerarToken(matricula) {
  return crypto.createHash('sha256').update(matricula + 'carterinha-secret').digest('hex').slice(0, 32);
}

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const alunos = await lerAlunos();
    const aluno = alunos.find((a) => gerarToken(a.matricula) === token);
    const faculdades = lerFaculdades();

    if (!aluno) {
      return res.render('validar', { valido: false, aluno: null, faculdade: faculdades[0] || {} });
    }

    const faculdade = faculdades.find(f => f.id === aluno.faculdadeId) || faculdades[0];
    res.render('validar', { valido: true, aluno, faculdade });
  } catch (err) {
    res.render('validar', { valido: false, aluno: null, faculdade: {} });
  }
});

module.exports = router;
