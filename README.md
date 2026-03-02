# 🎓 Carterinha Estudantil

Sistema web para geração de carteirinha de identificação estudantil com QR Code e PDF.

## Como rodar

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start

# Acesse: http://localhost:3000
```

## Usuários de teste (CSV)

| Matrícula | Senha |
|-----------|-------|
| 2024001   | 1234  |
| 2024002   | 5678  |
| 2024003   | 4321  |

## Estrutura

```
carterinha-estudante/
├── data/
│   ├── alunos.csv        ← dados dos alunos
│   └── faculdade.json    ← dados da instituição
├── public/
│   ├── css/style.css
│   └── uploads/          ← fotos dos alunos
├── views/
│   ├── login.ejs
│   ├── carterinha.ejs
│   └── validar.ejs
├── routes/
│   ├── auth.js
│   ├── carterinha.js
│   └── validar.js
└── app.js
```

## Customizar

### Dados da faculdade
Edite `data/faculdade.json`:
```json
{
  "nome": "Nome da Faculdade",
  "sigla": "SIGLA",
  "corPrimaria": "#1a3a6b",
  "corSecundaria": "#e8a800"
}
```

### Adicionar alunos
Edite `data/alunos.csv` adicionando uma linha:
```
matricula,nome,curso,periodo,validade,foto,senha
2024004,Novo Aluno,Direito,1° Semestre,12/2025,default.png,senha123
```

### Fotos dos alunos
Coloque as fotos em `public/uploads/` e atualize o campo `foto` no CSV.

## Rotas

| Rota | Descrição |
|------|-----------|
| `GET /login` | Tela de login |
| `POST /login` | Autenticar |
| `GET /carterinha` | Ver carteirinha (requer login) |
| `GET /carterinha/pdf` | Baixar PDF |
| `GET /validar/:token` | Validar carteirinha (pública) |
| `GET /logout` | Sair |
# caterinha
