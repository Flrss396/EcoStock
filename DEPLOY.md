# 🚀 Guía para subir EcoStock a la nube (Railway) — URL HTTPS gratis

## ¿Qué es Railway?
Railway es una plataforma cloud donde puedes subir tu app Node.js y obtener una URL pública HTTPS
como `https://ecostock-production.up.railway.app` — completamente gratis para proyectos pequeños.

---

## PASO 1: Preparar el correo de EcoStock

Antes de subir, configura el correo en Gmail:

1. Ve a tu cuenta de Google **ecostocksupport@gmail.com**
2. Ve a: **Configuración → Seguridad → Verificación en 2 pasos** → Actívala
3. Luego ve a: **Seguridad → Contraseñas de aplicaciones**
4. Crea una contraseña para "Correo" + "Mac/Windows" → copia los 16 caracteres que aparecen
5. Esa es tu `EMAIL_PASS` (no la contraseña normal de Gmail)

---

## PASO 2: Subir el código a GitHub

1. Ve a https://github.com y crea una cuenta si no tienes
2. Crea un repositorio nuevo: **"ecostock"** (privado o público)
3. En tu computadora, abre la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "EcoStock v2.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ecostock.git
git push -u origin main
```

> Si no tienes Git instalado: descárgalo en https://git-scm.com

---

## PASO 3: Crear cuenta en Railway

1. Ve a https://railway.app
2. Haz clic en **"Start a New Project"**
3. Inicia sesión con tu cuenta de **GitHub**
4. Acepta los permisos

---

## PASO 4: Crear el proyecto en Railway

1. En Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Elige tu repositorio **"ecostock"**
4. Railway detecta automáticamente que es Node.js ✅

---

## PASO 5: Configurar las variables de entorno

En Railway, ve a tu proyecto → pestaña **"Variables"** → agrega:

| Variable | Valor |
|----------|-------|
| `PORT` | `3000` |
| `JWT_SECRET` | `una_clave_larga_y_secreta_aqui_2025` |
| `EMAIL_USER` | `ecostocksupport@gmail.com` |
| `EMAIL_PASS` | `(los 16 caracteres de la contraseña de app)` |
| `BASE_URL` | `https://TU-APP.up.railway.app` ← (lo ves en Railway después de deploy) |

---

## PASO 6: Configurar el dominio

1. En Railway, ve a tu proyecto → pestaña **"Settings"**
2. En la sección **"Domains"** → haz clic en **"Generate Domain"**
3. Railway te da una URL como: `https://ecostock-production.up.railway.app`
4. Copia esa URL y ponla en la variable `BASE_URL` (sin slash al final)

---

## PASO 7: Hacer deploy

1. Railway hace deploy automático cuando haces `git push`
2. Ve a la pestaña **"Deployments"** para ver el progreso
3. Cuando diga **"Success"** → ¡tu app está en vivo! 🎉

---

## PASO 8: Verificar que funciona

1. Abre tu URL HTTPS en el navegador
2. Regístrate con una cuenta de prueba
3. Ve a "¿Olvidaste tu contraseña?" y prueba el flujo completo
4. Revisa el correo — deberías recibir el email de recuperación

---

## ✅ Checklist final

- [ ] contraseña de app Gmail configurada
- [ ] Variables de entorno en Railway configuradas
- [ ] `BASE_URL` apunta a tu URL de Railway
- [ ] `git push` ejecutado
- [ ] Deploy exitoso en Railway
- [ ] Prueba de login ✓
- [ ] Prueba de recuperar contraseña ✓

---

## 🔁 Cómo actualizar la app en el futuro

Cada vez que hagas cambios en tu código:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Railway detecta el push y hace deploy automáticamente en ~2 minutos.

---

## 💡 Notas importantes

- **SQLite en producción**: Railway reinicia los contenedores y puede perder la base de datos.
  Para producción real, considera agregar una base de datos PostgreSQL en Railway (gratis también).
  Por ahora para pruebas funciona bien.

- **Plan gratuito Railway**: incluye $5 USD/mes de crédito — más que suficiente para este proyecto.

- **HTTPS**: Railway incluye HTTPS automáticamente, no necesitas configurar nada extra.

---

## Soporte

Si tienes problemas: ecostocksupport@gmail.com
