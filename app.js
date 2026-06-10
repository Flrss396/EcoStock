/* ===== ECOSTOCK APP LOGIC v2.0 ===== */

const API_BASE = "";  // Vacío = mismo servidor (funciona en local y en producción)

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
});

function setupMobile() {
    const hamburger = document.getElementById('hamburgerBtn');
    if (!hamburger) return;
    
    function checkWidth() {
        if (window.innerWidth <= 768) {
            hamburger.style.display = 'block';
        } else {
            hamburger.style.display = 'none';
            // Asegurarse que sidebar esté visible en desktop
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
    
    if (window.gsap) {
        gsap.from(".login-card", { duration: 0.8, y: 40, opacity: 0, ease: "power4.out" });
    }
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
                // Cerrar sidebar en mobile
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
            gsap.from(target.children, {
                duration: 0.5,
                y: 16,
                opacity: 0,
                stagger: 0.08,
                ease: "power2.out"
            });
        }

        if (['inventory', 'home', 'analytics'].includes(sectionId)) {
            loadInventory();
        }
    }
}

/* ===== AUTH ===== */

function toggleAuthMode(mode) {
    const forms = ['loginForm', 'registerForm', 'forgotForm'];
    forms.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = 'none';
    });
    
    const target = mode === 'register' ? 'registerForm' : mode === 'forgot' ? 'forgotForm' : 'loginForm';
    const el = document.getElementById(target);
    if (el) el.style.display = 'block';
    
    // Limpiar mensajes
    const loginError = document.getElementById('loginError');
    if (loginError) loginError.textContent = '';
    const forgotMsg = document.getElementById('forgotMsg');
    if (forgotMsg) forgotMsg.textContent = '';
    
    if (window.gsap) {
        gsap.from(".login-card", { opacity: 0, scale: 0.97, duration: 0.35, ease: 'back.out(1.4)' });
    }
}

function showForgotPassword() {
    toggleAuthMode('forgot');
}

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

    if (!currentPassword || !newPassword) {
        showToast("Completa ambos campos", "warning");
        return;
    }
    if (newPassword.length < 6) {
        showToast("La contraseña debe tener al menos 6 caracteres", "warning");
        return;
    }

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
        const res = await fetch(`${API_BASE}/products`, {
            headers: { "authorization": token }
        });
        
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
            <td><span style="font-size:12px; padding:4px 10px; background:rgba(0,113,227,0.08); color:var(--accent); border-radius:20px; font-weight:500;">${escapeHtml(category)}</span></td>
            <td>${p.date}</td>
            <td>${daysText}</td>
            <td><span class="status-pill ${statusClass}">${p.status}</span></td>
            <td>
                <button onclick="deleteProduct(${p.id})" style="padding: 6px 12px; background: rgba(255,59,48,0.08); color: var(--danger); font-size: 13px; border-radius:8px; font-weight:600;">Eliminar</button>
            </td>
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

function exportCSV() {
    if (currentState.inventory.length === 0) {
        showToast("No hay productos para exportar", "warning");
        return;
    }

    const headers = ["Nombre", "Categoría", "Fecha Vencimiento", "Estado", "Días Restantes"];
    const rows = currentState.inventory.map(p => [
        p.name,
        p.category || "General",
        p.date,
        p.status,
        getDaysUntilExpiry(p.date)
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecostock_inventario_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado correctamente 📥", "success");
}

async function addProduct() {
    const name = document.getElementById("prodName").value.trim();
    const date = document.getElementById("prodDate").value;
    const category = document.getElementById("prodCategory").value;
    const token = localStorage.getItem("token");

    if (!name || !date) {
        showToast("Completa nombre y fecha", "warning");
        return;
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
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, font: { size: 13 } } }
            },
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
                label: 'Productos',
                data: values,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'CC'),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1.5,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
        .filter(p => {
            const days = getDaysUntilExpiry(p.date);
            return days >= 0 && days <= 7;
        })
        .sort((a, b) => getDaysUntilExpiry(a.date) - getDaysUntilExpiry(b.date));

    if (upcoming.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary); font-size:14px;">✅ Ningún producto vence en los próximos 7 días.</p>`;
        return;
    }

    container.innerHTML = upcoming.map(p => {
        const days = getDaysUntilExpiry(p.date);
        const urgency = days === 0 ? 'var(--danger)' : days <= 2 ? 'var(--warning)' : 'var(--accent)';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border:1px solid var(--border); border-radius:10px; margin-bottom:8px;">
                <div>
                    <strong>${escapeHtml(p.name)}</strong>
                    <span style="margin-left:8px; font-size:12px; color:var(--text-secondary);">${escapeHtml(p.category || 'General')}</span>
                </div>
                <span style="font-size:13px; font-weight:700; color:${urgency};">
                    ${days === 0 ? 'Vence hoy' : `${days} día${days !== 1 ? 's' : ''}`}
                </span>
            </div>
        `;
    }).join('');
}

/* ===== TOAST ===== */

function showToast(msg, type = "success") {
    const toast = document.createElement("div");
    const colors = { success: '#34c759', danger: '#ff3b30', warning: '#ff9500' };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 14px 22px;
        background: white;
        color: var(--text-primary);
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        border-left: 4px solid ${colors[type] || colors.success};
        z-index: 9999;
        font-weight: 600;
        font-size: 14px;
        max-width: 320px;
        transform: translateY(80px);
        opacity: 0;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    if (window.gsap) {
        gsap.to(toast, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" });
        setTimeout(() => {
            gsap.to(toast, { y: 80, opacity: 0, duration: 0.4, onComplete: () => toast.remove() });
        }, 3000);
    } else {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
        setTimeout(() => toast.remove(), 3000);
    }
}
