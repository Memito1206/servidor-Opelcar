const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Carpeta para guardar las cotizaciones en disco
const DATA_DIR = path.join(__dirname, 'cotizaciones');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Almacenamiento en memoria para sesiones activas de administración
const activeSessions = new Set();

// Función para obtener el siguiente consecutivo de cotización
function getNextConsecutivo() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    let maxNum = 1000; // Comenzará en 1001 la primera vez
    
    files.forEach(file => {
      if (file.startsWith('OP-') && file.endsWith('.json')) {
        const numStr = file.replace('OP-', '').replace('.json', '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    return `OP-${maxNum + 1}`;
  } catch (error) {
    console.error('Error al generar consecutivo secuencial:', error);
    return `OP-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del sitio web (HTML, CSS, JS, imágenes) desde esta misma carpeta con prevención de cacheo agresivo
app.use(express.static(__dirname, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Configuración del Transportador de Nodemailer (SMTP)
// Se inicializa con variables de entorno para proteger las credenciales
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // No fallar en certificados autofirmados (útil para servidores de correo internos/locales)
    rejectUnauthorized: false
  }
});

// Verificar conexión SMTP al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('⚠️ Error en la configuración SMTP de Nodemailer:', error.message);
  } else {
    console.log('✅ Servidor de correo SMTP listo para enviar mensajes.');
  }
});

// Endpoint para recibir las cotizaciones
app.post('/api/cotizacion', async (req, res) => {
  try {
    const {
      nombre,
      empresa,
      email,
      telefono,
      origen,
      destino,
      cargaPeso,
      cargaVolumen,
      mensaje
    } = req.body;

    // Validar datos obligatorios
    if (!nombre || !email || !telefono || !origen || !destino || !cargaPeso || !cargaVolumen || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios en el formulario.'
      });
    }

    const consecutivo = getNextConsecutivo();
    const fecha = new Date().toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Guardar la cotización localmente en formato JSON
    const cotizacionData = {
      consecutivo,
      fecha,
      nombre,
      empresa,
      email,
      telefono,
      origen,
      destino,
      cargaPeso: parseFloat(cargaPeso),
      cargaVolumen: parseFloat(cargaVolumen),
      mensaje,
      status: 'pendiente'
    };

    fs.writeFileSync(
      path.join(DATA_DIR, `${consecutivo}.json`),
      JSON.stringify(cotizacionData, null, 2),
      'utf8'
    );

    // Construcción del diseño del correo en HTML corporativo
    const mailOptions = {
      from: `"${nombre} (Vía Opelcar)" <${process.env.SMTP_USER}>`,
      to: process.env.DEST_EMAIL || 'administacion@opelcarsas.com',
      cc: 'guillermocamiloflorezerazo@gmail.com',
      replyTo: email, // Permite responder directamente al cliente haciendo clic en "Responder"
      subject: `Nueva Solicitud de Cotización ${consecutivo} - ${nombre}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
              color: #333333;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
            .email-container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .email-header {
              background-color: #152e60; /* Azul oscuro Opelcar */
              padding: 24px;
              text-align: center;
              color: #ffffff;
            }
            .email-header h2 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .email-header p {
              margin: 5px 0 0 0;
              font-size: 13px;
              color: #cbd5e1;
            }
            .email-body {
              padding: 30px;
            }
            .doc-info {
              display: flex;
              justify-content: space-between;
              background-color: #f1f5f9;
              padding: 12px 16px;
              border-radius: 6px;
              margin-bottom: 24px;
              font-size: 13px;
              font-weight: 600;
              color: #475569;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #152e60;
              text-transform: uppercase;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .data-table th {
              text-align: left;
              font-size: 13px;
              color: #64748b;
              padding: 8px 0;
              width: 35%;
              vertical-align: top;
            }
            .data-table td {
              font-size: 13px;
              color: #1e293b;
              padding: 8px 0;
              vertical-align: top;
            }
            .message-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 16px;
              font-size: 13px;
              color: #334155;
              white-space: pre-line;
              margin-top: 10px;
            }
            .email-footer {
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 20px;
              text-align: center;
              font-size: 11px;
              color: #64748b;
            }
            .email-footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h2>OPELCAR S.A.S</h2>
              <p>Operador Logístico de Carga Internacional S.A.S</p>
            </div>
            
            <div class="email-body">
              <div class="doc-info">
                <span>Documento: ${consecutivo}</span>
                <span>Fecha: ${fecha}</span>
              </div>
              
              <div class="section-title">1. Datos del Cliente</div>
              <table class="data-table">
                <tr>
                  <th>Nombre Completo:</th>
                  <td>${nombre}</td>
                </tr>
                <tr>
                  <th>Empresa:</th>
                  <td>${empresa}</td>
                </tr>
                <tr>
                  <th>Correo de Contacto:</th>
                  <td><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <th>Teléfono:</th>
                  <td>${telefono}</td>
                </tr>
              </table>
              
              <div class="section-title">2. Detalles del Trayecto</div>
              <table class="data-table">
                <tr>
                  <th>Ciudad de Origen:</th>
                  <td>${origen}</td>
                </tr>
                <tr>
                  <th>Ciudad de Destino:</th>
                  <td>${destino}</td>
                </tr>
              </table>
              
              <div class="section-title">3. Detalles de Carga y Volumen</div>
              <table class="data-table">
                <tr>
                  <th>Peso / Carga Útil:</th>
                  <td><strong>${cargaPeso} Toneladas</strong></td>
                </tr>
                <tr>
                  <th>Volumen Declarado:</th>
                  <td><strong>${cargaVolumen} m³ (Metros Cúbicos)</strong></td>
                </tr>
              </table>
              
              <div class="section-title">4. Observaciones / Tipo de Mercancía</div>
              <div class="message-box">${mensaje}</div>
            </div>
            
            <div class="email-footer">
              <p>Este es un correo automático generado por el portal web local de OPELCAR S.A.S.</p>
              <p>© ${new Date().getFullYear()} OPELCAR S.A.S — Carrera 8va #25a – 97, Ipiales, Colombia</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);
    console.log(`📧 Cotización ${consecutivo} enviada con éxito a ${mailOptions.to}`);
    
    res.status(200).json({
      success: true,
      message: 'Cotización enviada con éxito.',
      consecutivo,
      fecha
    });

  } catch (error) {
    console.error('❌ Error al procesar o enviar la cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar la cotización por correo.',
      details: error.message
    });
  }
});

// Endpoint para el inicio de sesión del administrador
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  const adminPass = process.env.ADMIN_PASS;
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsStr.split(',').map(e => e.trim().toLowerCase());

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar el correo y la contraseña.'
    });
  }

  if (password === adminPass && adminEmails.includes(email.trim().toLowerCase())) {
    // Generar token de sesión único de 48 caracteres hexadecimales
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions.add(token);

    res.status(200).json({
      success: true,
      message: 'Autenticación exitosa.',
      token
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales inválidas o correo no autorizado.'
    });
  }
});

// Endpoint para obtener la lista de cotizaciones registradas
app.get('/api/admin/cotizaciones', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Token ausente.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada.'
    });
  }

  try {
    const files = fs.readdirSync(DATA_DIR);
    const cotizaciones = [];

    files.forEach(file => {
      if (file.startsWith('OP-') && file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
          cotizaciones.push(JSON.parse(fileContent));
        } catch (e) {
          console.error(`Error al parsear el archivo ${file}:`, e);
        }
      }
    });

    // Ordenar de mayor a menor según el consecutivo numérico (más reciente primero)
    cotizaciones.sort((a, b) => {
      const numA = parseInt(a.consecutivo.replace('OP-', ''), 10);
      const numB = parseInt(b.consecutivo.replace('OP-', ''), 10);
      return numB - numA;
    });

    res.status(200).json({
      success: true,
      cotizaciones
    });
  } catch (error) {
    console.error('Error al leer cotizaciones en disco:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al leer las cotizaciones.'
    });
  }
});

// Endpoint para enviar una cotización formalizada al cliente
app.post('/api/admin/enviar-cotizacion', async (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Token ausente.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada.'
    });
  }

  try {
    const { emailDestinatario, asunto, contenidoHtml, consecutivo } = req.body;

    if (!emailDestinatario || !asunto || !contenidoHtml || !consecutivo) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios para enviar la cotización.'
      });
    }

    const ccEmail = 'guillermocamiloflorezerazo@gmail.com';
    const mailOptions = {
      from: `"Opelcar Cotizaciones" <${process.env.SMTP_USER}>`,
      to: emailDestinatario,
      cc: ccEmail,
      subject: asunto,
      html: contenidoHtml,
      attachments: [
        {
          filename: 'Logo_Horizontal.png',
          path: path.join(__dirname, 'assets', 'Logo_Horizontal.png'),
          cid: 'logo_opelcar'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Cotización ${consecutivo} formalizada y enviada por correo a ${emailDestinatario} con copia a ${ccEmail}`);

    // Actualizar el estado en el archivo JSON local a 'enviada'
    const filePath = path.join(DATA_DIR, `${consecutivo}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const quoteData = JSON.parse(fileContent);
        quoteData.status = 'enviada';
        fs.writeFileSync(filePath, JSON.stringify(quoteData, null, 2), 'utf8');
      } catch (err) {
        console.error(`Error al actualizar estado de cotización ${consecutivo}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Cotización enviada exitosamente al cliente.'
    });
  } catch (error) {
    console.error('❌ Error al enviar la cotización por correo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el correo al cliente.',
      details: error.message
    });
  }
});

// Endpoint para actualizar el estado de una cotización manualmente (ej. marcar como aprobada/aceptada)
app.post('/api/admin/actualizar-estado', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Token ausente.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada.'
    });
  }

  try {
    const { consecutivo, status } = req.body;

    if (!consecutivo || !status) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios para actualizar el estado.'
      });
    }

    const filePath = path.join(DATA_DIR, `${consecutivo}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada.'
      });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const quoteData = JSON.parse(fileContent);
    quoteData.status = status;
    fs.writeFileSync(filePath, JSON.stringify(quoteData, null, 2), 'utf8');

    console.log(`✅ Estado de cotización ${consecutivo} actualizado a: ${status}`);
    res.status(200).json({
      success: true,
      message: `Estado actualizado a ${status} correctamente.`
    });
  } catch (error) {
    console.error('Error al actualizar estado en disco:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al actualizar el estado.'
    });
  }
});

// Endpoint para cerrar sesión
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.status(200).json({ success: true, message: 'Sesión cerrada correctamente.' });
});

// Ruta comodín para redirigir peticiones no válidas a index.html (Soporte SPA básico)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de OPELCAR S.A.S ejecutándose en http://localhost:${PORT}`);
});
