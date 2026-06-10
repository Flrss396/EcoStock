const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const db = require("./db");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();

// ===== SEGURIDAD =====
app.use(helmet({
  contentSecurityPolicy: false // Desactivado para permitir CDNs del frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 🔐 CLAVE SECRETA — cambia esto por una llave larga y aleatoria en producción
const SECRET = process.env.JWT_SECRET || "cefr paus pefr lffd iaam";

// 🌐 Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 📧 Configuración de correo — ecostocksupport@gmail.com
// IMPORTANTE: En Gmail debes activar "contraseñas de aplicación" en tu cuenta Google
// y poner esa contraseña de app aquí (o en la variable de entorno EMAIL_PASS)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "ecostocksupport@gmail.com",
    pass: process.env.EMAIL_PASS || "cddc nspm yykl lvwk"
  }
});

// ===== TEMPLATE DEL CORREO DE RECUPERACIÓN =====
function getResetEmailHTML(resetLink, email) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Contraseña - EcoStock</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.10);">

          <!-- HEADER VERDE -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a7a3a 0%,#34c759 100%);padding:40px 40px 35px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:42px;height:42px;background:rgba(255,255,255,0.20);border-radius:12px;display:inline-block;line-height:42px;text-align:center;font-size:22px;">🌿</div>
                <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">EcoStock</span>
              </div>
              <p style="color:rgba(255,255,255,0.85);margin:12px 0 0;font-size:14px;letter-spacing:0.3px;">Gestión Inteligente de Inventario</p>
            </td>
          </tr>

          <!-- ÍCONO CANDADO -->
          <tr>
            <td style="text-align:center;padding:36px 40px 10px;">
              <div style="width:72px;height:72px;background:linear-gradient(135deg,#e8f8ee,#c6f0d4);border-radius:50%;display:inline-block;line-height:72px;font-size:34px;margin-bottom:20px;">🔑</div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;">Recuperar Contraseña</h1>
              <p style="margin:12px 0 0;font-size:15px;color:#6e6e73;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a<br>
                <strong style="color:#1d1d1f;">${email}</strong>
              </p>
            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td style="padding:28px 40px 10px;">
              <div style="background:#f5f5f7;border-radius:14px;padding:22px 24px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6e6e73;text-transform:uppercase;letter-spacing:0.5px;">Paso único</p>
                <p style="margin:0;font-size:15px;color:#1d1d1f;line-height:1.6;">
                  Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido por <strong>10 minutos</strong>.
                </p>
              </div>
            </td>
          </tr>

          <!-- BOTÓN -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a7a3a,#34c759);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:14px;letter-spacing:0.2px;box-shadow:0 4px 15px rgba(52,199,89,0.35);">
                      🔒 Restablecer Contraseña
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AVISO SEGURIDAD -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="border:1px solid #ffd60a;background:#fffbeb;border-radius:12px;padding:16px 18px;display:flex;align-items:flex-start;gap:10px;">
                <span style="font-size:18px;flex-shrink:0;">⚠️</span>
                <p style="margin:0;font-size:13px;color:#92681a;line-height:1.6;">
                  Si no solicitaste este cambio, ignora este correo — tu contraseña permanecerá igual. El enlace expirará automáticamente.
                </p>
              </div>
            </td>
          </tr>

          <!-- LINK ALTERNATIVO -->
          <tr>
            <td style="padding:0 40px 30px;">
              <p style="margin:0;font-size:12px;color:#6e6e73;text-align:center;">
                ¿El botón no funciona? Copia y pega este enlace en tu navegador:<br>
                <a href="${resetLink}" style="color:#34c759;word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f5f5f7;border-top:1px solid #e5e5ea;padding:22px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6e6e73;line-height:1.7;">
                © 2025 EcoStock · Gestión de Inventario Sustentable<br>
                <a href="mailto:ecostocksupport@gmail.com" style="color:#34c759;text-decoration:none;font-weight:600;">ecostocksupport@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/* ===== REGISTRO ===== */
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ msg: "Datos inválidos" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users(email,password) VALUES(?,?)",
    [email, hash],
    function (err) {
      if (err) return res.status(500).json({ msg: "Usuario ya existe" });
      res.status(201).json({ msg: "Usuario creado" });
    }
  );
});

/* ===== RECUPERAR CONTRASEÑA (envío de correo) ===== */
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ msg: "Email requerido" });

  db.get("SELECT * FROM users WHERE email=?", [email], (err, user) => {
    if (!user) {
      // Por seguridad respondemos OK aunque no exista el usuario
      return res.json({ msg: "Si el correo existe, recibirás un enlace." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 10; // 10 minutos

    // Borrar tokens anteriores del usuario
    db.run("DELETE FROM password_resets WHERE email=?", [email]);

    db.run(
      "INSERT INTO password_resets(email,token,expires) VALUES(?,?,?)",
      [email, token, expires],
      (err2) => {
        if (err2) return res.status(500).json({ msg: "Error interno" });

        // Detectar dominio (local vs producción)
        const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
        const link = `${baseURL}/reset.html?token=${token}`;

        const mailOptions = {
          from: `"EcoStock" <${process.env.EMAIL_USER || "ecostocksupport@gmail.com"}>`,
          to: email,
          subject: "🔑 Recupera tu contraseña de EcoStock",
          html: getResetEmailHTML(link, email)
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error enviando correo:", error.message);
            return res.status(500).json({ msg: "Error enviando correo. Verifica la configuración." });
          }
          console.log("Correo enviado:", info.messageId);
          res.json({ msg: "Correo enviado. Revisa tu bandeja de entrada." });
        });
      }
    );
  });
});

/* ===== VERIFICAR TOKEN DE RESET ===== */
app.get("/verify-reset-token", (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ valid: false, msg: "Token requerido" });

  db.get("SELECT * FROM password_resets WHERE token=?", [token], (err, reset) => {
    if (!reset) return res.status(400).json({ valid: false, msg: "Token inválido" });
    if (Date.now() > reset.expires) return res.status(400).json({ valid: false, msg: "Token expirado" });
    res.json({ valid: true, email: reset.email });
  });
});

/* ===== RESET PASSWORD ===== */
app.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password || password.length < 6) {
    return res.status(400).json({ msg: "Datos inválidos" });
  }

  db.get("SELECT * FROM password_resets WHERE token=?", [token], async (err, reset) => {
    if (!reset) return res.status(400).json({ msg: "Token inválido" });
    if (Date.now() > reset.expires) return res.status(400).json({ msg: "Token expirado. Solicita uno nuevo." });

    const hash = await bcrypt.hash(password, 10);

    db.run("UPDATE users SET password=? WHERE email=?", [hash, reset.email], (err2) => {
      if (err2) return res.status(500).json({ msg: "Error actualizando contraseña" });

      // Borrar token usado
      db.run("DELETE FROM password_resets WHERE token=?", [token]);
      res.json({ msg: "Contraseña actualizada correctamente" });
    });
  });
});

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "8h" });
    res.json({ token });
  });
});

/* ===== MIDDLEWARE JWT ===== */
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ msg: "Acceso denegado" });

  jwt.verify(token, SECRET, (err, data) => {
    if (err) return res.status(401).json({ msg: "Token inválido" });
    req.user = data;
    next();
  });
}

/* ===== CAMBIAR CONTRASEÑA (autenticado) ===== */
app.post("/change-password", verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user_id = req.user.id;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ msg: "Datos inválidos" });
  }

  db.get("SELECT * FROM users WHERE id=?", [user_id], async (err, user) => {
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ msg: "Contraseña actual incorrecta" });

    const hash = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password=? WHERE id=?", [hash, user_id], (err2) => {
      if (err2) return res.status(500).json({ msg: "Error al actualizar" });
      res.json({ msg: "Contraseña actualizada correctamente" });
    });
  });
});

/* ===== PRODUCTOS ===== */
app.post("/products", verifyToken, (req, res) => {
  const { name, date, status, category } = req.body;
  const user_id = req.user.id;

  if (!name || !date) return res.status(400).json({ msg: "Datos incompletos" });

  db.run(
    "INSERT INTO products(name,date,status,category,user_id) VALUES(?,?,?,?,?)",
    [name, date, status, category || "General", user_id],
    function (err) {
      if (err) return res.status(500).json({ msg: "Error guardando" });
      res.json({ msg: "Producto guardado", id: this.lastID });
    }
  );
});

app.get("/products", verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM products WHERE user_id=? ORDER BY date ASC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ msg: "Error" });
      res.json(rows);
    }
  );
});

app.put("/products/:id", verifyToken, (req, res) => {
  const { name, date, status, category } = req.body;
  db.run(
    "UPDATE products SET name=?,date=?,status=?,category=? WHERE id=? AND user_id=?",
    [name, date, status, category || "General", req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ msg: "Error actualizando" });
      res.json({ msg: "Producto actualizado" });
    }
  );
});

app.delete("/products/:id", verifyToken, (req, res) => {
  db.run(
    "DELETE FROM products WHERE id=? AND user_id=?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ msg: "Error" });
      res.json({ msg: "Eliminado" });
    }
  );
});

/* ===== ESTADÍSTICAS ===== */
app.get("/stats", verifyToken, (req, res) => {
  db.all("SELECT * FROM products WHERE user_id=?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: "Error" });
    
    const stats = {
      total: rows.length,
      safe: rows.filter(p => p.status === "Seguro").length,
      warning: rows.filter(p => p.status === "Próximo a vencer").length,
      expired: rows.filter(p => p.status === "Vencido").length,
      byCategory: {}
    };

    rows.forEach(p => {
      const cat = p.category || "General";
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    res.json(stats);
  });
});

/* ===== SERVIDOR ===== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌿 EcoStock corriendo en http://localhost:${PORT}`);
});
