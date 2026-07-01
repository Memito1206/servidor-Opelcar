document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTOS DEL DOM
  const loginScreen = document.getElementById('login-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');
  const loginForm = document.getElementById('login-form');
  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  const userEmailDisplay = document.getElementById('user-email-display');
  const btnLogoutAction = document.getElementById('btn-logout-action');

  // KPIs
  const kpiTotalQuotes = document.getElementById('kpi-total-quotes');
  const kpiTotalWeight = document.getElementById('kpi-total-weight');
  const kpiTotalVolume = document.getElementById('kpi-total-volume');
  const kpiTotalClients = document.getElementById('kpi-total-clients');

  // Filtros
  const searchInputField = document.getElementById('search-input-field');
  const filterOriginSelect = document.getElementById('filter-origin-select');
  const filterDestinationSelect = document.getElementById('filter-destination-select');

  // Tabla
  const quotesTableBody = document.getElementById('quotes-table-body');

  // Modal de Detalle
  const detailModal = document.getElementById('detail-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCloseModalFooter = document.getElementById('btn-close-modal-footer');
  const btnPrintDocument = document.getElementById('btn-print-document');

  // Elementos del Modal Imprimible
  const modalTitleConsecutivo = document.getElementById('modal-title-consecutivo');
  const printConsecutivo = document.getElementById('print-consecutivo');
  const printDate = document.getElementById('print-date');
  const printClientName = document.getElementById('print-client-name');
  const printClientCompany = document.getElementById('print-client-company');
  const printClientEmail = document.getElementById('print-client-email');
  const printClientPhone = document.getElementById('print-client-phone');
  const printOrigin = document.getElementById('print-origin');
  const printDestination = document.getElementById('print-destination');
  const printWeight = document.getElementById('print-weight');
  const printVolume = document.getElementById('print-volume');
  const printMessage = document.getElementById('print-message');

  // VARIABLES GLOBALES DE ESTADO
  let quotesList = [];
  let token = sessionStorage.getItem('admin_token');
  let userEmail = sessionStorage.getItem('admin_email');

  // 1. INICIALIZACIÓN
  const init = () => {
    if (token) {
      showDashboard();
    } else {
      showLogin();
    }
  };

  const showLogin = () => {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
    sessionStorage.clear();
    token = null;
    userEmail = null;
  };

  const showDashboard = () => {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'flex';
    userEmailDisplay.textContent = userEmail;
    loadQuotes();
  };

  // TOAST / NOTIFICACIONES
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };

  // 2. INICIO DE SESIÓN
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmailInput.value;
      const password = loginPasswordInput.value;

      showToast('Autenticando...', 'info');

      fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || 'Credenciales inválidas'); });
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.token) {
          sessionStorage.setItem('admin_token', data.token);
          sessionStorage.setItem('admin_email', email);
          token = data.token;
          userEmail = email;
          showToast('Sesión iniciada correctamente.', 'success');
          showDashboard();
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      })
      .catch(err => {
        showToast(err.message, 'error');
      });
    });
  }

  // 3. RECUPERAR COTIZACIONES
  const loadQuotes = () => {
    fetch('/api/admin/cotizaciones', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (res.status === 401) {
        showToast('Su sesión ha expirado.', 'warning');
        showLogin();
        throw new Error('No autorizado');
      }
      if (!res.ok) {
        throw new Error('Error al leer las cotizaciones');
      }
      return res.json();
    })
    .then(data => {
      if (data.success && data.cotizaciones) {
        quotesList = data.cotizaciones;
        updateKPIs();
        populateFilters();
        renderTable(quotesList);
      }
    })
    .catch(err => {
      if (err.message !== 'No autorizado') {
        showToast(err.message, 'error');
      }
    });
  };

  // 4. ACTUALIZAR ESTADÍSTICAS (KPIs)
  const updateKPIs = () => {
    kpiTotalQuotes.textContent = quotesList.length;

    let totalWeight = 0;
    let totalVolume = 0;
    const uniqueClients = new Set();

    quotesList.forEach(q => {
      totalWeight += parseFloat(q.cargaPeso || 0);
      totalVolume += parseFloat(q.cargaVolumen || 0);
      uniqueClients.add(q.email.toLowerCase().trim());
    });

    kpiTotalWeight.textContent = `${totalWeight.toFixed(1)} Ton`;
    kpiTotalVolume.textContent = `${totalVolume.toFixed(1)} m³`;
    kpiTotalClients.textContent = uniqueClients.size;
  };

  // 5. POBLAR FILTROS DINÁMICOS
  const populateFilters = () => {
    const origins = new Set();
    const destinations = new Set();

    quotesList.forEach(q => {
      if (q.origen) origins.add(q.origen.trim());
      if (q.destino) destinations.add(q.destino.trim());
    });

    // Guardar valores seleccionados actuales para preservarlos
    const currentOrigin = filterOriginSelect.value;
    const currentDest = filterDestinationSelect.value;

    // Poblar Origen
    filterOriginSelect.innerHTML = '<option value="">Todos los Orígenes</option>';
    Array.from(origins).sort().forEach(o => {
      filterOriginSelect.innerHTML += `<option value="${o}">${o}</option>`;
    });

    // Poblar Destino
    filterDestinationSelect.innerHTML = '<option value="">Todos los Destinos</option>';
    Array.from(destinations).sort().forEach(d => {
      filterDestinationSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });

    // Restaurar selecciones
    filterOriginSelect.value = currentOrigin;
    filterDestinationSelect.value = currentDest;
  };

  // 6. RENDERIZAR TABLA DE DATOS
  const renderTable = (list) => {
    quotesTableBody.innerHTML = '';

    if (list.length === 0) {
      quotesTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">📂</div>
              <h3>No se encontraron cotizaciones</h3>
              <p>No hay solicitudes que coincidan con la búsqueda o filtros aplicados.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(q => {
      const tr = document.createElement('tr');
      
      const consecutivoDisplay = q.consecutivo || 'N/A';
      const fechaDisplay = q.fecha || 'N/A';
      const nombreDisplay = q.nombre || 'Particular / Desconocido';
      const empresaDisplay = q.empresa || 'Particular / No especificada';
      const rutaDisplay = `${q.origen} <span class="route-arrow">→</span> ${q.destino}`;
      const cargaDisplay = `${parseFloat(q.cargaPeso).toFixed(1)} Ton / ${parseFloat(q.cargaVolumen).toFixed(1)} m³`;
      const statusClass = (q.status || 'pendiente').toLowerCase();

      tr.innerHTML = `
        <td class="td-number">${consecutivoDisplay}</td>
        <td>${fechaDisplay}</td>
        <td><strong>${nombreDisplay}</strong></td>
        <td>${empresaDisplay}</td>
        <td><div class="td-route">${rutaDisplay}</div></td>
        <td>${cargaDisplay}</td>
        <td><span class="badge-status ${statusClass}">${statusClass}</span></td>
        <td><button class="btn-action" data-consecutivo="${consecutivoDisplay}">Ver Detalle</button></td>
      `;

      quotesTableBody.appendChild(tr);
    });

    // Añadir eventos a los botones de acción
    const detailButtons = quotesTableBody.querySelectorAll('.btn-action');
    detailButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-consecutivo');
        openDetailModal(id);
      });
    });
  };

  // 7. FILTRADO Y BÚSQUEDA EN TIEMPO REAL
  const applyFilters = () => {
    const searchQuery = searchInputField.value.toLowerCase().trim();
    const originFilter = filterOriginSelect.value;
    const destFilter = filterDestinationSelect.value;

    const filteredList = quotesList.filter(q => {
      // Filtro de Búsqueda de Texto
      const matchesSearch = 
        q.consecutivo.toLowerCase().includes(searchQuery) ||
        q.nombre.toLowerCase().includes(searchQuery) ||
        q.empresa.toLowerCase().includes(searchQuery) ||
        q.email.toLowerCase().includes(searchQuery) ||
        q.telefono.includes(searchQuery) ||
        q.origen.toLowerCase().includes(searchQuery) ||
        q.destino.toLowerCase().includes(searchQuery) ||
        (q.mensaje && q.mensaje.toLowerCase().includes(searchQuery));

      // Filtros desplegables
      const matchesOrigin = !originFilter || q.origen === originFilter;
      const matchesDest = !destFilter || q.destino === destFilter;

      return matchesSearch && matchesOrigin && matchesDest;
    });

    renderTable(filteredList);
  };

  if (searchInputField) searchInputField.addEventListener('input', applyFilters);
  if (filterOriginSelect) filterOriginSelect.addEventListener('change', applyFilters);
  if (filterDestinationSelect) filterDestinationSelect.addEventListener('change', applyFilters);

  // 8. MODAL DE DETALLE Y VISTA DE IMPRESIÓN
  const openDetailModal = (consecutivo) => {
    const quote = quotesList.find(q => q.consecutivo === consecutivo);
    if (!quote) {
      showToast('No se encontró la cotización seleccionada.', 'error');
      return;
    }

    // Poblar elementos del modal
    modalTitleConsecutivo.textContent = `Detalles de Cotización ${quote.consecutivo}`;
    printConsecutivo.textContent = quote.consecutivo.replace('OP-', '');
    printDate.textContent = quote.fecha || 'N/A';
    printClientName.textContent = quote.nombre;
    printClientCompany.textContent = quote.empresa || 'Particular / No especificada';
    printClientEmail.textContent = quote.email;
    printClientPhone.textContent = quote.telefono;
    printOrigin.textContent = quote.origen;
    printDestination.textContent = quote.destino;
    printWeight.textContent = parseFloat(quote.cargaPeso).toFixed(1);
    printVolume.textContent = parseFloat(quote.cargaVolumen).toFixed(1);
    printMessage.textContent = quote.mensaje || 'Sin observaciones.';

    // Abrir Modal
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCloseModalFooter) btnCloseModalFooter.addEventListener('click', closeModal);
  
  // Cerrar haciendo clic en el fondo oscuro
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        closeModal();
      }
    });
  }

  // Cerrar al pulsar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Imprimir ficha técnica
  if (btnPrintDocument) {
    btnPrintDocument.addEventListener('click', () => {
      window.print();
    });
  }

  // 9. CIERRE DE SESIÓN
  if (btnLogoutAction) {
    btnLogoutAction.addEventListener('click', () => {
      // Opcional: Notificar al servidor para destruir token
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).finally(() => {
        showToast('Sesión cerrada correctamente.', 'info');
        showLogin();
      });
    });
  }

  // Iniciar ejecución
  init();
});
