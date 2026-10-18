(function () {
  // Solo el Oficial de Crédito registra solicitudes (CU02)
  const usuario = exigirSesion(["Oficial de Crédito"]);
  if (!usuario) return;
  mostrarBarra(usuario);

  // Documentos que se pueden marcar. Cuando el equipo defina la
  // lista oficial de documentos requeridos, se cambia solo aquí.
  const TIPOS_DOCUMENTO = [
    { codigo: "CEDULA",    nombre: "Cédula de identidad",      requerido: true },
    { codigo: "INGRESOS",  nombre: "Comprobante de ingresos",  requerido: true },
    { codigo: "DOMICILIO", nombre: "Comprobante de domicilio", requerido: false }
  ];

  // -------------------------------------------------------------
  // Datos de PRUEBA guardados en este navegador mientras no exista
  // el backend. Cuando esté listo, se reemplazan estas funciones por
  // llamadas fetch. Los clientes vienen de la pantalla de clientes.
  // -------------------------------------------------------------
  const CLAVE_CLIENTES = "sistcredito_clientes_prueba";
  const CLAVE_SOLICITUDES = "sistcredito_solicitudes_prueba";

  function leerLista(clave) {
    try {
      return JSON.parse(localStorage.getItem(clave)) || [];
    } catch (error) {
      return [];
    }
  }

  const leerClientes = () => leerLista(CLAVE_CLIENTES);
  const leerSolicitudes = () => leerLista(CLAVE_SOLICITUDES);
  const guardarSolicitudes = (lista) =>
    localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(lista));

  // -------------------------------------------------------------
  const formulario = document.getElementById("form-solicitud");
  const selectCliente = document.getElementById("cliente");
  const campoMonto = document.getElementById("monto");
  const campoPlazo = document.getElementById("plazo");
  const campoDestino = document.getElementById("destino");
  const campoObservacion = document.getElementById("observacion");
  const listaDocumentos = document.getElementById("lista-documentos");
  const avisoSinClientes = document.getElementById("sin-clientes");
  const mensaje = document.getElementById("mensaje");
  const buscar = document.getElementById("buscar");
  const filtroEstado = document.getElementById("filtro-estado");
  const tabla = document.getElementById("tabla-solicitudes");
  const vacio = document.getElementById("vacio");

  const selectsDocumento = {};

  function hoy() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia;
  }

  function mostrarMensaje(texto, esExito) {
    mensaje.textContent = texto;
    mensaje.classList.toggle("ok", Boolean(esExito));
  }

  function formatearMonto(valor) {
    return Number(valor).toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function nombreCompleto(cliente) {
    return cliente.nombres + " " + cliente.apellidos;
  }

  // ---------------------- Lista de clientes ---------------------
  function llenarClientes() {
    const seleccionado = selectCliente.value;
    const activos = leerClientes().filter(c => c.estado === "ACTIVO");

    selectCliente.replaceChildren();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = activos.length > 0 ? "Selecciona un cliente" : "No hay clientes activos";
    selectCliente.append(inicial);

    activos.forEach(cliente => {
      const opcion = document.createElement("option");
      opcion.value = String(cliente.id_cliente);
      opcion.textContent = cliente.ci + " — " + nombreCompleto(cliente);
      selectCliente.append(opcion);
    });

    if (activos.some(c => String(c.id_cliente) === seleccionado)) {
      selectCliente.value = seleccionado;
    }

    avisoSinClientes.hidden = activos.length > 0;
    selectCliente.disabled = activos.length === 0;
  }

  // ---------------------- Documentos ----------------------------
  function crearFilasDocumentos() {
    TIPOS_DOCUMENTO.forEach(tipo => {
      const fila = document.createElement("div");
      fila.className = "documentos__fila";

      const etiqueta = document.createElement("label");
      etiqueta.htmlFor = "doc-" + tipo.codigo;
      etiqueta.textContent = tipo.nombre + (tipo.requerido ? "" : " (opcional)");

      const select = document.createElement("select");
      select.id = "doc-" + tipo.codigo;
      [
        ["NO_ENTREGADO", "No entregado"],
        ["PRESENTADO", "Presentado"],
        ["VERIFICADO", "Verificado"]
      ].forEach(([valor, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.append(opcion);
      });

      selectsDocumento[tipo.codigo] = select;
      fila.append(etiqueta, select);
      listaDocumentos.append(fila);
    });
  }

  // ---------------------- Validación ----------------------------
  function limpiarErrores() {
    [selectCliente, campoMonto, campoPlazo, campoDestino]
      .concat(Object.values(selectsDocumento))
      .forEach(campo => campo.classList.remove("invalido"));
  }

  function validar() {
    if (selectCliente.value === "") {
      selectCliente.classList.add("invalido");
      return { texto: "Selecciona el cliente que presenta la solicitud.", campo: selectCliente };
    }

    const monto = parseFloat(campoMonto.value);
    if (Number.isNaN(monto) || monto <= 0) {
      campoMonto.classList.add("invalido");
      return { texto: "El monto solicitado debe ser mayor que cero.", campo: campoMonto };
    }

    const plazo = Number(campoPlazo.value);
    if (campoPlazo.value.trim() === "" || !Number.isInteger(plazo) || plazo < 1) {
      campoPlazo.classList.add("invalido");
      return { texto: "El plazo debe ser un número entero de meses, de 1 en adelante.", campo: campoPlazo };
    }

    if (campoDestino.value.trim() === "") {
      campoDestino.classList.add("invalido");
      return { texto: "Indica el destino del crédito.", campo: campoDestino };
    }

    const faltantes = TIPOS_DOCUMENTO.filter(tipo =>
      tipo.requerido && selectsDocumento[tipo.codigo].value === "NO_ENTREGADO"
    );
    if (faltantes.length > 0) {
      faltantes.forEach(tipo => selectsDocumento[tipo.codigo].classList.add("invalido"));
      const nombres = faltantes.map(t => t.nombre.toLowerCase()).join(", ");
      return {
        texto: "Documentación incompleta. Falta marcar como entregado: " + nombres + ".",
        campo: selectsDocumento[faltantes[0].codigo]
      };
    }

    return null;
  }

  // ---------------------- Registrar -----------------------------
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    limpiarErrores();
    mostrarMensaje("");

    const error = validar();
    if (error) {
      mostrarMensaje(error.texto);
      error.campo.focus();
      return;
    }

    const solicitudes = leerSolicitudes();
    const siguienteId = solicitudes.reduce((max, s) => Math.max(max, s.id_solicitud), 0) + 1;
    const cliente = leerClientes().find(c => String(c.id_cliente) === selectCliente.value);

    // Solo se guardan los documentos que sí se entregaron
    const documentos = TIPOS_DOCUMENTO
      .filter(tipo => selectsDocumento[tipo.codigo].value !== "NO_ENTREGADO")
      .map(tipo => ({
        tipo_documento: tipo.codigo,
        estado: selectsDocumento[tipo.codigo].value,
        fecha_subida: hoy()
      }));

    solicitudes.push({
      id_solicitud: siguienteId,
      id_cliente: cliente.id_cliente,
      fecha_solicitud: hoy(),
      monto_solicitado: parseFloat(campoMonto.value),
      plazo_meses: Number(campoPlazo.value),
      destino: campoDestino.value.trim(),
      estado: "REGISTRADA",
      motivo_rechazo: "",
      observacion: campoObservacion.value.trim(),
      documentos: documentos
    });
    guardarSolicitudes(solicitudes);

    formulario.reset();
    llenarClientes();
    dibujarTabla();
    mostrarMensaje("Solicitud N.º " + siguienteId + " registrada para " + nombreCompleto(cliente) + ".", true);
  });

  // ---------------------- Tabla ---------------------------------
  function crearCelda(texto, clase) {
    const td = document.createElement("td");
    td.textContent = texto;
    if (clase) td.className = clase;
    return td;
  }

  function dibujarTabla() {
    const clientes = leerClientes();
    const solicitudes = leerSolicitudes();
    const texto = buscar.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filas = solicitudes
      .map(s => ({ solicitud: s, cliente: clientes.find(c => c.id_cliente === s.id_cliente) }))
      .filter(({ solicitud, cliente }) => {
        const coincideEstado = estado === "" || solicitud.estado === estado;
        const datosCliente = cliente
          ? (cliente.ci + " " + nombreCompleto(cliente)).toLowerCase()
          : "";
        return coincideEstado && (texto === "" || datosCliente.includes(texto));
      })
      .reverse(); // las más recientes primero

    tabla.replaceChildren();

    filas.forEach(({ solicitud, cliente }) => {
      const fila = document.createElement("tr");
      fila.append(
        crearCelda(String(solicitud.id_solicitud)),
        crearCelda(solicitud.fecha_solicitud),
        crearCelda(cliente ? nombreCompleto(cliente) : "Cliente no encontrado"),
        crearCelda(formatearMonto(solicitud.monto_solicitado), "num"),
        crearCelda(solicitud.plazo_meses + " meses", "num"),
        crearCelda(solicitud.destino),
        crearCelda(solicitud.documentos.length + " de " + TIPOS_DOCUMENTO.length),
        crearCelda(solicitud.estado)
      );
      tabla.append(fila);
    });

    if (solicitudes.length === 0) {
      vacio.textContent = "Aún no hay solicitudes. Completa el formulario para registrar la primera.";
      vacio.hidden = false;
    } else if (filas.length === 0) {
      vacio.textContent = "Ninguna solicitud coincide con la búsqueda.";
      vacio.hidden = false;
    } else {
      vacio.hidden = true;
    }
  }

  buscar.addEventListener("input", dibujarTabla);
  filtroEstado.addEventListener("change", dibujarTabla);

  // Si registras un cliente en otra pestaña, la lista se actualiza al volver
  window.addEventListener("focus", llenarClientes);

  crearFilasDocumentos();
  llenarClientes();
  dibujarTabla();
})();
