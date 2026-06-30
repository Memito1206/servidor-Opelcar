/**
 * OPELCAR S.A.S — Lógica Frontend Interactiva
 * ==========================================================================
 * Desarrollado para la landing page corporativa local.
 * Incluye:
 *   1. Menú móvil interactivo
 *   2. Navegación activa con Scroll Spy
 *   3. Scroll suave al hacer clic en enlaces
 *   4. Optimización de video con IntersectionObserver (reproducir solo al ver)
 *   5. Bucle de video silencioso a partir de la segunda reproducción
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. MENÚ MÓVIL INTERACTIVO
  // ==========================================================================
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      // Animación básica del botón hamburguesa
      navToggle.innerHTML = navMenu.classList.contains('active') ? '&#10006;' : '&#9776;';
    });

    // Cerrar menú al hacer clic en cualquier enlace (en dispositivos móviles)
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.innerHTML = '&#9776;';
      });
    });
  }

  // ==========================================================================
  // 2. SCROLL SPY (Navegación Activa al hacer Scroll)
  // ==========================================================================
  const sections = document.querySelectorAll('section');
  const header = document.getElementById('header');

  const scrollSpy = () => {
    const scrollPosition = window.scrollY + 120; // offset para activarse un poco antes

    // Efecto encoger header al hacer scroll
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    // Identificar sección activa
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', scrollSpy);
  // Ejecutar una vez al cargar por si la página inicia en una sección intermedia
  scrollSpy();

  // ==========================================================================
  // 3. OPTIMIZACIÓN Y LÓGICA DEL VIDEO (IntersectionObserver & Bucle Silencioso)
  // ==========================================================================
  const video = document.getElementById('corporate-video');
  const volumeToggle = document.getElementById('volume-toggle');
  const soundIconMuted = document.getElementById('sound-icon-muted');
  const soundIconUnmuted = document.getElementById('sound-icon-unmuted');
  const videoNotice = document.getElementById('video-notice');
  const videoStateIndicator = document.getElementById('video-state-indicator');
  const videoStateIcon = document.getElementById('video-state-icon');

  let isFirstPlay = true; // Flag para rastrear la primera visualización

  if (video) {
    // Configuración inicial del video según requisitos
    video.muted = false; // Intentar que empiece con sonido en su primera reproducción
    video.loop = false;  // Desactivar loop nativo inicialmente para detectar el evento 'ended'

    /**
     * Intenta reproducir el video controlando la política de reproducción automática
     */
    const playVideo = () => {
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Reproducción iniciada exitosamente
          showIndicator('▶');
          
          if (isFirstPlay) {
            if (video.muted) {
              // Si se reprodujo pero el navegador forzó silencio
              console.log("Video reproducido automáticamente pero silenciado por el navegador.");
              showNotice("🔇 Video reproducido en silencio. Toca el botón de sonido para activar audio.", 5000);
            } else {
              // Si se reprodujo con sonido exitosamente
              console.log("Video reproducido automáticamente con sonido.");
              showNotice("🔊 Video con sonido. Se silenciará en las siguientes repeticiones.", 6000);
              updateVolumeIcon(false); // mostrar icono des-silenciado
            }
          }
        }).catch(error => {
          // La reproducción automática con sonido fue bloqueada
          console.log("Autoplay con sonido bloqueado. Intentando reproducir silenciado...", error);
          
          // Reintentar silenciado (comportamiento estándar permitido por navegadores)
          video.muted = true;
          updateVolumeIcon(true); // mostrar icono silenciado
          
          video.play().then(() => {
            showIndicator('▶');
            if (isFirstPlay) {
              showNotice("🔇 Reproducción silenciada. Toca el botón para activar el sonido.", 5000);
            }
          }).catch(err => {
            console.error("No se pudo reproducir el video en absoluto:", err);
          });
        });
      }
    };

    /**
     * IntersectionObserver: Pausa el video si no se está viendo, lo reproduce si entra en pantalla
     */
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // El usuario está viendo el video, lo reproducimos
          console.log("El video es visible. Iniciando reproducción para optimizar recursos...");
          playVideo();
        } else {
          // El usuario dejó de ver el video, lo pausamos inmediatamente para ahorrar recursos
          if (!video.paused) {
            console.log("El video ya no es visible. Pausando para optimizar recursos...");
            video.pause();
            showIndicator('⏸');
          }
        }
      });
    }, {
      threshold: 0.2 // Se activa cuando al menos el 20% del video es visible
    });

    // Iniciar la observación del video
    videoObserver.observe(video);

    /**
     * Lógica clave: Cuando termina la primera reproducción, entrar en bucle silenciado
     */
    video.addEventListener('ended', () => {
      console.log("Primera visualización completada. Activando bucle silencioso...");
      
      // Aplicar requisitos
      video.muted = true;
      video.loop = true;
      isFirstPlay = false; // Ya no es la primera reproducción
      
      // Sincronizar UI del botón de volumen
      updateVolumeIcon(true);
      
      // Reproducir de inmediato en bucle
      video.play().catch(err => console.log("Error al reiniciar video en bucle:", err));
    });

    /**
     * Control manual del botón de volumen
     */
    if (volumeToggle) {
      volumeToggle.addEventListener('click', () => {
        video.muted = !video.muted;
        updateVolumeIcon(video.muted);
        
        // Si el usuario activa el sonido manualmente
        if (!video.muted) {
          showNotice("🔊 Sonido activado manualmente.", 3000);
          // Si el usuario interactúa y activa sonido, permitimos que se escuche
        } else {
          showNotice("🔇 Sonido desactivado.", 3000);
        }
      });
    }

    /**
     * Actualiza los iconos del botón de sonido según el estado
     */
    function updateVolumeIcon(isMuted) {
      if (isMuted) {
        soundIconMuted.style.display = 'block';
        soundIconUnmuted.style.display = 'none';
      } else {
        soundIconMuted.style.display = 'none';
        soundIconUnmuted.style.display = 'block';
      }
    }

    /**
     * Muestra una notificación temporal en la esquina inferior del video
     */
    function showNotice(message, duration = 4000) {
      if (videoNotice) {
        videoNotice.querySelector('span').textContent = message;
        videoNotice.classList.add('show');
        
        // Limpiar timeout anterior si existiera
        if (window.noticeTimeout) {
          clearTimeout(window.noticeTimeout);
        }
        
        window.noticeTimeout = setTimeout(() => {
          videoNotice.classList.remove('show');
        }, duration);
      }
    }

    /**
     * Muestra un indicador rápido (Play/Pause) en el centro del video
     */
    function showIndicator(iconText) {
      if (videoStateIndicator && videoStateIcon) {
        videoStateIcon.textContent = iconText;
        videoStateIndicator.classList.remove('animate');
        // forzar reflow para reiniciar la animación CSS
        void videoStateIndicator.offsetWidth;
        videoStateIndicator.classList.add('animate');
      }
    }
  }

  // ==========================================================================
  // 4. CATÁLOGO INTERACTIVO DE FLOTA (Modal y Fichas Técnicas)
  // ==========================================================================
  
  // Datos técnicos de los vehículos (con límites ajustados a la baja para evitar sobrecargas)
  const vehicleData = {
    turbo: {
      badge: "C2 Liviano",
      name: "Vehículos tipo Turbo",
      desc: "Camión ligero y versátil, ideal para la distribución urbana rápida de mercancías y envíos nacionales de corta distancia.",
      img: "assets/flota_turbo.jpg",
      config: "C2 (Categoría Liviana)",
      axles: "2 ejes (1 eje delantero direccional, 1 eje trasero motriz)",
      capacity: "Hasta 4.5 Toneladas de carga útil",
      pbv: "8.5 Toneladas de Peso Bruto Vehicular máximo homologado",
      volume: "25 m³ de volumen útil de furgón",
      dimensions: "Largo: 6.5 m | Ancho: 2.2 m | Alto: 2.4 m",
      intlAlert: "Uso principalmente recomendado para distribución urbana y enlaces nacionales de corta distancia. Para tránsitos internacionales de gran volumen, se aconseja escalar a categorías pesadas."
    },
    sencillo: {
      badge: "C2 Pesado",
      name: "Camiones Sencillos",
      desc: "Camión rígido de dos ejes de alta capacidad. Excelente equilibrio entre volumen de almacenamiento y fuerza operativa para cargas generales.",
      img: "assets/flota_sencillo.jpg",
      config: "C2 (Categoría Pesada)",
      axles: "2 ejes (1 eje delantero direccional, 1 eje trasero de tracción de doble rueda)",
      capacity: "Hasta 8.5 Toneladas de carga útil",
      pbv: "17.0 Toneladas de Peso Bruto Vehicular máximo autorizado (Col)",
      volume: "40 m³ de volumen útil de furgón",
      dimensions: "Largo: 8.5 m - 10.0 m | Ancho: 2.6 m | Alto: 2.6 m",
      intlAlert: "Totalmente homologado bajo la Decisión 491 de la Comunidad Andina para el transporte internacional de carga terrestre. Límite uniforme de 17 toneladas de Peso Bruto en Colombia, Ecuador y Perú."
    },
    dobletroque: {
      badge: "C3",
      name: "Camiones Dobletroque",
      desc: "Camión rígido pesado de tres ejes. Su doble troque motriz trasero le otorga una excelente estabilidad y tracción en la exigente topografía andina.",
      img: "assets/flota_dobletroque.jpg",
      config: "C3",
      axles: "3 ejes (1 eje delantero direccional, 2 ejes traseros motrices en tándem)",
      capacity: "Hasta 16.0 Toneladas de carga útil",
      pbv: "28.0 Toneladas de Peso Bruto Vehicular máximo autorizado (Col)",
      volume: "50 m³ de volumen útil",
      dimensions: "Largo: 10.0 m - 12.0 m | Ancho: 2.6 m | Alto: 2.8 m",
      intlAlert: "Vehículo ideal para el transporte transfronterizo en terrenos montañosos. Límite de Peso Bruto Vehicular unificado a 28 toneladas en todos los países miembros de la Comunidad Andina."
    },
    patineta: {
      badge: "C2-S2",
      name: "Patinetas (Minimulas)",
      desc: "Vehículo articulado compuesto por un cabezote de dos ejes y un semirremolque de dos ejes. Es la combinación perfecta para cargas de volumen con agilidad de maniobra.",
      img: "assets/flota_patineta.jpg",
      config: "C2-S2 (Tractocamión articulado de 4 ejes)",
      axles: "4 ejes totales (Cabezote C2 de 2 ejes [1 eje adelante] + Semirremolque S2 de 2 ejes traseros [2 ejes atrás] en tándem)",
      capacity: "Hasta 20.0 Toneladas de carga útil",
      pbv: "32.0 Toneladas de Peso Bruto Vehicular máximo autorizado (Col)",
      volume: "60 m³ de volumen útil",
      dimensions: "Semirremolque: 10.0 m - 11.5 m | Ancho: 2.6 m | Alto: 2.8 m",
      intlAlert: "¡Atención al peso por eje! El semirremolque cuenta con un eje tándem trasero limitado a un peso máximo estricto de 18 toneladas en báscula. Requiere una distribución muy equilibrada de la carga en los tránsitos fronterizos de Ecuador y Perú para evitar sanciones y demoras operativas."
    },
    tractomula: {
      badge: "C3-S3",
      name: "Tractomulas",
      desc: "Nuestra unidad de máxima capacidad para el transporte pesado de gran escala. Cuenta con un cabezote de tres ejes y un semirremolque de tres ejes traseros en trídem.",
      img: "assets/flota_tractomula.jpg",
      config: "C3-S3 (Tractocamión articulado de 6 ejes)",
      axles: "6 ejes totales (Cabezote C3 de 3 ejes [1 eje adelante, 2 ejes atrás] + Semirremolque S3 de 3 ejes traseros [3 ejes atrás] en trídem)",
      capacity: "Hasta 32.0 Toneladas de carga útil (Operación Nacional)",
      pbv: "52.0 Toneladas (Colombia) | 48.0 Toneladas (Ecuador y Perú)",
      volume: "75 m³ de volumen útil de furgón",
      dimensions: "Semirremolque: 12.2 m - 13.7 m (40 a 45 pies) | Ancho: 2.6 m | Alto: 2.8 m",
      intlAlert: "¡ALERTA CRÍTICA DE TRÁNSITO INTERNACIONAL! Aunque en Colombia el límite máximo de peso bruto es de 52 toneladas, en Ecuador y Perú (según la Decisión 491 de la CAN y la normativa del MTC) el peso bruto máximo permitido para la configuración de 6 ejes es de 48 toneladas. Todo despacho internacional debe planificarse con un límite estricto de 48 toneladas de Peso Bruto Vehicular en báscula para evitar multas severas e inmovilización."
    }
  };

  const fleetCards = document.querySelectorAll('.fleet-card');
  const fleetModal = document.getElementById('fleet-modal');
  const fleetModalOverlay = document.getElementById('fleet-modal-overlay');
  const fleetModalClose = document.getElementById('fleet-modal-close');

  // Elementos internos del modal
  const modalImg = document.getElementById('modal-vehicle-img');
  const modalBadge = document.getElementById('modal-vehicle-badge');
  const modalName = document.getElementById('modal-vehicle-name');
  const modalDesc = document.getElementById('modal-vehicle-desc');
  const specConfig = document.getElementById('spec-config');
  const specAxles = document.getElementById('spec-axles');
  const specCapacity = document.getElementById('spec-capacity');
  const specPbv = document.getElementById('spec-pbv');
  const specVolume = document.getElementById('spec-volume');
  const specDimensions = document.getElementById('spec-dimensions');
  const modalIntlText = document.getElementById('modal-intl-text');

  if (fleetCards && fleetModal) {
    
    // Abrir modal al hacer clic en una tarjeta
    fleetCards.forEach(card => {
      card.addEventListener('click', () => {
        const vehicleKey = card.getAttribute('data-vehicle');
        const data = vehicleData[vehicleKey];
        
        if (data) {
          // Poblar los datos del modal
          modalImg.src = data.img;
          modalImg.alt = data.name;
          modalBadge.textContent = data.badge;
          modalName.textContent = data.name;
          modalDesc.textContent = data.desc;
          
          specConfig.textContent = data.config;
          specAxles.textContent = data.axles;
          specCapacity.textContent = data.capacity;
          specPbv.textContent = data.pbv;
          specVolume.textContent = data.volume;
          specDimensions.textContent = data.dimensions;
          
          modalIntlText.textContent = data.intlAlert;
          
          // Mostrar modal con transiciones
          fleetModal.classList.add('open');
          fleetModal.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden'; // evitar scroll de fondo
        }
      });
    });

    // Cerrar modal al hacer clic en la X, en el overlay de fondo, o presionar Escape
    const closeModal = () => {
      fleetModal.classList.remove('open');
      fleetModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // reactivar scroll
    };

    if (fleetModalClose) {
      fleetModalClose.addEventListener('click', closeModal);
    }
    if (fleetModalOverlay) {
      fleetModalOverlay.addEventListener('click', closeModal);
    }

    // Tecla Escape para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fleetModal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // ==========================================================================
  // 5. SISTEMA DE NOTIFICACIONES FLOTANTES (TOASTS)
  // ==========================================================================
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    else if (type === 'info') icon = 'ℹ️';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Disparar animación
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remover automáticamente
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 5000);
  }

  // ==========================================================================
  // 6. INTERCEPTACIÓN DE FORMULARIO DE COTIZACIÓN Y ENVÍO DIRECTO (API)
  // ==========================================================================
  const cotizacionForm = document.getElementById('cotizacion-form');
  const quoteModal = document.getElementById('quote-success-modal');
  const quoteModalClose = document.getElementById('quote-modal-close');
  const quoteModalOverlay = document.getElementById('quote-modal-overlay');

  if (cotizacionForm && quoteModal) {
    // Interceptar el envío del formulario
    cotizacionForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Recopilar datos del formulario
      const nombre = document.getElementById('nombre').value;
      const empresa = document.getElementById('empresa').value || 'Particular / No especificada';
      const email = document.getElementById('email').value;
      const telefono = document.getElementById('telefono').value;
      const origen = document.getElementById('origen').value;
      const destino = document.getElementById('destino').value;
      const cargaPeso = document.getElementById('carga-peso').value;
      const cargaVolumen = document.getElementById('carga-volumen').value;
      const mensaje = document.getElementById('mensaje').value;

      // Deshabilitar botón para evitar doble clic
      const submitBtn = cotizacionForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generando PDF y Enviando...';
      }

      // Mostrar toast informativo
      showToast('Generando documento PDF de cotización...', 'info');

      // 1. Inyectar inmediatamente los datos en el elemento HTML para que el PDF se renderice con los datos reales
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const consecutivo = `OP-${randNum}`;
      const now = new Date();
      const fechaStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      document.getElementById('doc-quote-number').textContent = randNum;
      document.getElementById('doc-quote-date').textContent = fechaStr;
      document.getElementById('doc-client-name').textContent = nombre;
      document.getElementById('doc-client-company').textContent = empresa;
      document.getElementById('doc-client-email').textContent = email;
      document.getElementById('doc-client-phone').textContent = telefono;
      document.getElementById('doc-op-origin').textContent = origen;
      document.getElementById('doc-op-destination').textContent = destino;
      document.getElementById('doc-op-weight').textContent = parseFloat(cargaPeso).toFixed(1);
      document.getElementById('doc-op-volume').textContent = parseFloat(cargaVolumen).toFixed(1);
      document.getElementById('doc-op-desc').textContent = mensaje;

      // 2. Opciones de configuración para html2pdf
      const element = document.getElementById('printable-quote-format');
      const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4], // Margen
        filename:     `Cotizacion_${consecutivo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // 3. Generar el PDF y enviarlo
      html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
        // Mostrar toast de carga
        showToast('Enviando correo con PDF adjunto al servidor...', 'info');

        // Convertir el Blob de PDF a Base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1]; // Obtener solo la cadena base64 sin prefijo

          // Preparar la carga útil
          const payload = {
            nombre,
            empresa,
            email,
            telefono,
            origen,
            destino,
            cargaPeso,
            cargaVolumen,
            mensaje,
            pdfBase64: base64data,
            pdfFilename: `Cotizacion_${consecutivo}.pdf`
          };

          // Petición al backend local de Node.js
          fetch('/api/cotizacion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
          })
          .then(data => {
            // Habilitar botón de nuevo
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Enviar Solicitud de Cotización';
            }

            if (data.success) {
              // Actualizar datos con los reales del servidor si difieren (ej. fecha del servidor)
              document.getElementById('doc-quote-number').textContent = data.consecutivo.replace('OP-', '');
              document.getElementById('doc-quote-date').textContent = data.fecha;

              // Abrir el modal del Formato Oficial
              quoteModal.classList.add('open');
              quoteModal.setAttribute('aria-hidden', 'false');
              document.body.style.overflow = 'hidden';

              // Mostrar toast de éxito final
              showToast('¡Cotización enviada exitosamente con PDF adjunto!', 'success');
            } else {
              throw new Error(data.error || 'Error desconocido.');
            }
          })
          .catch(error => {
            handleFormError(error);
          });
        };
      }).catch(err => {
        handleFormError(err);
      });

      // Función auxiliar para manejar errores y lanzar el fallback mailto
      function handleFormError(error) {
        // Habilitar botón
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar Solicitud de Cotización';
        }
        
        console.error('Error al procesar o enviar cotización:', error);
        
        // Mensaje de advertencia
        showToast('Error de envío directo. Usando gestor de correo alternativo local...', 'warning');

        // Abrir el modal de todos modos para que el usuario tenga su copia
        quoteModal.classList.add('open');
        quoteModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Disparar mailto alternativo
        const destEmail = 'administacion@opelcarsas.com';
        const subjectText = `Nueva Solicitud de Cotización ${consecutivo} - ${nombre}`;
        const emailBodyText = `==================================================
SOLICITUD DE COTIZACIÓN - OPELCAR S.A.S
==================================================
No. Documento: ${consecutivo}
Fecha: ${fechaStr}

DATOS DEL CLIENTE:
--------------------------------------------------
Nombre Completo: ${nombre}
Empresa: ${empresa}
Correo Electrónico: ${email}
Teléfono: ${telefono}

DETALLES DE LA OPERACIÓN LOGÍSTICA:
--------------------------------------------------
Ruta: ${origen} -> ${destino}
Peso / Carga Requerida: ${cargaPeso} Toneladas (Ton)
Volumen Declarado: ${cargaVolumen} m³ (Metros Cúbicos)

DESCRIPCIÓN DE LA MERCANCÍA Y REQUERIMIENTOS:
--------------------------------------------------
${mensaje}

==================================================
Mensaje de respaldo generado automáticamente
==================================================`;

        setTimeout(() => {
          window.location.href = `mailto:${destEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(emailBodyText)}`;
        }, 1500);
      }
    });

    // Cerrar modal de éxito
    const closeSuccessModal = () => {
      quoteModal.classList.remove('open');
      quoteModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      cotizacionForm.reset(); // resetear formulario tras cierre
    };

    if (quoteModalClose) {
      quoteModalClose.addEventListener('click', closeSuccessModal);
    }
    if (quoteModalOverlay) {
      quoteModalOverlay.addEventListener('click', closeSuccessModal);
    }

    // Tecla Escape para cerrar success modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && quoteModal.classList.contains('open')) {
        closeSuccessModal();
      }
    });

    // Acción del botón: Cerrar Ventana
    const btnCloseSuccess = document.getElementById('btn-close-success');
    if (btnCloseSuccess) {
      btnCloseSuccess.addEventListener('click', closeSuccessModal);
    }

    // Acción del botón: Imprimir Ficha / Guardar PDF
    const btnPrintPdf = document.getElementById('btn-print-pdf');
    if (btnPrintPdf) {
      btnPrintPdf.addEventListener('click', () => {
        showToast('Abriendo ventana de impresión nativa...', 'info');
        window.print();
      });
    }
  }
});
