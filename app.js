/* ===== ECOSTOCK APP LOGIC v2.1 ===== */

const API_BASE = "";

let currentState = {
    user: null,
    inventory: []
};

let inventoryChart = null;
let categoryChart = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
    initTheme();
    setupMobile();
    setupMinDate();
});

// ===== FECHA MÍNIMA (+5 días desde hoy) =====
function setupMinDate() {
    const dateInput = document.getElementById("prodDate");
    if (!dateInput) return;
    const min = new Date();
    min.setDate(min.getDate() + 5);
    dateInput.min = min.toISOString().split("T")[0];
}

// ===== DETECCIÓN AUTOMÁTICA DE CATEGORÍA =====
const CATEGORY_KEYWORDS = {
    "Frutas y Verduras": ["manzana","pera","naranja","platano","plátano","banana","uva","fresa","mango","papaya","melon","melón","sandía","sandia","kiwi","durazno","ciruela","cereza","piña","pina","limon","limón","tomate","jitomate","zanahoria","lechuga","espinaca","brócoli","brocoli","coliflor","cebolla","ajo","pepino","calabaza","chayote","ejote","chile","pimiento","aguacate","verdura","fruta","vegetal"],
    "Lácteos": ["leche","yogurt","yogur","queso","mantequilla","crema","jocoque","natilla","lácteo","lacteo","danonino","lala","alpura"],
    "Carnes": ["pollo","res","cerdo","puerco","carne","bistec","milanesa","chuleta","tocino","salchicha","jamón","jamon","chorizo","pescado","atún","atun","camarón","camaron","mariscos","salmon","salmón","sardina","pavo","cordero"],
    "Bebidas": ["jugo","refresco","té","te","cafe","café","cerveza","vino","bebida","licuado","smoothie","coca","pepsi","fanta","sprite"],
    "Panadería": ["pan","tortilla","galleta","pastel","dona","donut","croissant","bagel","muffin","bizcocho","bolillo","telera","baguette","waffles","hotcakes"],
    "Congelados": ["helado","nieve","paleta","congelado","frozen","nuggets"],
    "Medicamentos": ["medicina","medicamento","pastilla","capsula","cápsula","jarabe","vitamina","ibuprofeno","paracetamol","aspirina","antibiótico","antibiotico","suplemento"],
    "Limpieza": ["detergente","jabón","jabon","cloro","pinol","fabuloso","ajax","limpiador","desinfectante","shampoo","champú","acondicionador","suavizante","ariel","persil"]
};

function detectCategory(name) {
    const lower = name.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            return category;
        }
    }
    return null;
}

function onProductNameInput() {
    const name = document.getElementById("prodName").value.trim();
    const select = document.getElementById("prodCategory");
    if (!select) return;
    const detected = detectCategory(name);
    if (detected) {
        select.value = detected;
        select.style.borderColor = "var(--success)";
        select.title = "Categoría detectada automáticamente";
    } else {
        select.style.borderColor = "";
        select.title = "";
    }
}

function setupMobile() {
    const hamburger = document.getElementById('hamburgerBtn');
    if (!hamburger) return;
    function checkWidth() {
        if (window.innerWidth <= 768) {
            hamburger.style.display = 'block';
        } else {
            hamburger.style.display = 'none';
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.style.display = 'none';
        }
    }
    checkWidth();
    window.addEventListener('resize', checkWidth);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.style.display = isOpen ? 'block' : 'none';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const toggle = document.getElementById('darkModeToggle');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.checked = true;
    }
    if (toggle) {
        toggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (inventoryChart) renderAnalyticsCharts();
        });
    }
}

function checkSession() {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    if (token && email) {
        currentState.user = { email, token };
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
    if (window.gsap) gsap.from(".login-card", { duration: 0.8, y: 40, opacity: 0, ease: "power4.out" });
}

function showApp() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appContainer").style.display = "flex";
    document.getElementById("userEmail").textContent = currentState.user.email;
    navigate('home');
    if (window.gsap) {
        gsap.from(".sidebar", { duration: 0.7, x: -80, opacity: 0, ease: "power3.out" });
        gsap.from(".main-content", { duration: 0.7, y: 20, opacity: 0, delay: 0.2, ease: "power3.out" });
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const section = e.currentTarget.getAttribute('data-section');
            if (section) {
                navigate(section);
                if (window.innerWidth <= 768) toggleSidebar();
            }
        });
    });
}

function navigate(sectionId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
    });
    document.querySelectorAll('.app-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        if (window.gsap) {
            gsap.from(target.children, { duration: 0.5, y: 16, opacity: 0, stagger: 0.08, ease: "power2.out" });
        }
        if (['inventory', 'home', 'analytics'].includes(sectionId)) loadInventory();
        if (sectionId === 'inventory') setupMinDate();
    }
}

/* ===== AUTH ===== */

function toggleAuthMode(mode) {
    ['loginForm', 'registerForm', 'forgotForm'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = 'none';
    });
    const map = { register: 'registerForm', forgot: 'forgotForm' };
    const target = map[mode] || 'loginForm';
    const el = document.getElementById(target);
    if (el) el.style.display = 'block';
    const loginError = document.getElementById('loginError');
    if (loginError) loginError.textContent = '';
    const forgotMsg = document.getElementById('forgotMsg');
    if (forgotMsg) forgotMsg.textContent = '';
    if (window.gsap) gsap.from(".login-card", { opacity: 0, scale: 0.97, duration: 0.35, ease: 'back.out(1.4)' });
}

function showForgotPassword() { toggleAuthMode('forgot'); }

async function sendForgotPassword() {
    const email = document.getElementById("forgotEmail").value.trim();
    const btn = document.getElementById("forgotBtn");
    const msgEl = document.getElementById("forgotMsg");

    if (!email) {
        msgEl.style.color = "var(--danger)";
        msgEl.textContent = "Por favor ingresa tu correo.";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Enviando...";
    msgEl.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        msgEl.style.color = res.ok ? "var(--success)" : "var(--danger)";
        msgEl.textContent = (res.ok ? "✅ " : "⚠️ ") + data.msg;
        if (res.ok) {
            btn.textContent = "Correo enviado ✓";
        } else {
            btn.disabled = false;
            btn.textContent = "Enviar enlace";
        }
    } catch (error) {
        msgEl.style.color = "var(--danger)";
        msgEl.textContent = "⚠️ Error de conexión.";
        btn.disabled = false;
        btn.textContent = "Enviar enlace";
    }
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");

    if (!email || !password) {
        showToast("Por favor completa todos los campos", "danger");
        return;
    }
    errorEl.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("email", email);
            currentState.user = { email, token: data.token };
            showApp();
        } else {
            errorEl.textContent = data.msg;
            if (window.gsap) gsap.to(".login-card", { x: 8, duration: 0.08, repeat: 5, yoyo: true });
        }
    } catch (error) {
        showToast("Error de conexión", "danger");
    }
}

async function register() {
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    if (!email || !password) {
        showToast("Por favor completa todos los campos", "danger");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("¡Registro exitoso! Inicia sesión.", "success");
            toggleAuthMode('login');
        } else {
            showToast(data.msg, "danger");
        }
    } catch (error) {
        showToast("Error en el registro", "danger");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    location.reload();
}

async function changePassword() {
    const currentPassword = document.getElementById("currentPass").value;
    const newPassword = document.getElementById("newPass").value;
    const token = localStorage.getItem("token");

    if (!currentPassword || !newPassword) { showToast("Completa ambos campos", "warning"); return; }
    if (newPassword.length < 6) { showToast("La contraseña debe tener al menos 6 caracteres", "warning"); return; }

    try {
        const res = await fetch(`${API_BASE}/change-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "authorization": token },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.msg, "success");
            document.getElementById("currentPass").value = "";
            document.getElementById("newPass").value = "";
        } else {
            showToast(data.msg, "danger");
        }
    } catch (error) {
        showToast("Error de conexión", "danger");
    }
}

/* ===== INVENTORY ===== */

async function loadInventory() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/products`, { headers: { "authorization": token } });
        if (res.status === 401) return logout();
        const data = await res.json();
        currentState.inventory = data;
        renderInventory(data);
        updateDashboard();
        if (document.getElementById('analytics').style.display !== 'none') {
            renderAnalyticsCharts();
            renderUpcoming();
        }
    } catch (error) {
        console.error(error);
    }
}

function getDaysUntilExpiry(dateStr) {
    const expiry = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function computeStatus(dateStr) {
    const diff = getDaysUntilExpiry(dateStr);
    if (diff < 0) return "Vencido";
    if (diff <= 3) return "Próximo a vencer";
    return "Seguro";
}

function updateDashboard() {
    const inv = currentState.inventory;
    const total = inv.length;
    const expired = inv.filter(p => p.status === "Vencido").length;
    const upcoming = inv.filter(p => p.status === "Próximo a vencer").length;
    const safe = inv.filter(p => p.status === "Seguro").length;

    document.getElementById("totalStock").textContent = total;
    document.getElementById("expiredCount").textContent = expired;
    document.getElementById("warningCount").textContent = upcoming;

    const alertEl = document.getElementById("stockAlert");
    if (expired > 0) {
        alertEl.innerHTML = `⚠️ <strong>${expired} producto${expired > 1 ? 's' : ''} vencido${expired > 1 ? 's' : ''}</strong>. Retíralos del inventario.`;
        alertEl.style.color = "var(--danger)";
    } else if (upcoming > 0) {
        alertEl.innerHTML = `⏳ <strong>${upcoming} producto${upcoming > 1 ? 's' : ''}</strong> próximo${upcoming > 1 ? 's' : ''} a vencer en los próximos 3 días.`;
        alertEl.style.color = "var(--warning)";
    } else if (total === 0) {
        alertEl.textContent = "Sin productos registrados. ¡Agrega tu primer producto!";
        alertEl.style.color = "var(--text-secondary)";
    } else {
        alertEl.textContent = "✅ Todo el inventario está al día. ¡Excelente!";
        alertEl.style.color = "var(--success)";
    }

    const efficiency = total > 0 ? Math.round((safe / total) * 100) : 0;
    document.getElementById("efficiencyRate").textContent = `${efficiency}%`;
    const statusEl = document.getElementById("efficiencyStatus");
    if (efficiency >= 80) { statusEl.textContent = "Eficiencia: Excelente"; statusEl.style.color = "var(--success)"; }
    else if (efficiency >= 50) { statusEl.textContent = "Eficiencia: Buena"; statusEl.style.color = "var(--accent)"; }
    else { statusEl.textContent = "Eficiencia: Crítica"; statusEl.style.color = "var(--danger)"; }
}

function renderInventory(products) {
    const body = document.getElementById("inventoryBody");
    body.innerHTML = "";

    if (products.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:40px;">Sin productos. Agrega el primero arriba. 📦</td></tr>`;
        document.getElementById("inventoryCount").textContent = "";
        return;
    }

    products.forEach(p => {
        const tr = document.createElement("tr");
        const days = getDaysUntilExpiry(p.date);
        let statusClass = "status-safe";
        if (p.status === "Vencido") statusClass = "status-danger";
        else if (p.status === "Próximo a vencer") statusClass = "status-warning";

        let daysText = "";
        if (days < 0) daysText = `<span style="color:var(--danger);font-weight:600;">${Math.abs(days)}d vencido</span>`;
        else if (days === 0) daysText = `<span style="color:var(--warning);font-weight:600;">Hoy</span>`;
        else if (days <= 3) daysText = `<span style="color:var(--warning);font-weight:600;">${days}d</span>`;
        else daysText = `<span style="color:var(--text-secondary);">${days}d</span>`;

        const category = p.category || "General";
        tr.innerHTML = `
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td><span style="font-size:12px;padding:4px 10px;background:rgba(0,113,227,0.08);color:var(--accent);border-radius:20px;font-weight:500;">${escapeHtml(category)}</span></td>
            <td>${p.date}</td>
            <td>${daysText}</td>
            <td><span class="status-pill ${statusClass}">${p.status}</span></td>
            <td><button onclick="deleteProduct(${p.id})" style="padding:6px 12px;background:rgba(255,59,48,0.08);color:var(--danger);font-size:13px;border-radius:8px;font-weight:600;">Eliminar</button></td>
        `;
        body.appendChild(tr);
    });

    document.getElementById("inventoryCount").textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function filterInventory() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const statusFilter = document.getElementById("filterStatus").value;
    const filtered = currentState.inventory.filter(p => {
        const matchName = p.name.toLowerCase().includes(search) || (p.category || '').toLowerCase().includes(search);
        const matchStatus = !statusFilter || p.status === statusFilter;
        return matchName && matchStatus;
    });
    renderInventory(filtered);
}

/* ===== EXPORT PDF PROFESIONAL ===== */
function exportPDF() {
    const inv = currentState.inventory;
    if (inv.length === 0) {
        showToast("No hay productos para exportar", "warning");
        return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const fileName = `ecostock_inventario_${today.toISOString().slice(0,10)}.pdf`;

    const total   = inv.length;
    const safe    = inv.filter(p => p.status === "Seguro").length;
    const warning = inv.filter(p => p.status === "Próximo a vencer").length;
    const expired = inv.filter(p => p.status === "Vencido").length;
    const efficiency = total > 0 ? Math.round((safe / total) * 100) : 0;

    // Agrupar por categoría
    const byCat = {};
    inv.forEach(p => {
        const cat = p.category || "General";
        byCat[cat] = (byCat[cat] || 0) + 1;
    });
    const catRows = Object.entries(byCat).map(([c, n]) =>
        `<tr><td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;">${c}</td><td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${n}</td></tr>`
    ).join('');

    // Filas de inventario
    const productRows = [...inv]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(p => {
            const days = getDaysUntilExpiry(p.date);
            let statusColor = '#34c759'; let statusBg = '#e8faf0';
            if (p.status === 'Vencido') { statusColor = '#ff3b30'; statusBg = '#fff0ee'; }
            else if (p.status === 'Próximo a vencer') { statusColor = '#ff9500'; statusBg = '#fff8ee'; }
            let daysLabel = days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? 'Hoy' : `${days} días`;
            return `
            <tr style="border-bottom:1px solid #f5f5f7;">
                <td style="padding:10px 14px;font-weight:600;color:#1d1d1f;">${p.name}</td>
                <td style="padding:10px 14px;color:#6e6e73;font-size:13px;">${p.category || 'General'}</td>
                <td style="padding:10px 14px;font-size:13px;">${p.date}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:600;color:${days < 0 ? '#ff3b30' : days <= 3 ? '#ff9500' : '#6e6e73'};">${daysLabel}</td>
                <td style="padding:10px 14px;"><span style="background:${statusBg};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">${p.status}</span></td>
            </tr>`;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>EcoStock — Reporte de Inventario</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background:#fff; color:#1d1d1f; }
  @page { margin: 0; size: A4; }
  @media print {
    .no-print { display:none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  /* COVER HEADER */
  .cover {
    background: linear-gradient(135deg, #0d4f24 0%, #1a7a3a 50%, #34c759 100%);
    padding: 48px 56px 40px;
    color: white;
  }
  .cover-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .logo { display:flex; align-items:center; gap:14px; }
  .logo-icon { width:52px; height:52px; background:rgba(255,255,255,0.2); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; }
  .logo-text { font-size:28px; font-weight:800; letter-spacing:-0.5px; }
  .logo-sub { font-size:13px; opacity:0.75; margin-top:2px; }
  .cover-date { font-size:13px; opacity:0.8; text-align:right; }
  .cover-title { margin-top:32px; }
  .cover-title h1 { font-size:36px; font-weight:800; letter-spacing:-1px; }
  .cover-title p { opacity:0.8; margin-top:6px; font-size:15px; }

  /* SUMMARY CARDS */
  .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; padding:32px 56px 0; }
  .s-card { background:#f8f8fa; border-radius:16px; padding:20px 18px; }
  .s-num { font-size:36px; font-weight:800; letter-spacing:-1px; }
  .s-label { font-size:12px; font-weight:600; color:#6e6e73; text-transform:uppercase; letter-spacing:0.4px; margin-top:4px; }
  .s-total .s-num  { color:#1d1d1f; }
  .s-safe .s-num   { color:#34c759; }
  .s-warn .s-num   { color:#ff9500; }
  .s-exp  .s-num   { color:#ff3b30; }

  /* PROGRESS BAR */
  .progress-section { padding:28px 56px 0; }
  .progress-label { display:flex; justify-content:space-between; font-size:13px; font-weight:600; color:#6e6e73; margin-bottom:8px; }
  .progress-bar { height:10px; background:#e5e5ea; border-radius:10px; overflow:hidden; display:flex; }
  .pb-safe  { background:#34c759; }
  .pb-warn  { background:#ff9500; }
  .pb-exp   { background:#ff3b30; }

  /* SECTIONS */
  .section { padding:32px 56px 0; }
  .section-title { font-size:18px; font-weight:700; color:#1d1d1f; margin-bottom:16px; padding-bottom:10px; border-bottom:2px solid #f0f0f0; display:flex; align-items:center; gap:8px; }

  /* CATEGORIES */
  .cat-table { width:100%; border-collapse:collapse; }
  .cat-table th { text-align:left; padding:10px 16px; font-size:12px; font-weight:700; color:#6e6e73; text-transform:uppercase; letter-spacing:0.4px; background:#f8f8fa; }
  .cat-table th:last-child { text-align:right; }

  /* MAIN TABLE */
  .inv-table { width:100%; border-collapse:collapse; }
  .inv-table th { text-align:left; padding:10px 14px; font-size:11px; font-weight:700; color:#6e6e73; text-transform:uppercase; letter-spacing:0.5px; background:#f8f8fa; }
  .inv-table tr:last-child td { border-bottom:none; }

  /* FOOTER */
  .footer { margin-top:40px; padding:20px 56px; background:#f8f8fa; border-top:1px solid #e5e5ea; display:flex; justify-content:space-between; align-items:center; }
  .footer-left { font-size:12px; color:#6e6e73; }
  .footer-right { font-size:12px; color:#6e6e73; text-align:right; }
  .efficiency-badge { display:inline-block; background:${efficiency >= 80 ? '#e8faf0' : efficiency >= 50 ? '#fff8ee' : '#fff0ee'}; color:${efficiency >= 80 ? '#1a7a3a' : efficiency >= 50 ? '#c47300' : '#c0392b'}; padding:6px 16px; border-radius:20px; font-weight:700; font-size:14px; }

  /* PRINT BUTTON */
  .print-btn {
    position:fixed; top:24px; right:24px;
    background:linear-gradient(135deg,#1a7a3a,#34c759);
    color:white; border:none; padding:14px 28px;
    border-radius:14px; font-size:15px; font-weight:700;
    cursor:pointer; box-shadow:0 4px 20px rgba(52,199,89,0.4);
    z-index:99;
  }
  .print-btn:hover { opacity:0.92; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

<!-- HEADER COVER -->
<div class="cover">
  <div class="cover-top">
    <div class="logo">
      <div class="logo-icon">🌿</div>
      <div>
        <div class="logo-text">EcoStock</div>
        <div class="logo-sub">Gestión Inteligente de Inventario</div>
      </div>
    </div>
    <div class="cover-date">
      <div style="font-size:11px;opacity:0.7;margin-bottom:2px;">GENERADO EL</div>
      <div style="font-weight:600;">${dateStr}</div>
      <div style="margin-top:12px;"><span class="efficiency-badge" style="background:rgba(255,255,255,0.2);color:white;">Eficiencia: ${efficiency}%</span></div>
    </div>
  </div>
  <div class="cover-title">
    <h1>Reporte de Inventario</h1>
    <p>Resumen completo del estado actual de todos los productos registrados.</p>
  </div>
</div>

<!-- STAT CARDS -->
<div class="summary">
  <div class="s-card s-total"><div class="s-num">${total}</div><div class="s-label">Total productos</div></div>
  <div class="s-card s-safe"><div class="s-num">${safe}</div><div class="s-label">En buen estado</div></div>
  <div class="s-card s-warn"><div class="s-num">${warning}</div><div class="s-label">Próximos a vencer</div></div>
  <div class="s-card s-exp"><div class="s-num">${expired}</div><div class="s-label">Vencidos</div></div>
</div>

<!-- PROGRESS BAR -->
<div class="progress-section">
  <div class="progress-label"><span>Distribución del inventario</span><span>${efficiency}% en buen estado</span></div>
  <div class="progress-bar">
    <div class="pb-safe"  style="width:${total > 0 ? (safe/total*100).toFixed(1) : 0}%"></div>
    <div class="pb-warn"  style="width:${total > 0 ? (warning/total*100).toFixed(1) : 0}%"></div>
    <div class="pb-exp"   style="width:${total > 0 ? (expired/total*100).toFixed(1) : 0}%"></div>
  </div>
  <div style="display:flex;gap:20px;margin-top:8px;font-size:12px;color:#6e6e73;">
    <span>🟢 Seguro (${safe})</span>
    <span>🟠 Próximo a vencer (${warning})</span>
    <span>🔴 Vencido (${expired})</span>
  </div>
</div>

<!-- CATEGORÍAS -->
<div class="section">
  <div class="section-title">📂 Por Categoría</div>
  <table class="cat-table">
    <thead><tr><th>Categoría</th><th style="text-align:right;">Cantidad</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>
</div>

<!-- INVENTARIO COMPLETO -->
<div class="section" style="padding-bottom:40px;">
  <div class="section-title">📦 Inventario Completo <span style="font-size:14px;font-weight:400;color:#6e6e73;">(${total} productos · ordenados por fecha)</span></div>
  <table class="inv-table">
    <thead>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Fecha vencimiento</th>
        <th>Días restantes</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${productRows}</tbody>
  </table>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-left">
    <strong>EcoStock</strong> · Gestión de Inventario Sustentable<br>
    ecostocksupport@gmail.com
  </div>
  <div class="footer-right">
    Reporte generado el ${dateStr}<br>
    <strong>${total} productos</strong> registrados
  </div>
</div>

</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
        showToast("Permite las ventanas emergentes para exportar el PDF", "warning");
        return;
    }
    win.document.write(html);
    win.document.close();
    showToast("Reporte PDF listo — usa Ctrl+P para guardarlo", "success");
}

async function addProduct() {
    const name = document.getElementById("prodName").value.trim();
    const date = document.getElementById("prodDate").value;
    const category = document.getElementById("prodCategory").value;
    const token = localStorage.getItem("token");

    if (!name || !date) { showToast("Completa nombre y fecha", "warning"); return; }

    // Validar fecha mínima (+5 días)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 5);
    minDate.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date + "T00:00:00");
    if (selectedDate < minDate) {
        showToast("La fecha debe ser al menos 5 días a partir de hoy", "warning");
        return;
    }

    // Si no se detectó categoría, pedir que elija
    if (!category || category === "General") {
        const detected = detectCategory(name);
        if (!detected) {
            showToast("Por favor selecciona una categoría manualmente", "warning");
            document.getElementById("prodCategory").focus();
            document.getElementById("prodCategory").style.borderColor = "var(--warning)";
            setTimeout(() => document.getElementById("prodCategory").style.borderColor = "", 2000);
            return;
        }
    }

    const status = computeStatus(date);

    try {
        const res = await fetch(`${API_BASE}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "authorization": token },
            body: JSON.stringify({ name, date, status, category })
        });
        if (res.ok) {
            document.getElementById("prodName").value = "";
            document.getElementById("prodDate").value = "";
            loadInventory();
            showToast(`"${name}" agregado correctamente`, "success");
        } else {
            const data = await res.json();
            showToast(data.msg || "Error al guardar", "danger");
        }
    } catch (error) {
        showToast("Error de conexión", "danger");
    }
}

async function deleteProduct(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: "DELETE",
            headers: { "authorization": token }
        });
        if (res.ok) {
            loadInventory();
            showToast("Producto eliminado", "success");
        }
    } catch (error) {
        showToast("Error al eliminar", "danger");
    }
}

/* ===== ANALYTICS ===== */

function renderAnalyticsCharts() {
    renderStatusChart();
    renderCategoryChart();
    renderUpcoming();
}

function renderStatusChart() {
    const ctx = document.getElementById('inventoryChart');
    if (!ctx) return;
    const stats = {
        "Seguro": currentState.inventory.filter(p => p.status === "Seguro").length,
        "Próximo a vencer": currentState.inventory.filter(p => p.status === "Próximo a vencer").length,
        "Vencido": currentState.inventory.filter(p => p.status === "Vencido").length
    };
    if (inventoryChart) inventoryChart.destroy();
    inventoryChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Seguro', 'Próximo a vencer', 'Vencido'],
            datasets: [{
                data: [stats["Seguro"], stats["Próximo a vencer"], stats["Vencido"]],
                backgroundColor: ['rgba(52,199,89,0.8)', 'rgba(255,149,0,0.8)', 'rgba(255,59,48,0.8)'],
                borderColor: ['#34c759', '#ff9500', '#ff3b30'],
                borderWidth: 2, hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 20, font: { size: 13 } } } },
            cutout: '65%'
        }
    });
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    const byCat = {};
    currentState.inventory.forEach(p => {
        const cat = p.category || "General";
        byCat[cat] = (byCat[cat] || 0) + 1;
    });
    const labels = Object.keys(byCat);
    const values = Object.values(byCat);
    const colors = ['#0071e3','#34c759','#ff9500','#ff3b30','#af52de','#5ac8fa','#ffcc00','#ff2d55','#30d158'];
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Productos', data: values,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'CC'),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1.5, borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderUpcoming() {
    const container = document.getElementById('upcomingList');
    if (!container) return;
    const upcoming = currentState.inventory
        .filter(p => { const days = getDaysUntilExpiry(p.date); return days >= 0 && days <= 7; })
        .sort((a, b) => getDaysUntilExpiry(a.date) - getDaysUntilExpiry(b.date));

    if (upcoming.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary);font-size:14px;">✅ Ningún producto vence en los próximos 7 días.</p>`;
        return;
    }
    container.innerHTML = upcoming.map(p => {
        const days = getDaysUntilExpiry(p.date);
        const urgency = days === 0 ? 'var(--danger)' : days <= 2 ? 'var(--warning)' : 'var(--accent)';
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
                <div>
                    <strong>${escapeHtml(p.name)}</strong>
                    <span style="margin-left:8px;font-size:12px;color:var(--text-secondary);">${escapeHtml(p.category || 'General')}</span>
                </div>
                <span style="font-size:13px;font-weight:700;color:${urgency};">${days === 0 ? 'Vence hoy' : `${days} día${days !== 1 ? 's' : ''}`}</span>
            </div>`;
    }).join('');
}

/* ===== CLIMA — API de terceros: OpenWeather (vía proxy seguro) ===== */
async function fetchWeather() {
    const city = document.getElementById("weatherCity").value.trim();
    const resultEl = document.getElementById("weatherResult");
    if (!city) {
        resultEl.innerHTML = `<p style="color:var(--danger);font-size:14px;">⚠️ Ingresa el nombre de una ciudad.</p>`;
        return;
    }
    resultEl.innerHTML = `<p style="color:var(--text-secondary);font-size:14px;">Consultando clima...</p>`;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE}/weather?city=${encodeURIComponent(city)}`, {
            headers: { "authorization": token }
        });
        const data = await res.json();

        if (!res.ok) {
            resultEl.innerHTML = `<p style="color:var(--danger);font-size:14px;">⚠️ ${data.msg || "Ciudad no encontrada."}</p>`;
            return;
        }

        const temp = Math.round(data.main.temp);
        const humidity = data.main.humidity;
        const desc = data.weather[0].description;
        const icon = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        const feelsLike = Math.round(data.main.feels_like);
        const windSpeed = data.wind.speed;

        let tip = "";
        let tipColor = "var(--success)";
        if (temp > 30) {
            tip = "🌡️ Alta temperatura — los productos frescos y lácteos necesitan refrigeración urgente.";
            tipColor = "var(--danger)";
        } else if (humidity > 75) {
            tip = "💧 Humedad elevada — riesgo de hongos en panadería y granos. Asegura el almacenamiento sellado.";
            tipColor = "var(--warning)";
        } else if (temp < 5) {
            tip = "🧊 Temperatura baja — ideal para conservación, pero revisa productos sensibles al frío.";
            tipColor = "#0071e3";
        } else {
            tip = "✅ Condiciones adecuadas para la conservación general del inventario.";
            tipColor = "var(--success)";
        }

        resultEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <img src="${iconUrl}" alt="${desc}" style="width:64px;height:64px;">
                <div>
                    <p style="font-size:22px;font-weight:700;margin:0;">${temp}°C <span style="font-size:15px;font-weight:400;color:var(--text-secondary);">${desc}</span></p>
                    <p style="font-size:13px;color:var(--text-secondary);margin:4px 0 0;">${data.name}, ${data.sys.country} · Sensación: ${feelsLike}°C · Humedad: ${humidity}% · Viento: ${windSpeed} m/s</p>
                </div>
            </div>
            <div style="margin-top:14px;padding:12px 16px;border-radius:10px;border-left:4px solid ${tipColor};background:rgba(0,0,0,0.03);font-size:13px;color:var(--text-primary);line-height:1.6;">
                <strong>Consejo para tu inventario:</strong> ${tip}
            </div>
            <p style="font-size:11px;color:var(--text-secondary);margin-top:10px;">Fuente: OpenWeatherMap API · Datos en tiempo real</p>
        `;
    } catch (err) {
        resultEl.innerHTML = `<p style="color:var(--danger);font-size:14px;">⚠️ Error de conexión. Intenta de nuevo.</p>`;
    }
}

/* ===== TOAST ===== */

function showToast(msg, type = "success") {
    const toast = document.createElement("div");
    const colors = { success: '#34c759', danger: '#ff3b30', warning: '#ff9500' };
    toast.style.cssText = `
        position:fixed; bottom:30px; right:30px;
        padding:14px 22px; background:white; color:var(--text-primary);
        border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.15);
        border-left:4px solid ${colors[type] || colors.success};
        z-index:9999; font-weight:600; font-size:14px; max-width:320px;
        transform:translateY(80px); opacity:0;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    if (window.gsap) {
        gsap.to(toast, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" });
        setTimeout(() => gsap.to(toast, { y: 80, opacity: 0, duration: 0.4, onComplete: () => toast.remove() }), 3000);
    } else {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
        setTimeout(() => toast.remove(), 3000);
    }
}