import os
import json
import smtplib
import random
import secrets
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, HTTPServer
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Analizador simple de archivos .env
def load_env(filepath=".env"):
    env_vars = {}
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key_val = line.split("=", 1)
                    if len(key_val) == 2:
                        env_vars[key_val[0].strip()] = key_val[1].strip()
    return env_vars

ENV = load_env()
PORT = int(ENV.get("PORT", 8000))

# Directorio de persistencia
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cotizaciones")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Sesiones de administración activas
ACTIVE_SESSIONS = set()

# Obtener consecutivo incremental
def get_next_consecutivo():
    try:
        files = os.listdir(DATA_DIR)
        max_num = 1000
        for file in files:
            if file.startswith("OP-") and file.endswith(".json"):
                num_str = file.replace("OP-", "").replace(".json", "")
                try:
                    num = int(num_str)
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
        return f"OP-{max_num + 1}"
    except Exception as e:
        print("Error al generar consecutivo secuencial:", str(e))
        return f"OP-{random.randint(1000, 9999)}"

class OpelcarRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Interceptar endpoint de listado de cotizaciones
        if self.path == "/api/admin/cotizaciones":
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Acceso no autorizado. Token ausente."}).encode('utf-8'))
                return

            token = auth_header.split(' ')[1]
            if token not in ACTIVE_SESSIONS:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Sesión inválida o expirada."}).encode('utf-8'))
                return

            try:
                files = os.listdir(DATA_DIR)
                cotizaciones = []
                for file in files:
                    if file.startswith("OP-") and file.endswith(".json"):
                        filepath = os.path.join(DATA_DIR, file)
                        with open(filepath, "r", encoding="utf-8") as f:
                            try:
                                cotizaciones.append(json.load(f))
                            except Exception as parse_err:
                                print(f"Error al parsear el archivo {file}:", str(parse_err))

                # Ordenar de más reciente a más antiguo según consecutivo
                def get_num(c):
                    try:
                        return int(c["consecutivo"].replace("OP-", ""))
                    except Exception:
                        return 0
                cotizaciones.sort(key=get_num, reverse=True)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "cotizaciones": cotizaciones}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Error interno al leer cotizaciones.", "details": str(e)}).encode('utf-8'))
                return
        else:
            # Servir archivos estáticos normales
            super().do_GET()

    def do_POST(self):
        # Endpoint para recibir las cotizaciones de la landing
        if self.path == "/api/cotizacion":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                nombre = data.get("nombre")
                empresa = data.get("empresa", "Particular / No especificada")
                email = data.get("email")
                telefono = data.get("telefono")
                origen = data.get("origen")
                destino = data.get("destino")
                carga_peso = data.get("cargaPeso")
                carga_volumen = data.get("cargaVolumen")
                mensaje = data.get("mensaje")
                
                if not nombre or not email or not telefono or not origen or not destino or not carga_peso or not carga_volumen or not mensaje:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Faltan campos obligatorios."}).encode('utf-8'))
                    return

                consecutivo = get_next_consecutivo()
                fecha = datetime.now().strftime("%d/%m/%Y")
                
                # Guardar la cotización localmente en formato JSON
                cotizacion_data = {
                    "consecutivo": consecutivo,
                    "fecha": fecha,
                    "nombre": nombre,
                    "empresa": empresa,
                    "email": email,
                    "telefono": telefono,
                    "origen": origen,
                    "destino": destino,
                    "cargaPeso": float(carga_peso),
                    "cargaVolumen": float(carga_volumen),
                    "mensaje": mensaje,
                    "status": "pendiente"
                }

                filepath = os.path.join(DATA_DIR, f"{consecutivo}.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(cotizacion_data, f, indent=2, ensure_ascii=False)

                # Configuración de SMTP desde el archivo .env
                smtp_host = ENV.get("SMTP_HOST", "smtp.gmail.com")
                smtp_port = int(ENV.get("SMTP_PORT", 587))
                smtp_user = ENV.get("SMTP_USER")
                smtp_pass = ENV.get("SMTP_PASS")
                dest_email = ENV.get("DEST_EMAIL", "administacion@opelcarsas.com")
                
                if smtp_user and smtp_pass:
                    cc_email = "guillermocamiloflorezerazo@gmail.com"
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = f"Nueva Solicitud de Cotización {consecutivo} - {nombre}"
                    msg['From'] = f"Opelcar Portal <{smtp_user}>"
                    msg['To'] = dest_email
                    msg['Cc'] = cc_email
                    msg.add_header('reply-to', email)
                    
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.6; background-color: #f8fafc; margin: 0; padding: 0; }}
                        .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }}
                        .header {{ background: #152e60; padding: 24px; text-align: center; color: #ffffff; }}
                        .header h2 {{ margin: 0; font-size: 20px; }}
                        .header p {{ margin: 5px 0 0; font-size: 13px; color: #cbd5e1; }}
                        .body {{ padding: 30px; }}
                        .doc-info {{ display: flex; justify-content: space-between; background: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; font-weight: 600; color: #475569; }}
                        .section-title {{ font-size: 14px; font-weight: 700; color: #152e60; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }}
                        .data-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
                        .data-table th {{ text-align: left; font-size: 13px; color: #64748b; padding: 8px 0; width: 35%; }}
                        .data-table td {{ font-size: 13px; color: #1e293b; padding: 8px 0; }}
                        .message-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; font-size: 13px; color: #334155; white-space: pre-line; }}
                        .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }}
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>OPELCAR S.A.S</h2>
                          <p>Operador Logístico de Carga Internacional S.A.S</p>
                        </div>
                        <div class="body">
                          <div class="doc-info">
                            <span style="font-weight: bold;">Documento: {consecutivo}</span>
                            <span style="margin-left: auto; font-weight: bold;">Fecha: {fecha}</span>
                          </div>
                          
                          <div class="section-title">1. Datos del Cliente</div>
                          <table class="data-table">
                            <tr><th>Nombre Completo:</th><td>{nombre}</td></tr>
                            <tr><th>Empresa:</th><td>{empresa}</td></tr>
                            <tr><th>Correo de Contacto:</th><td><a href="mailto:{email}">{email}</a></td></tr>
                            <tr><th>Teléfono:</th><td>{telefono}</td></tr>
                          </table>
                          
                          <div class="section-title">2. Detalles del Trayecto</div>
                          <table class="data-table">
                            <tr><th>Ciudad de Origen:</th><td>{origen}</td></tr>
                            <tr><th>Ciudad de Destino:</th><td>{destino}</td></tr>
                          </table>
                          
                          <div class="section-title">3. Detalles de Carga y Volumen</div>
                          <table class="data-table">
                            <tr><th>Peso / Carga Útil:</th><td><strong>{carga_peso} Toneladas</strong></td></tr>
                            <tr><th>Volumen Declarado:</th><td><strong>{carga_volumen} m³</strong></td></tr>
                          </table>
                          
                          <div class="section-title">4. Observaciones / Tipo de Mercancía</div>
                          <div class="message-box">{mensaje}</div>
                        </div>
                        <div class="footer">
                          <p>Este es un correo automático generado por el portal web local de OPELCAR S.A.S.</p>
                          <p>© {datetime.now().year} OPELCAR S.A.S — Carrera 8va #25a – 97, Ipiales, Colombia</p>
                        </div>
                      </div>
                    </body>
                    </html>
                    """
                    msg.attach(MIMEText(html_content, 'html'))
                    
                    recipients = [dest_email, cc_email]
                    server = smtplib.SMTP(smtp_host, smtp_port)
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())
                    server.quit()
                    print(f"📧 Cotización {consecutivo} enviada por correo a {dest_email} con copia a {cc_email}")
                else:
                    print("⚠️ SMTP no configurado en .env. Saltando envío de correo real.")
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    "success": True,
                    "consecutivo": consecutivo,
                    "fecha": fecha
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                print("❌ Error al procesar cotización:", str(e))
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    "success": False,
                    "error": "Error al procesar el envío de la cotización.",
                    "details": str(e)
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
        elif self.path == "/api/admin/login":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                email = data.get("email")
                password = data.get("password")
                
                admin_pass = ENV.get("ADMIN_PASS")
                admin_emails_str = ENV.get("ADMIN_EMAILS", "")
                admin_emails = [e.strip().lower() for e in admin_emails_str.split(",") if e.strip()]
                
                if not email or not password:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Debe ingresar el correo y la contraseña."}).encode('utf-8'))
                    return
                    
                if password == admin_pass and email.strip().lower() in admin_emails:
                    token = secrets.token_hex(24)
                    ACTIVE_SESSIONS.add(token)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "message": "Autenticación exitosa.", "token": token}).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Credenciales inválidas o correo no autorizado."}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Error interno del servidor.", "details": str(e)}).encode('utf-8'))
                
        elif self.path == "/api/admin/enviar-cotizacion":
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Acceso no autorizado. Token ausente."}).encode('utf-8'))
                return

            token = auth_header.split(' ')[1]
            if token not in ACTIVE_SESSIONS:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Sesión inválida o expirada."}).encode('utf-8'))
                return

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                email_destinatario = data.get("emailDestinatario")
                asunto = data.get("asunto")
                contenido_html = data.get("contenidoHtml")
                consecutivo = data.get("consecutivo")

                if not email_destinatario or not asunto or not contenido_html or not consecutivo:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Faltan campos obligatorios."}).encode('utf-8'))
                    return

                # Configuración de SMTP desde el archivo .env
                smtp_host = ENV.get("SMTP_HOST", "smtp.gmail.com")
                smtp_port = int(ENV.get("SMTP_PORT", 587))
                smtp_user = ENV.get("SMTP_USER")
                smtp_pass = ENV.get("SMTP_PASS")
                
                if smtp_user and smtp_pass:
                    cc_email = "guillermocamiloflorezerazo@gmail.com"
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = asunto
                    msg['From'] = f"Opelcar Cotizaciones <{smtp_user}>"
                    msg['To'] = email_destinatario
                    msg['Cc'] = cc_email
                    msg.attach(MIMEText(contenido_html, 'html'))

                    recipients = [email_destinatario, cc_email]
                    server = smtplib.SMTP(smtp_host, smtp_port)
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())
                    server.quit()
                    print(f"📧 Cotización {consecutivo} formalizada y enviada por correo a {email_destinatario} con copia a {cc_email}")
                else:
                    print("⚠️ SMTP no configurado en .env. Saltando envío de correo real de administración.")

                # Actualizar el archivo JSON local a 'enviada'
                filepath = os.path.join(DATA_DIR, f"{consecutivo}.json")
                if os.path.exists(filepath):
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            quote_data = json.load(f)
                        quote_data["status"] = "enviada"
                        with open(filepath, "w", encoding="utf-8") as f:
                            json.dump(quote_data, f, indent=2, ensure_ascii=False)
                    except Exception as err:
                        print(f"Error al actualizar estado de {consecutivo} en Python:", str(err))

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Cotización enviada exitosamente al cliente."}).encode('utf-8'))
            except Exception as e:
                print("❌ Error al enviar cotización en Python:", str(e))
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Error interno del servidor.", "details": str(e)}).encode('utf-8'))

        elif self.path == "/api/admin/logout":
            auth_header = self.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                ACTIVE_SESSIONS.discard(token)
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Sesión cerrada correctamente."}).encode('utf-8'))
            
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=OpelcarRequestHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Servidor de OPELCAR S.A.S ejecutándose en http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run()
