import os
import json
import smtplib
import random
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

class OpelcarRequestHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/cotizacion":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                # Extraer campos de la solicitud
                nombre = data.get("nombre")
                empresa = data.get("empresa", "Particular / No especificada")
                email = data.get("email")
                telefono = data.get("telefono")
                origen = data.get("origen")
                destino = data.get("destino")
                carga_peso = data.get("cargaPeso")
                carga_volumen = data.get("cargaVolumen")
                mensaje = data.get("mensaje")
                pdf_base64 = data.get("pdfBase64")
                pdf_filename = data.get("pdfFilename")
                
                # Generar datos del documento
                consecutivo = f"OP-{random.randint(1000, 9999)}"
                fecha = datetime.now().strftime("%d/%m/%Y")
                
                # Configuración de SMTP desde el archivo .env
                smtp_host = ENV.get("SMTP_HOST", "smtp.gmail.com")
                smtp_port = int(ENV.get("SMTP_PORT", 587))
                smtp_user = ENV.get("SMTP_USER")
                smtp_pass = ENV.get("SMTP_PASS")
                dest_email = ENV.get("DEST_EMAIL", "administacion@opelcarsas.com")
                
                # Enviar correo real si las credenciales están configuradas
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
                    
                    # Adjuntar archivo PDF si está presente
                    if pdf_base64 and pdf_filename:
                        import base64
                        from email.mime.base import MIMEBase
                        from email import encoders
                        
                        pdf_data = base64.b64decode(pdf_base64)
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(pdf_data)
                        encoders.encode_base64(part)
                        part.add_header('Content-Disposition', f'attachment; filename="{pdf_filename}"')
                        msg.attach(part)
                    
                    # Conexión y envío SMTP
                    recipients = [dest_email, cc_email]
                    server = smtplib.SMTP(smtp_host, smtp_port)
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())
                    server.quit()
                    print(f"📧 Cotización {consecutivo} enviada por correo a {dest_email} con copia a {cc_email}")
                else:
                    print("⚠️ SMTP no configurado en .env. Saltando envío de correo real.")
                
                # Responder con éxito al cliente
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
                    "error": "Error al procesar el envío del correo.",
                    "details": str(e)
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
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
