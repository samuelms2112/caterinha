const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const carteirinhaRoutes = require('./routes/carterinha');
const validarRoutes = require('./routes/validar');
const adminRoutes = require('./routes/admin');
const portalRoutes = require('./routes/portal');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'carterinha-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 horas
}));

app.get('/', (req, res) => {
  if (req.session.aluno) return res.redirect('/portal');
  res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/carterinha', carteirinhaRoutes);
app.use('/validar', validarRoutes);
app.use('/admin', adminRoutes);
app.use('/portal', portalRoutes);

app.listen(PORT, () => {
  console.log(`\n✅ Carterinha Estudantil rodando em: http://localhost:${PORT}`);
  console.log(`   Login: http://localhost:${PORT}/login\n`);
});
