const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { lerFaculdades } = require("../helpers/db");

function gerarToken(matricula) {
  return crypto
    .createHash("sha256")
    .update(matricula + "carterinha-secret")
    .digest("hex")
    .slice(0, 32);
}

function autenticado(req, res, next) {
  if (!req.session.aluno) return res.redirect("/login");
  next();
}

router.get("/", autenticado, async (req, res) => {
  const aluno = req.session.aluno;
  const token = gerarToken(aluno.matricula);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const urlValidacao = `${baseUrl}/validar/${token}`;
  const faculdades = lerFaculdades();
  const faculdade =
    faculdades.find((f) => f.id === aluno.faculdadeId) || faculdades[0];
  // modelo do aluno → fallback para modeloPadrao da faculdade → fallback 1
  const modelo = parseInt(aluno.modelo) || faculdade.modeloPadrao || 1;

  const qrCodeDataURL = await QRCode.toDataURL(urlValidacao, {
    width: 140,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const view = modelo === 2 ? "carterinha2" : "carterinha";
  res.render(view, { aluno, faculdade, qrCodeDataURL, urlValidacao });
});

router.get("/pdf", autenticado, async (req, res) => {
  const aluno = req.session.aluno;
  const faculdades = lerFaculdades();
  const faculdade =
    faculdades.find((f) => f.id === aluno.faculdadeId) || faculdades[0];
  const modelo = parseInt(aluno.modelo) || faculdade.modeloPadrao || 1;
  if (modelo === 2) return gerarPdfModelo2(req, res, faculdade);
  return gerarPdfModelo1(req, res, faculdade);
});

async function gerarPdfModelo2(req, res, faculdade) {
  const aluno = req.session.aluno;
  const token = gerarToken(aluno.matricula);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const urlValidacao = `${baseUrl}/validar/${token}`;

  const qrBuffer = await QRCode.toBuffer(urlValidacao, {
    width: 110,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Card vertical estilo app — 340 x 480 pontos
  const W = 340,
    H = 480;
  const PAD = 18;
  const corFundo = "#1a1a1a";
  const corCard = "#eef0f5";
  const corAzul = faculdade.corSecundaria || "#2e7bc4";

  const doc = new PDFDocument({ size: [W, H], margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=carterinha2_${aluno.matricula}.pdf`,
  );
  doc.pipe(res);

  // Fundo azul escuro
  doc.rect(0, 0, W, H).fill(corFundo);

  // Card branco com margem
  const CX = 12,
    CY = 12,
    CW = W - 24,
    CH = H - 24;
  doc.roundedRect(CX, CY, CW, CH, 8).fill(corCard);

  // ── Logo ──
  doc
    .fillColor(corFundo)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(faculdade.sigla + " 🌐", CX + PAD, CY + 16, { width: CW - PAD * 2 });

  doc
    .fillColor("#333")
    .fontSize(8)
    .font("Helvetica")
    .text(faculdade.nome, CX + PAD, CY + 42, { width: CW - PAD * 2 });

  doc
    .fillColor("#555")
    .fontSize(7.5)
    .font("Helvetica")
    .text("Carteirinha de Identidade Estudantil", CX + PAD, CY + 53, {
      width: CW - PAD * 2,
    });

  // Linha divisória
  doc
    .moveTo(CX + PAD, CY + 66)
    .lineTo(CX + CW - PAD, CY + 66)
    .strokeColor("#cccccc")
    .lineWidth(0.5)
    .stroke();

  // ── Dados ──
  const DX = CX + PAD,
    DW = CW - PAD * 2;
  let dy = CY + 76;

  function campoPDF(label, valor) {
    doc
      .fillColor("#333")
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text(label, DX, dy, { width: DW, continued: true });
    doc
      .fillColor("#111")
      .font("Helvetica")
      .text(" " + valor, { width: DW });
    dy += 22;
  }

  campoPDF("Aluno:", aluno.nome);
  campoPDF("Curso:", aluno.curso);
  campoPDF("Campus/PAP:", aluno.unidade || faculdade.cidade);
  campoPDF("RU:", aluno.matricula);
  campoPDF("CPF:", aluno.cpf || "—");
  campoPDF("Validade:", aluno.validade);
  campoPDF("Data:", new Date().toLocaleString("pt-BR"));

  // ── QR Code — canto inferior direito ──
  const QR = 80;
  const QRX = CX + CW - PAD - QR;
  const QRY = CY + CH - PAD - QR;
  doc.rect(QRX - 3, QRY - 3, QR + 6, QR + 6).fill("#ffffff");
  doc.image(qrBuffer, QRX, QRY, { width: QR, height: QR });

  doc.end();
}

async function gerarPdfModelo1(req, res, faculdade) {
  const aluno = req.session.aluno;
  const token = gerarToken(aluno.matricula);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const urlValidacao = `${baseUrl}/validar/${token}`;

  const qrBuffer = await QRCode.toBuffer(urlValidacao, {
    width: 150,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // ── Dimensões — proporções fiéis ao modelo de referência ──
  const W = 612; // largura total (aprox. A4 landscape ÷ 1.33)
  const H = 396; // altura total  (razão 1.55:1)
  const SB_X = 456; // onde a sidebar começa (~74% da largura)
  const SB_W = W - SB_X; // largura da sidebar (~26%)
  const MARGIN = 0; // foto cola na borda
  const PHOTO_W = 170; // largura da foto
  // altura da foto = altura da seção superior (65% do total)
  const TOP_H = Math.round(H * 0.63);
  const BOTTOM_H = H - TOP_H;
  const DATA_X = PHOTO_W + 20; // dados começam após a foto
  const DATA_W = SB_X - DATA_X - 14;

  const corAzul = faculdade.corPrimaria || "#1a3566";
  const corAzulClaro = faculdade.corSecundaria || "#2e7bc4";

  const doc = new PDFDocument({ size: [W, H], margin: 0 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=carterinha_${aluno.matricula}.pdf`,
  );
  doc.pipe(res);

  // ── Fundo branco total ──
  doc.rect(0, 0, W, H).fill("#ffffff");

  // ════════════════════════════════
  // SIDEBAR AZUL
  // ════════════════════════════════
  doc.rect(SB_X, 0, SB_W, H).fill(corAzul);

  // Logo: sigla
  const SB_PAD = 14;
  const SB_IW = SB_W - SB_PAD * 2;

  doc
    .fillColor("#ffffff")
    .fontSize(30)
    .font("Helvetica-Bold")
    .text(faculdade.sigla, SB_X + SB_PAD, 20, {
      width: SB_IW,
      align: "center",
    });

  doc
    .fillColor("rgba(255,255,255,0.5)")
    .fontSize(6.5)
    .font("Helvetica")
    .text(faculdade.nome.toUpperCase(), SB_X + SB_PAD, 56, {
      width: SB_IW,
      align: "center",
    });

  // QR Code: centralizado verticalmente na sidebar, abaixo do logo
  const QR_SIZE = 118;
  const QR_X = SB_X + (SB_W - QR_SIZE) / 2;
  const QR_Y = H / 2 - QR_SIZE / 2 + 14;

  // Moldura branca ao redor do QR
  doc.rect(QR_X - 5, QR_Y - 5, QR_SIZE + 10, QR_SIZE + 10).fill("#ffffff");
  doc.image(qrBuffer, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });

  // Site abaixo do QR
  doc
    .fillColor("rgba(255,255,255,0.72)")
    .fontSize(8)
    .font("Helvetica")
    .text(faculdade.site, SB_X + SB_PAD, QR_Y + QR_SIZE + 10, {
      width: SB_IW,
      align: "center",
    });

  // ════════════════════════════════
  // ÁREA BRANCA — SEÇÃO SUPERIOR
  // ════════════════════════════════

  // Foto: cola no topo e na esquerda, sem margem
  const fotoPath = path.join(
    __dirname,
    "../public/uploads",
    aluno.foto || "default.png",
  );
  if (fs.existsSync(fotoPath) && aluno.foto !== "default.png") {
    doc.save();
    doc.rect(0, 0, PHOTO_W, TOP_H).clip();
    doc.image(fotoPath, 0, 0, { width: PHOTO_W, height: TOP_H });
    doc.restore();
  } else {
    // Placeholder cinza
    doc.rect(0, 0, PHOTO_W, TOP_H).fill("#c8ccd4");
    doc
      .fillColor("#9aa5b4")
      .fontSize(10)
      .font("Helvetica")
      .text("FOTO", 0, TOP_H / 2 - 6, { width: PHOTO_W, align: "center" });
  }

  // Dados ao lado da foto
  let dy = 20;

  // Unidade
  doc
    .fillColor("#555555")
    .fontSize(9)
    .font("Helvetica")
    .text((aluno.unidade || faculdade.cidade).toUpperCase(), DATA_X, dy, {
      width: DATA_W,
    });
  dy += 26;

  // Helper: label pequeno + valor normal
  function campo(label, valor, y) {
    doc
      .fillColor("#888888")
      .fontSize(7)
      .font("Helvetica")
      .text(label, DATA_X, y, { width: DATA_W });
    doc
      .fillColor("#111111")
      .fontSize(12)
      .font("Helvetica")
      .text(valor, DATA_X, y + 11, { width: DATA_W });
    return y + 36;
  }

  dy = campo("CÓDIGO", aluno.matricula, dy);
  dy = campo("IDENTIDADE", aluno.rg || "—", dy);
  campo("VALIDADE", aluno.validade, dy);

  // ════════════════════════════════
  // ÁREA BRANCA — SEÇÃO INFERIOR
  // Nome grande + curso em azul
  // ════════════════════════════════

  // Linha divisória sutil
  doc
    .moveTo(0, TOP_H)
    .lineTo(SB_X, TOP_H)
    .strokeColor("#e0e2e8")
    .lineWidth(0.75)
    .stroke();

  const nameY = TOP_H + 14;

  // Nome em destaque — fonte grande, negrito
  doc
    .fillColor("#111111")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(aluno.nome.toUpperCase(), 16, nameY, { width: SB_X - 24 });

  // Curso em azul, abaixo
  doc
    .fillColor(corAzulClaro)
    .fontSize(12)
    .font("Helvetica")
    .text(aluno.curso.toUpperCase(), 16, nameY + 28, { width: SB_X - 24 });

  doc.end();
}

module.exports = router;
