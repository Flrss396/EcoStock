const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const db = require("./db");
const path = require("path");
const crypto = require("crypto");

const app = express();

// ===== SEGURIDAD =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SECRET = process.env.JWT_SECRET || "dev_secret_change_in_production_2025";
const PORT   = process.env.PORT || 8080;

// ===== RATE LIMITING SIMPLE (sin dependencia extra) =====
const rateLimitMap = new Map();
function rateLimit(key, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count > maxRequests;
}

// ===== NODEMAILER — TRANSPORTER DINÁMICO =====
// Funciona en local y en Railway/producción sin cambios
// ===== ENVÍO DE CORREO VÍA RESEND (HTTP — funciona en Railway) =====
async function sendResetEmail(toEmail, resetLink) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurado en Railway.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "EcoStock <onboarding@resend.dev>",
      to: toEmail,
      subject: "🔑 Recupera tu contraseña de EcoStock",
      html: getResetEmailHTML(resetLink, toEmail)
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error en Resend API");
  }
  return await res.json();
}

// ===== TEMPLATE DEL CORREO =====
function getResetEmailHTML(resetLink, email) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Recuperar Contraseña - EcoStock</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.10);">
        <tr><td style="background:linear-gradient(135deg,#1a7a3a 0%,#34c759 100%);padding:40px 40px 35px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;background:rgba(255,255,255,0.20);border-radius:12px;display:inline-block;line-height:42px;text-align:center;font-size:22px;">🌿</div>
            <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">EcoStock</span>
          </div>
          <p style="color:rgba(255,255,255,0.85);margin:12px 0 0;font-size:14px;">Gestión Inteligente de Inventario</p>
        </td></tr>
        <tr><td style="text-align:center;padding:36px 40px 10px;">
          <div style="width:72px;height:72px;background:linear-gradient(135deg,#e8f8ee,#c6f0d4);border-radius:50%;display:inline-block;line-height:72px;font-size:34px;margin-bottom:20px;">🔑</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1d1d1f;">Recuperar Contraseña</h1>
          <p style="margin:12px 0 0;font-size:15px;color:#6e6e73;line-height:1.6;">Solicitud recibida para la cuenta: <strong style="color:#1d1d1f;">${email}</strong></p>
        </td></tr>
        <tr><td style="padding:28px 40px 10px;">
          <div style="background:#f5f5f7;border-radius:14px;padding:22px 24px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6e6e73;text-transform:uppercase;letter-spacing:0.5px;">Paso único</p>
            <p style="margin:0;font-size:15px;color:#1d1d1f;line-height:1.6;">Haz clic en el botón para crear una nueva contraseña. El enlace es válido por <strong>10 minutos</strong>.</p>
          </div>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a7a3a,#34c759);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:14px;box-shadow:0 4px 15px rgba(52,199,89,0.35);">
              🔒 Restablecer Contraseña
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 40px 30px;">
          <div style="border:1px solid #ffd60a;background:#fffbeb;border-radius:12px;padding:16px 18px;">
            <p style="margin:0;font-size:13px;color:#92681a;line-height:1.6;">⚠️ Si no solicitaste este cambio, ignora este correo. El enlace expirará automáticamente.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 30px;">
          <p style="margin:0;font-size:12px;color:#6e6e73;text-align:center;">
            ¿El botón no funciona? Copia este enlace:<br>
            <a href="${resetLink}" style="color:#34c759;word-break:break-all;font-size:11px;">${resetLink}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f5f5f7;border-top:1px solid #e5e5ea;padding:22px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6e6e73;line-height:1.7;">
            © 2025 EcoStock · Gestión de Inventario Sustentable<br>
            <a href="mailto:ecostocksupport@gmail.com" style="color:#34c759;text-decoration:none;font-weight:600;">ecostocksupport@gmail.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ===== PÁGINAS =====
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/reset.html", (req, res) => res.sendFile(path.join(__dirname, "reset.html")));

// ===== HEALTH CHECK (Railway lo usa) =====
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

/* ===== REGISTRO ===== */
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6)
    return res.status(400).json({ msg: "Datos inválidos. La contraseña debe tener al menos 6 caracteres." });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ msg: "El correo no es válido." });

  const hash = await bcrypt.hash(password, 12);
  db.run("INSERT INTO users(email,password) VALUES(?,?)", [email.toLowerCase().trim(), hash], function(err) {
    if (err) return res.status(409).json({ msg: "Ese correo ya está registrado." });
    res.status(201).json({ msg: "Cuenta creada correctamente." });
  });
});

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (rateLimit(`login:${ip}`, 10, 15 * 60 * 1000))
    return res.status(429).json({ msg: "Demasiados intentos. Espera 15 minutos." });

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ msg: "Completa todos los campos." });

  db.get("SELECT * FROM users WHERE email=?", [email.toLowerCase().trim()], async (err, user) => {
    if (!user) return res.status(404).json({ msg: "Correo no encontrado." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Contraseña incorrecta." });
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "8h" });
    res.json({ token, email: user.email });
  });
});

/* ===== RECUPERAR CONTRASEÑA ===== */
app.post("/forgot-password", (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (rateLimit(`forgot:${ip}`, 3, 60 * 60 * 1000))
    return res.status(429).json({ msg: "Demasiadas solicitudes. Espera 1 hora." });

  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: "Email requerido." });

  db.get("SELECT * FROM users WHERE email=?", [email.toLowerCase().trim()], (err, user) => {
    // Responder siempre OK por seguridad (no revelar si el email existe)
    if (!user) return res.json({ msg: "Si el correo existe, recibirás un enlace en los próximos minutos." });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 10; // 10 minutos

    db.run("DELETE FROM password_resets WHERE email=?", [email]);
    db.run("INSERT INTO password_resets(email,token,expires) VALUES(?,?,?)", [email, token, expires], (err2) => {
      if (err2) return res.status(500).json({ msg: "Error interno. Intenta de nuevo." });

      const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
      const link = `${baseURL}/reset.html?token=${token}`;

      sendResetEmail(email, link)
        .then((info) => {
          console.log("✅ Correo enviado via Resend:", info.id);
          res.json({ msg: "Correo enviado. Revisa tu bandeja (y spam por si acaso)." });
        })
        .catch((error) => {
          console.error("❌ Error enviando correo:", error.message);
          res.status(500).json({ msg: "Error enviando correo: " + error.message });
        });
    });
  });
});

/* ===== VERIFICAR TOKEN ===== */
app.get("/verify-reset-token", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, msg: "Token requerido." });
  db.get("SELECT * FROM password_resets WHERE token=?", [token], (err, reset) => {
    if (!reset) return res.status(400).json({ valid: false, msg: "Enlace inválido." });
    if (Date.now() > reset.expires) return res.status(400).json({ valid: false, msg: "Enlace expirado." });
    res.json({ valid: true, email: reset.email });
  });
});

/* ===== RESET PASSWORD ===== */
app.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6)
    return res.status(400).json({ msg: "Datos inválidos." });

  db.get("SELECT * FROM password_resets WHERE token=?", [token], async (err, reset) => {
    if (!reset) return res.status(400).json({ msg: "Enlace inválido." });
    if (Date.now() > reset.expires) return res.status(400).json({ msg: "Enlace expirado. Solicita uno nuevo." });

    const hash = await bcrypt.hash(password, 12);
    db.run("UPDATE users SET password=? WHERE email=?", [hash, reset.email], (err2) => {
      if (err2) return res.status(500).json({ msg: "Error actualizando contraseña." });
      db.run("DELETE FROM password_resets WHERE token=?", [token]);
      res.json({ msg: "Contraseña actualizada correctamente." });
    });
  });
});

/* ===== MIDDLEWARE JWT ===== */
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ msg: "Acceso denegado." });
  jwt.verify(token, SECRET, (err, data) => {
    if (err) return res.status(401).json({ msg: "Sesión expirada. Inicia sesión de nuevo." });
    req.user = data;
    next();
  });
}

/* ===== CAMBIAR CONTRASEÑA (autenticado) ===== */
app.post("/change-password", verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ msg: "Datos inválidos." });

  db.get("SELECT * FROM users WHERE id=?", [req.user.id], async (err, user) => {
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado." });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ msg: "Contraseña actual incorrecta." });
    const hash = await bcrypt.hash(newPassword, 12);
    db.run("UPDATE users SET password=? WHERE id=?", [hash, req.user.id], (err2) => {
      if (err2) return res.status(500).json({ msg: "Error al actualizar." });
      res.json({ msg: "Contraseña actualizada correctamente." });
    });
  });
});

/* ===== PRODUCTOS ===== */
app.post("/products", verifyToken, (req, res) => {
  const { name, date, status, category } = req.body;
  const user_id = req.user.id;
  if (!name || !date) return res.status(400).json({ msg: "Nombre y fecha son requeridos." });
  db.run(
    "INSERT INTO products(name,date,status,category,user_id) VALUES(?,?,?,?,?)",
    [name.trim(), date, status, category || "General", user_id],
    function(err) {
      if (err) return res.status(500).json({ msg: "Error guardando producto." });
      res.json({ msg: "Producto guardado", id: this.lastID });
    }
  );
});

app.get("/products", verifyToken, (req, res) => {
  db.all("SELECT * FROM products WHERE user_id=? ORDER BY date ASC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: "Error." });
    res.json(rows);
  });
});

app.put("/products/:id", verifyToken, (req, res) => {
  const { name, date, status, category } = req.body;
  db.run(
    "UPDATE products SET name=?,date=?,status=?,category=? WHERE id=? AND user_id=?",
    [name, date, status, category || "General", req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ msg: "Error actualizando." });
      res.json({ msg: "Producto actualizado." });
    }
  );
});

app.delete("/products/:id", verifyToken, (req, res) => {
  db.run("DELETE FROM products WHERE id=? AND user_id=?", [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ msg: "Error." });
    res.json({ msg: "Eliminado." });
  });
});

/* ===== ESTADÍSTICAS ===== */
app.get("/stats", verifyToken, (req, res) => {
  db.all("SELECT * FROM products WHERE user_id=?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ msg: "Error." });
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

/* ===== CLIMA (proxy seguro — la API key queda en el servidor) ===== */
app.get("/weather", verifyToken, async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ msg: "Ciudad requerida." });

  const apiKey = process.env.OPENWEATHER_KEY;
  if (!apiKey) return res.status(500).json({ msg: "OPENWEATHER_KEY no configurada en el servidor." });

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(404).json({ msg: "Ciudad no encontrada." });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Error consultando OpenWeather." });
  }
});

/* ===== SERVIDOR ===== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌿 EcoStock corriendo en http://localhost:${PORT}`);
  console.log(`📧 Email configurado: ${process.env.EMAIL_USER || "ecostocksupport@gmail.com"}`);
console.log(`🔑 EMAIL_PASS: ${process.env.EMAIL_PASS ? "✅ Configurado" : "❌ NO configurado"}`);
  console.log(`🌐 BASE_URL: ${process.env.BASE_URL || "(local)"}`);
});