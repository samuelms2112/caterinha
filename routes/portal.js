const express = require('express');
const router = express.Router();
const { lerFaculdades } = require('../helpers/db');

function portalAutenticado(req, res, next) {
  if (!req.session.aluno) return res.redirect('/login');
  next();
}

// ─── Random content generator (cached per session) ────────────────

const DISCIPLINAS_POR_CURSO = {
  'Ciência da Computação': ['Algoritmos', 'Estrutura de Dados', 'Programação OO', 'Banco de Dados', 'Redes', 'Eng. de Software'],
  'Engenharia Civil': ['Cálculo I', 'Resistência dos Materiais', 'Topografia', 'Física Geral', 'Estruturas', 'Instalações'],
  'Administração': ['Contabilidade', 'Economia', 'Gestão de Pessoas', 'Marketing', 'Direito', 'Finanças'],
};
const DEFAULT_DISCIPLINAS = ['Matemática', 'Português', 'Física', 'Química', 'História', 'Inglês'];

const AVISOS = [
  'Período de rematrícula aberto. Compareça à secretaria com RG e comprovante de residência para renovar sua matrícula.',
  'Provas bimestrais se aproximam. Confira o calendário acadêmico atualizado no mural da instituição.',
  'Documentos pendentes devem ser entregues na secretaria até o final do mês para regularização cadastral.',
  'Biblioteca estará fechada para inventário nesta semana. Serviços de empréstimo online continuam disponíveis.',
];

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const TURNOS = ['07:00 – 08:40', '08:50 – 10:30', '13:00 – 14:40', '14:50 – 16:30', '19:00 – 20:40'];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) { return parseFloat(n.toFixed(1)); }

function gerarConteudo(aluno) {
  const disciplinas = DISCIPLINAS_POR_CURSO[aluno.curso] || DEFAULT_DISCIPLINAS;

  const boletim = disciplinas.map(d => {
    const n1 = fmt(rnd(5.5, 10));
    const n2 = fmt(rnd(5.5, 10));
    const media = fmt((n1 + n2) / 2);
    const totalAulas = 40 + rndInt(0, 20);
    const faltas = rndInt(0, 7);
    return { nome: d, n1, n2, media, faltas, totalAulas, freq: Math.round(((totalAulas - faltas) / totalAulas) * 100) };
  });

  const horarios = {};
  DIAS.forEach(dia => {
    horarios[dia] = {};
    TURNOS.forEach(turno => {
      horarios[dia][turno] = Math.random() > 0.5 ? pick(disciplinas) : null;
    });
  });

  const anoAtual = new Date().getFullYear();
  const mensagens = [
    {
      de: 'Secretaria Acadêmica',
      assunto: 'Renovação de Matrícula',
      corpo: 'Prezado(a) aluno(a), informamos que o prazo para renovação de matrícula encerra em breve. Compareça à secretaria com RG e comprovante de residência.',
      data: `20/02/${anoAtual}`
    },
    {
      de: 'Coordenação Acadêmica',
      assunto: 'Calendário de Avaliações',
      corpo: 'O calendário de avaliações bimestrais foi atualizado. Fique atento às datas de cada disciplina e organize seus estudos com antecedência.',
      data: `15/02/${anoAtual}`
    },
    {
      de: 'Biblioteca',
      assunto: 'Devolução de Materiais',
      corpo: 'Verificamos materiais em aberto no seu nome. Devolva ou renove o empréstimo para evitar suspensão do acesso à biblioteca.',
      data: `10/02/${anoAtual}`
    },
  ];

  return {
    aviso: pick(AVISOS),
    boletim,
    horarios,
    dias: DIAS,
    turnos: TURNOS,
    mensagens,
    codigoEntrada: rndInt(100000, 999999).toString(),
  };
}

function getContent(req) {
  if (!req.session.portalContent) {
    req.session.portalContent = gerarConteudo(req.session.aluno);
  }
  return req.session.portalContent;
}

function getFaculdade(aluno) {
  const faculdades = lerFaculdades();
  return faculdades.find(f => f.id === aluno.faculdadeId) || faculdades[0] || {};
}

// ─── Routes ──────────────────────────────────────────────────────

router.get('/', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  const faculdade = getFaculdade(aluno);
  res.render('portal/home', { aluno, faculdade, content });
});

router.get('/faltas', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  res.render('portal/faltas', { aluno, content });
});

router.get('/mensagens', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  res.render('portal/mensagens', { aluno, content });
});

router.get('/horarios', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  res.render('portal/horarios', { aluno, content });
});

router.get('/declaracoes', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  res.render('portal/declaracoes', { aluno });
});

router.get('/boletim', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  res.render('portal/boletim', { aluno, content });
});

router.get('/foto', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  res.render('portal/foto', { aluno });
});

router.get('/codigo', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  const content = getContent(req);
  res.render('portal/codigo', { aluno, content });
});

router.get('/identidade', portalAutenticado, (req, res) => {
  const aluno = req.session.aluno;
  res.render('portal/identidade', { aluno });
});

module.exports = router;
