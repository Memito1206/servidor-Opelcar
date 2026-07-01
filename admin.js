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

  // NUEVOS ELEMENTOS DEL GENERADOR DE COTIZACIONES
  const detailsView = document.getElementById('details-view');
  const editorView = document.getElementById('editor-view');
  const modalContainerElem = document.getElementById('modal-container-elem');
  const detailsModalFooter = document.getElementById('details-modal-footer');
  const editorModalFooter = document.getElementById('editor-modal-footer');

  const btnStartQuoteAction = document.getElementById('btn-start-quote-action');
  const btnBackToDetails = document.getElementById('btn-back-to-details');
  const btnPrintQuote = document.getElementById('btn-print-quote');
  const btnSendQuoteEmail = document.getElementById('btn-send-quote-email');

  const editTemplateSelect = document.getElementById('edit-template-select');
  const editClientName = document.getElementById('edit-client-name');
  const editClientCompany = document.getElementById('edit-client-company');
  const editClientEmail = document.getElementById('edit-client-email');
  const editClientPhone = document.getElementById('edit-client-phone');
  const editConsecutivo = document.getElementById('edit-consecutivo');
  const editDate = document.getElementById('edit-date');

  const editorDynamicSection = document.getElementById('editor-dynamic-section');
  const editIncludesContainer = document.getElementById('edit-includes-container');
  const btnAddIncludeField = document.getElementById('btn-add-include-field');
  const editNotesArea = document.getElementById('edit-notes-area');
  const editorPreviewPaper = document.getElementById('editor-preview-paper');

  // VARIABLES GLOBALES DE ESTADO
  let quotesList = [];
  let token = sessionStorage.getItem('admin_token');
  let userEmail = sessionStorage.getItem('admin_email');
  let currentQuote = null;
  let editorState = {};

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

    currentQuote = quote;

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

    hideEditorView();

    // Abrir Modal
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
  };

  // 8.1 FUNCIONES DEL GENERADOR Y EDITOR DE COTIZACIONES
  const hideEditorView = () => {
    modalContainerElem.classList.remove('editor-mode');
    detailsView.style.display = 'block';
    editorView.style.display = 'none';
    detailsModalFooter.style.display = 'flex';
    editorModalFooter.style.display = 'none';
    if (currentQuote) {
      modalTitleConsecutivo.textContent = `Detalles de Cotización ${currentQuote.consecutivo}`;
    }
  };

  const showEditorView = () => {
    modalContainerElem.classList.add('editor-mode');
    detailsView.style.display = 'none';
    editorView.style.display = 'block';
    detailsModalFooter.style.display = 'none';
    editorModalFooter.style.display = 'flex';
    if (currentQuote) {
      modalTitleConsecutivo.textContent = `Generador de Cotización ${currentQuote.consecutivo}`;
    }
  };

  const estimateVehicle = (weight) => {
    const w = parseFloat(weight || 0);
    if (w <= 4.5) return { type: 'TURBO', capacity: 'HASTA 4.5 TONELADAS' };
    if (w <= 10.0) return { type: 'SENCILLO', capacity: 'HASTA 10 TONELADAS' };
    if (w <= 18.0) return { type: 'DOBLE TROQUE', capacity: 'HASTA 18 TONELADAS' };
    return { type: 'TRACTOMULA', capacity: 'HASTA 34 TONELADAS' };
  };

  const getDefaultIncludes = (tpl) => {
    if (tpl === 'transporte') {
      return [
        "Información permanente al correo electrónico o al whatsapp, sobre el trayecto de la mercancía.",
        `Descargue en ${currentQuote ? currentQuote.destino : 'destino'}.`,
        "Bodega en Opelcar Internacional (Cra 8a # 25a - 97) Ipiales por un periodo de 8 días de cortesía."
      ];
    } else if (tpl === 'bodega') {
      return [
        "Cargue, Descargue en bodega.",
        "Documentos de cruce de frontera (Carta porte, Manifiesto Internacional y planilla de traslado).",
        "Informe fotográfico vía Internet sobre el recibimiento y entrega de sus mercancías.",
        "Bodega en Ipiales en la carrera 8a No. 25a-79 por el periodo de almacenamiento."
      ];
    } else { // combinada
      return [
        "Cargue , Descargue y acomodación.",
        "Costo de bascula.",
        "Documentos de cruce de frontera (Carta porte, Manifiesto Internacional y planilla de traslado).",
        "Informe fotográfico vía Internet sobre el recibimiento y entrega de sus mercancías.",
        "Bodega en Ipiales en la carrera 8a No. 25a-79."
      ];
    }
  };

  const initEditorState = () => {
    if (!currentQuote) return;

    const est = estimateVehicle(currentQuote.cargaPeso);
    const today = new Date();
    const formattedDate = `Ipiales, ${today.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    editorState = {
      template: 'transporte',
      clientName: currentQuote.nombre || '',
      clientCompany: currentQuote.empresa || '',
      clientEmail: currentQuote.email || '',
      clientPhone: currentQuote.telefono || '',
      consecutivo: currentQuote.consecutivo || '',
      date: formattedDate,
      
      // Transporte
      trayecto: `${currentQuote.origen.toUpperCase()} - ${currentQuote.destino.toUpperCase()}`,
      vehiculo: est.type,
      capacidad: est.capacity,
      valor: est.type === 'TURBO' ? 3200000 : est.type === 'SENCILLO' ? 5800000 : est.type === 'DOBLE TROQUE' ? 8900000 : 12280000,

      // Bodega
      bodegaTurbo: 183000,
      bodegaSencillo: 220000,
      bodegaTracto: 365000,
      fobPercent: 0.27,
      fobMin: 154500,
      
      // Estibas
      estibasMin: 17000,
      estibas5T: 78000,
      estibas10T: 105000,
      estibasDoble: 190000,
      estibasTracto: 250000,

      // Combinado Urbano
      urbanoTurbo: 660000,
      urbanoSencillo: 1030000,
      
      // Documentos
      docEcuapaz: 80000,
      docCompleto: 100000,

      // Inclusiones y Notas
      includes: getDefaultIncludes('transporte'),
      notes: "Nota: Los costos que se generen en origen en el momento del cargue no están incluidos. Cualquier inquietud a la presente por favor hacernos conocer."
    };

    // Vincular al formulario
    editTemplateSelect.value = editorState.template;
    editClientName.value = editorState.clientName;
    editClientCompany.value = editorState.clientCompany;
    editClientEmail.value = editorState.clientEmail;
    editClientPhone.value = editorState.clientPhone;
    editConsecutivo.value = editorState.consecutivo;
    editDate.value = editorState.date;
    editNotesArea.value = editorState.notes;

    renderDynamicSection();
    renderIncludes();
    updatePreview();
  };

  const renderDynamicSection = () => {
    const tpl = editorState.template;
    editorDynamicSection.innerHTML = '';

    if (tpl === 'transporte') {
      editorDynamicSection.innerHTML = `
        <h4 style="margin-bottom: 12px; color: var(--primary); font-size: 12px; font-weight: 800; text-transform: uppercase;">2. Detalles del Transporte Terrestre</h4>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Trayecto</label>
          <input type="text" id="edit-trayecto" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:8px; font-size:13px;" value="${editorState.trayecto}">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Vehículo</label>
            <input type="text" id="edit-vehiculo" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:8px; font-size:13px;" value="${editorState.vehiculo}">
          </div>
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Capacidad</label>
            <input type="text" id="edit-capacidad" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:8px; font-size:13px;" value="${editorState.capacidad}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Valor del Transporte ($)</label>
          <input type="number" id="edit-valor" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:8px; font-size:13px;" value="${editorState.valor}">
        </div>
      `;
      
      // Bind event listeners
      document.getElementById('edit-trayecto').addEventListener('input', (e) => { editorState.trayecto = e.target.value; updatePreview(); });
      document.getElementById('edit-vehiculo').addEventListener('input', (e) => { editorState.vehiculo = e.target.value; updatePreview(); });
      document.getElementById('edit-capacidad').addEventListener('input', (e) => { editorState.capacidad = e.target.value; updatePreview(); });
      document.getElementById('edit-valor').addEventListener('input', (e) => { editorState.valor = parseFloat(e.target.value || 0); updatePreview(); });

    } else if (tpl === 'bodega') {
      editorDynamicSection.innerHTML = `
        <h4 style="margin-bottom: 12px; color: var(--primary); font-size: 12px; font-weight: 800; text-transform: uppercase;">2. Tarifas del Servicio de Bodega y Manipulación</h4>
        
        <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Tarifas Almacenamiento (15 días)</label>
        <table class="form-table-compact" style="margin-bottom: 12px;">
          <thead>
            <tr>
              <th>Turbo ($)</th>
              <th>Sencillo ($)</th>
              <th>Tractomula ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="number" id="edit-bodega-turbo" class="form-table-input" value="${editorState.bodegaTurbo}"></td>
              <td><input type="number" id="edit-bodega-sencillo" class="form-table-input" value="${editorState.bodegaSencillo}"></td>
              <td><input type="number" id="edit-bodega-tracto" class="form-table-input" value="${editorState.bodegaTracto}"></td>
            </tr>
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Cobro FOB (%)</label>
            <input type="number" step="0.01" id="edit-fob-percent" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:6px; font-size:12px;" value="${editorState.fobPercent}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Mínimo FOB ($)</label>
            <input type="number" id="edit-fob-min" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:6px; font-size:12px;" value="${editorState.fobMin}">
          </div>
        </div>

        <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Tarifas de Cargue / Descargue de Estibas</label>
        <table class="form-table-compact">
          <thead>
            <tr>
              <th>Caja ($)</th>
              <th>Hasta 5T ($)</th>
              <th>Hasta 10T ($)</th>
              <th>Doble T. ($)</th>
              <th>Tracto ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="number" id="edit-estibas-min" class="form-table-input" value="${editorState.estibasMin}"></td>
              <td><input type="number" id="edit-estibas-5t" class="form-table-input" value="${editorState.estibas5T}"></td>
              <td><input type="number" id="edit-estibas-10t" class="form-table-input" value="${editorState.estibas10T}"></td>
              <td><input type="number" id="edit-estibas-doble" class="form-table-input" value="${editorState.estibasDoble}"></td>
              <td><input type="number" id="edit-estibas-tracto" class="form-table-input" value="${editorState.estibasTracto}"></td>
            </tr>
          </tbody>
        </table>
      `;

      // Bind event listeners
      document.getElementById('edit-bodega-turbo').addEventListener('input', (e) => { editorState.bodegaTurbo = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-bodega-sencillo').addEventListener('input', (e) => { editorState.bodegaSencillo = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-bodega-tracto').addEventListener('input', (e) => { editorState.bodegaTracto = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-fob-percent').addEventListener('input', (e) => { editorState.fobPercent = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-fob-min').addEventListener('input', (e) => { editorState.fobMin = parseFloat(e.target.value || 0); updatePreview(); });
      
      document.getElementById('edit-estibas-min').addEventListener('input', (e) => { editorState.estibasMin = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-5t').addEventListener('input', (e) => { editorState.estibas5T = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-10t').addEventListener('input', (e) => { editorState.estibas10T = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-doble').addEventListener('input', (e) => { editorState.estibasDoble = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-tracto').addEventListener('input', (e) => { editorState.estibasTracto = parseFloat(e.target.value || 0); updatePreview(); });

    } else { // combinada
      editorDynamicSection.innerHTML = `
        <h4 style="margin-bottom: 12px; color: var(--primary); font-size: 12px; font-weight: 800; text-transform: uppercase;">2. Tarifas Combinadas (Urbano + Bodega + Docs)</h4>
        
        <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Transporte Urbano Ipiales - Tulcán</label>
        <table class="form-table-compact" style="margin-bottom: 12px;">
          <thead>
            <tr>
              <th>Carga 0 a 4.500 Kg ($)</th>
              <th>Carga 4.501 a 9.500 Kg ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="number" id="edit-urbano-turbo" class="form-table-input" value="${editorState.urbanoTurbo}"></td>
              <td><input type="number" id="edit-urbano-sencillo" class="form-table-input" value="${editorState.urbanoSencillo}"></td>
            </tr>
          </tbody>
        </table>

        <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Tarifas de Cargue / Descargue de Estibas</label>
        <table class="form-table-compact" style="margin-bottom: 12px;">
          <thead>
            <tr>
              <th>Caja ($)</th>
              <th>Hasta 5T ($)</th>
              <th>Hasta 10T ($)</th>
              <th>Doble T. ($)</th>
              <th>Tracto ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="number" id="edit-estibas-min" class="form-table-input" value="${editorState.estibasMin}"></td>
              <td><input type="number" id="edit-estibas-5t" class="form-table-input" value="${editorState.estibas5T}"></td>
              <td><input type="number" id="edit-estibas-10t" class="form-table-input" value="${editorState.estibas10T}"></td>
              <td><input type="number" id="edit-estibas-doble" class="form-table-input" value="${editorState.estibasDoble}"></td>
              <td><input type="number" id="edit-estibas-tracto" class="form-table-input" value="${editorState.estibasTracto}"></td>
            </tr>
          </tbody>
        </table>

        <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Tarifas Trámites Documentos</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Con Ecuapaz ($)</label>
            <input type="number" id="edit-doc-ecuapaz" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:6px; font-size:12px;" value="${editorState.docEcuapaz}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px; color:#475569;">Juego Completo ($)</label>
            <input type="number" id="edit-doc-completo" class="form-input" style="background:#ffffff; color:#000000; border:1px solid #cbd5e1; padding:6px; font-size:12px;" value="${editorState.docCompleto}">
          </div>
        </div>
      `;

      // Bind event listeners
      document.getElementById('edit-urbano-turbo').addEventListener('input', (e) => { editorState.urbanoTurbo = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-urbano-sencillo').addEventListener('input', (e) => { editorState.urbanoSencillo = parseFloat(e.target.value || 0); updatePreview(); });
      
      document.getElementById('edit-estibas-min').addEventListener('input', (e) => { editorState.estibasMin = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-5t').addEventListener('input', (e) => { editorState.estibas5T = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-10t').addEventListener('input', (e) => { editorState.estibas10T = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-doble').addEventListener('input', (e) => { editorState.estibasDoble = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-estibas-tracto').addEventListener('input', (e) => { editorState.estibasTracto = parseFloat(e.target.value || 0); updatePreview(); });

      document.getElementById('edit-doc-ecuapaz').addEventListener('input', (e) => { editorState.docEcuapaz = parseFloat(e.target.value || 0); updatePreview(); });
      document.getElementById('edit-doc-completo').addEventListener('input', (e) => { editorState.docCompleto = parseFloat(e.target.value || 0); updatePreview(); });
    }
  };

  const renderIncludes = () => {
    editIncludesContainer.innerHTML = '';
    editorState.includes.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'input-row-flex';
      div.innerHTML = `
        <input type="text" class="include-item-input" value="${item}" data-index="${idx}">
        <button type="button" class="btn-icon-del" data-index="${idx}">&times;</button>
      `;

      // Evento edición
      div.querySelector('input').addEventListener('input', (e) => {
        const i = parseInt(e.target.getAttribute('data-index'), 10);
        editorState.includes[i] = e.target.value;
        updatePreview();
      });

      // Evento eliminación
      div.querySelector('.btn-icon-del').addEventListener('click', () => {
        editorState.includes.splice(idx, 1);
        renderIncludes();
        updatePreview();
      });

      editIncludesContainer.appendChild(div);
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const updatePreview = () => {
    const tpl = editorState.template;
    
    // Membrete oficial
    let previewHtml = `
      <div class="paper-header">
        <div class="paper-logo-box">
          <h3>OPELCAR<span>.</span></h3>
          <p>Operador Logístico de Carga Internacional S.A.S</p>
        </div>
        <div class="paper-meta-box">
          <div class="paper-meta-title">COTIZACIÓN COMERCIAL</div>
          <div class="paper-meta-number">No. OP-${editorState.consecutivo}</div>
          <div class="paper-meta-date">${editorState.date}</div>
        </div>
      </div>

      <table class="paper-client-info">
        <tr>
          <th>Señores:</th>
          <td><strong>${editorState.clientName.toUpperCase()}</strong></td>
          <th>Empresa:</th>
          <td>${(editorState.clientCompany || 'Particular').toUpperCase()}</td>
        </tr>
        <tr>
          <th>Email:</th>
          <td>${editorState.clientEmail}</td>
          <th>Teléfono:</th>
          <td>${editorState.clientPhone}</td>
        </tr>
      </table>
    `;

    if (tpl === 'transporte') {
      previewHtml += `
        <div class="paper-intro">
          Permítame agradecer su amable atención y solicitud de cotización del transporte de sus mercancías. Con el objetivo de formalizar nuestro servicio a continuación me permito detallarlo:
        </div>

        <div class="paper-section-title">Detalles del Servicio Requerido</div>
        <table class="paper-table">
          <thead>
            <tr>
              <th>Trayecto</th>
              <th>Vehículo</th>
              <th>Capacidad</th>
              <th>Valor del Servicio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${editorState.trayecto}</strong></td>
              <td>${editorState.vehiculo}</td>
              <td>${editorState.capacidad}</td>
              <td><strong style="color: var(--accent); font-size:12px;">${formatCurrency(editorState.valor)}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (tpl === 'bodega') {
      previewHtml += `
        <div class="paper-intro">
          Permítame, a continuación detallar nuestra oferta comercial, la cual incluye valores correspondientes a los siguientes servicios: Transporte Urbano entre Ipiales y Tulcán, cargues, descargues, servicio de descargue de estibas, almacenaje, embalaje y distribución de mercancías, además transporte nacional e internacional.
        </div>

        <div class="paper-section-title" style="color: var(--primary); border-bottom: 2px solid #cbd5e1; padding-bottom:4px; font-weight:700;">
          REF. SERVICIO DE BODEGA ${new Date().getFullYear()} - Carrera 8a No. 25a-79
        </div>
        <div class="paper-intro" style="margin-top: 8px; margin-bottom: 8px;">
          Para mercancías que no se realice el transporte se cobrará así por 15 días:
        </div>
        <table class="paper-table">
          <thead>
            <tr>
              <th style="width: 65%;">Concepto / Vehículo Entrada</th>
              <th>Tarifa por 15 Días</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">Por entrada o por vehículo turbo</td>
              <td><strong>${formatCurrency(editorState.bodegaTurbo)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Por entrada de vehículo sencillo</td>
              <td><strong>${formatCurrency(editorState.bodegaSencillo)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Por entrada de vehículo tracto camión</td>
              <td><strong>${formatCurrency(editorState.bodegaTracto)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left; font-style: italic;">O cobro por valor declarado en aduana (FOB)</td>
              <td><strong>${editorState.fobPercent}% FOB</strong> (Mín. ${formatCurrency(editorState.fobMin)})</td>
            </tr>
          </tbody>
        </table>

        <div class="paper-section-title" style="color: var(--primary); border-bottom: 2px solid #cbd5e1; padding-bottom:4px; margin-top:20px; font-weight:700;">
          REF. SERVICIO DE DESCARGUE O CARGUE DE ESTIBAS ${new Date().getFullYear()}
        </div>
        <table class="paper-table">
          <thead>
            <tr>
              <th style="width: 65%;">Mercancía en Cantidad o Vehículo</th>
              <th>Valor por Evento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">Mínima de 1 a 3 huacales</td>
              <td><strong>${formatCurrency(editorState.estibasMin)} x huacal</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Más de 3 huacales a 5 Toneladas</td>
              <td><strong>${formatCurrency(editorState.estibas5T)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo hasta 10 Toneladas (Sencillo)</td>
              <td><strong>${formatCurrency(editorState.estibas10T)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo Doble Troque</td>
              <td><strong>${formatCurrency(editorState.estibasDoble)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo Tractomula</td>
              <td><strong>${formatCurrency(editorState.estibasTracto)}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    } else { // combinada
      previewHtml += `
        <div class="paper-intro">
          Permítame, a continuación detallar nuestra oferta comercial de servicios combinados urbanos, de bodegaje y trámites internacionales:
        </div>

        <div class="paper-section-title" style="color: var(--primary); border-bottom: 2px solid #cbd5e1; padding-bottom:4px; font-weight:700;">
          TARIFAS DE TRANSPORTE URBANO: IPIALES - TULCAN ${new Date().getFullYear()}
        </div>
        <table class="paper-table">
          <thead>
            <tr>
              <th style="width: 65%;">Peso de la Carga (Kilogramos)</th>
              <th>Valor del Trayecto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">Carga de 001 a 4.500 Kg</td>
              <td><strong>${formatCurrency(editorState.urbanoTurbo)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Carga de 4.501 a 9.500 Kg</td>
              <td><strong>${formatCurrency(editorState.urbanoSencillo)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="paper-section-title" style="color: var(--primary); border-bottom: 2px solid #cbd5e1; padding-bottom:4px; margin-top:20px; font-weight:700;">
          REF. SERVICIO DE DESCARGUE O CARGUE DE ESTIBAS ${new Date().getFullYear()}
        </div>
        <table class="paper-table">
          <thead>
            <tr>
              <th style="width: 65%;">Mercancía en Cantidad o Vehículo</th>
              <th>Valor por Evento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">Mínima de 1 a 3 huacales</td>
              <td><strong>${formatCurrency(editorState.estibasMin)} x huacal</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Más de 3 huacales a 5 Toneladas</td>
              <td><strong>${formatCurrency(editorState.estibas5T)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo hasta 10 Toneladas (Sencillo)</td>
              <td><strong>${formatCurrency(editorState.estibas10T)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo Doble Troque</td>
              <td><strong>${formatCurrency(editorState.estibasDoble)}</strong></td>
            </tr>
            <tr>
              <td style="text-align: left;">Vehículo Tractomula</td>
              <td><strong>${formatCurrency(editorState.estibasTracto)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="paper-section-title" style="color: var(--primary); border-bottom: 2px solid #cbd5e1; padding-bottom:4px; margin-top:20px; font-weight:700;">
          REF. SERVICIO DE DOCUMENTOS CPI Y MFI ${new Date().getFullYear()}
        </div>
        <div class="paper-intro" style="margin-top: 8px;">
          El juego de documentos está en un valor de <strong>${formatCurrency(editorState.docEcuapaz)}</strong> incluyendo ingreso a ECUAPAZ. 
          Con referencia a la elaboración completa de documentos (Carta de porte, manifiesto y fotocopias) el costo es de <strong>${formatCurrency(editorState.docCompleto)}</strong>.
        </div>
      `;
    }

    // Inclusiones, notas y firma
    previewHtml += `
      <div class="paper-section-title">Condiciones Comerciales e Inclusiones</div>
      <ul class="paper-bullets">
        ${editorState.includes.map(inc => `<li>${inc}</li>`).join('')}
      </ul>

      <div class="paper-notes">
        ${editorState.notes.replace(/\n/g, '<br>')}
      </div>

      <div class="paper-sign-section">
        <div class="paper-sign-line">YULLY ERAZO</div>
        <div class="paper-sign-title">Gerente General - Opelcar Internacional S.A.S</div>
      </div>

      <div class="paper-footer">
        <p>Nuestro servicio es respaldado por la garantía que nos brinda la experiencia.</p>
        <p><strong>Dirección:</strong> Carrera 8va No. 25a - 97, Ipiales, Colombia — <strong>NIT:</strong> 900.645.921-1</p>
        <p><strong>Teléfonos:</strong> 7731007 - 3162955438 - 3174335897 | <strong>Email:</strong> gerencia@opelcarsas.com</p>
      </div>
    `;

    editorPreviewPaper.innerHTML = previewHtml;
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

  // BINDING DE EVENTOS DEL EDITOR DE COTIZACIONES
  if (btnStartQuoteAction) {
    btnStartQuoteAction.addEventListener('click', () => {
      showEditorView();
      initEditorState();
    });
  }

  if (btnBackToDetails) {
    btnBackToDetails.addEventListener('click', () => {
      hideEditorView();
    });
  }

  if (editTemplateSelect) {
    editTemplateSelect.addEventListener('change', () => {
      editorState.template = editTemplateSelect.value;
      editorState.includes = getDefaultIncludes(editTemplateSelect.value);
      renderDynamicSection();
      renderIncludes();
      updatePreview();
    });
  }

  if (btnAddIncludeField) {
    btnAddIncludeField.addEventListener('click', () => {
      editorState.includes.push('');
      renderIncludes();
      updatePreview();
    });
  }

  // Vinculación de inputs generales
  if (editClientName) {
    editClientName.addEventListener('input', (e) => { editorState.clientName = e.target.value; updatePreview(); });
  }
  if (editClientCompany) {
    editClientCompany.addEventListener('input', (e) => { editorState.clientCompany = e.target.value; updatePreview(); });
  }
  if (editClientEmail) {
    editClientEmail.addEventListener('input', (e) => { editorState.clientEmail = e.target.value; updatePreview(); });
  }
  if (editClientPhone) {
    editClientPhone.addEventListener('input', (e) => { editorState.clientPhone = e.target.value; updatePreview(); });
  }
  if (editDate) {
    editDate.addEventListener('input', (e) => { editorState.date = e.target.value; updatePreview(); });
  }
  if (editNotesArea) {
    editNotesArea.addEventListener('input', (e) => { editorState.notes = e.target.value; updatePreview(); });
  }

  if (btnPrintQuote) {
    btnPrintQuote.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnSendQuoteEmail) {
    btnSendQuoteEmail.addEventListener('click', () => {
      btnSendQuoteEmail.disabled = true;
      btnSendQuoteEmail.textContent = 'Enviando...';
      
      const subject = `Respuesta de Cotización Opelcar ${editorState.consecutivo} - ${editorState.clientName}`;
      
      // Inline styles for high quality HTML mail
      const mailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #000000; background-color: #ffffff; padding: 20px; }
            .paper-header { border-bottom: 3px solid #152e60; padding-bottom: 16px; margin-bottom: 20px; display: table; width: 100%; }
            .paper-logo-box { display: inline-block; width: 55%; vertical-align: top; }
            .paper-logo-box h3 { font-family: 'Outfit', Arial, sans-serif; font-size: 28px; font-weight: bold; color: #152e60; margin: 0; }
            .paper-logo-box h3 span { color: #d01122; }
            .paper-logo-box p { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
            .paper-meta-box { display: inline-block; width: 44%; text-align: right; vertical-align: top; }
            .paper-meta-title { font-size: 18px; font-weight: bold; color: #d01122; margin: 0; }
            .paper-meta-number { font-size: 13px; font-weight: bold; color: #1e293b; margin-top: 4px; }
            .paper-meta-date { font-size: 11px; color: #64748b; }
            .paper-client-info { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 20px; }
            .paper-client-info th { text-align: left; font-size: 11px; color: #475569; padding: 6px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; width: 25%; }
            .paper-client-info td { font-size: 11px; color: #1e293b; padding: 6px 12px; border: 1px solid #e2e8f0; }
            .paper-intro { font-size: 11px; line-height: 1.6; color: #1e293b; margin-bottom: 16px; }
            .paper-section-title { font-size: 12px; font-weight: bold; color: #152e60; text-transform: uppercase; margin: 20px 0 8px 0; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; }
            .paper-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .paper-table th { background-color: #152e60; color: #ffffff; text-align: center; font-size: 10px; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; text-transform: uppercase; }
            .paper-table td { padding: 8px; border: 1px solid #cbd5e1; font-size: 10px; color: #0f172a; text-align: center; }
            .paper-bullets { margin-left: 20px; font-size: 11px; color: #1e293b; margin-bottom: 16px; line-height: 1.6; }
            .paper-notes { font-size: 10px; color: #475569; margin-top: 16px; border-left: 2px solid #cbd5e1; padding-left: 12px; line-height: 1.5; }
            .paper-sign-section { margin-top: 35px; }
            .paper-sign-line { border-top: 1.5px solid #1e293b; width: 240px; padding-top: 6px; font-size: 11px; font-weight: bold; color: #152e60; }
            .paper-sign-title { font-size: 10px; color: #64748b; }
            .paper-footer { margin-top: 40px; border-top: 2px solid #152e60; padding-top: 16px; text-align: center; font-size: 9px; color: #64748b; }
            .paper-footer p { margin: 2px 0; }
          </style>
        </head>
        <body>
          <div style="max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background:#ffffff;">
            ${editorPreviewPaper.innerHTML}
          </div>
        </body>
        </html>
      `;

      fetch('/api/admin/enviar-cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emailDestinatario: editorState.clientEmail,
          asunto: subject,
          contenidoHtml: mailHtml,
          consecutivo: editorState.consecutivo
        })
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || 'Error al enviar cotización.'); });
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          showToast(`Cotización ${editorState.consecutivo} enviada al cliente con éxito.`, 'success');
          hideEditorView();
          loadQuotes();
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      })
      .catch(err => {
        showToast(err.message, 'error');
      })
      .finally(() => {
        btnSendQuoteEmail.disabled = false;
        btnSendQuoteEmail.textContent = '📧 Enviar al Cliente';
      });
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
