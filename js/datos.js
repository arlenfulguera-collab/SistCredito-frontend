// ---------------------------------------------------------------
// Datos y reglas de negocio compartidas por todas las pantallas.
// Todo se guarda en el navegador (localStorage) mientras no exista
// el backend. Cuando exista, cada función Datos.leer / Datos.guardar
// se reemplaza por llamadas fetch a la API.
// ---------------------------------------------------------------
const Datos = (function () {
  const CLAVES = {
    clientes: "sistcredito_clientes_prueba",
    solicitudes: "sistcredito_solicitudes_prueba",
    evaluaciones: "sistcredito_evaluaciones_prueba",
    creditos: "sistcredito_creditos_prueba",
    garantias: "sistcredito_garantias_prueba",
    pagos: "sistcredito_pagos_prueba",
    usuarios: "sistcredito_usuarios_prueba",
    auditoria: "sistcredito_auditoria_prueba"
  };
  const CLAVE_FECHA = "sistcredito_fecha_simulada";

  // SUPUESTOS: el documento del proyecto no los define.
  // Hay que confirmarlos con el equipo y la docente.
  const TASA_ANUAL = 12;             // % anual (la misma del diagrama de objetos)
  const LIMITE_APROBACION = 100000;  // Bs que puede aprobar el Jefe de Créditos (RN04)

  const ROLES = [
    "Oficial de Crédito",
    "Analista de Crédito",
    "Jefe de Créditos",
    "Cajero",
    "Gerente",
    "Administrador"
  ];

  // ----------------------------- Utilidades -----------------------------
  function redondear(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function dos(n) {
    return String(n).padStart(2, "0");
  }

  function hoyReal() {
    const d = new Date();
    return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
  }

  function fechaSistema() {
    return localStorage.getItem(CLAVE_FECHA) || hoyReal();
  }

  function fijarFechaSimulada(fecha) {
    if (fecha) localStorage.setItem(CLAVE_FECHA, fecha);
    else localStorage.removeItem(CLAVE_FECHA);
  }

  function hayFechaSimulada() {
    return Boolean(localStorage.getItem(CLAVE_FECHA));
  }

  function sumarMeses(iso, n) {
    const partes = iso.split("-").map(Number);
    const destino = new Date(partes[0], partes[1] - 1 + n, 1);
    const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    const dia = Math.min(partes[2], ultimoDia);
    return destino.getFullYear() + "-" + dos(destino.getMonth() + 1) + "-" + dos(dia);
  }

  function diasEntre(desde, hasta) {
    const a = desde.split("-").map(Number);
    const b = hasta.split("-").map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }

  function formatoBs(valor) {
    return Number(valor).toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function nombreCompleto(cliente) {
    return cliente.nombres + " " + cliente.apellidos;
  }

  function siguienteId(lista, campo) {
    return lista.reduce((max, x) => Math.max(max, x[campo]), 0) + 1;
  }

  function formatoNumero(prefijo, secuencia, digitos) {
    return prefijo + "-" + fechaSistema().slice(0, 4) + "-" + String(secuencia).padStart(digitos, "0");
  }

  // ----------------------------- Almacén --------------------------------
  function usuariosIniciales() {
    const fecha = hoyReal();
    return [
      ["oficial", "Oficial de prueba", "Oficial de Crédito"],
      ["analista", "Analista de prueba", "Analista de Crédito"],
      ["jefe", "Jefe de prueba", "Jefe de Créditos"],
      ["cajero", "Cajero de prueba", "Cajero"],
      ["gerente", "Gerente de prueba", "Gerente"],
      ["admin", "Administrador", "Administrador"]
    ].map((u, i) => ({
      id_usuario: i + 1,
      login: u[0],
      clave: "1234", // solo prueba: con backend se guarda un hash, nunca la clave
      nombre_completo: u[1],
      correo: "",
      rol: u[2],
      activo: true,
      fecha_creacion: fecha
    }));
  }

  function guardar(nombre, lista) {
    localStorage.setItem(CLAVES[nombre], JSON.stringify(lista));
  }

  function leer(nombre) {
    let lista;
    try {
      lista = JSON.parse(localStorage.getItem(CLAVES[nombre])) || [];
    } catch (error) {
      lista = [];
    }
    if (nombre === "usuarios" && lista.length === 0) {
      lista = usuariosIniciales();
      guardar("usuarios", lista);
    }
    return lista;
  }

  function registrarAuditoria(login, operacion, entidad, idEntidad, resultado) {
    const lista = leer("auditoria");
    lista.push({
      id_auditoria: siguienteId(lista, "id_auditoria"),
      fecha_hora: new Date().toISOString(),
      usuario: login,
      operacion: operacion,
      entidad: entidad,
      id_entidad: idEntidad,
      resultado: resultado
    });
    guardar("auditoria", lista);
  }

  // ----------------------------- Evaluación -----------------------------
  function cuotaFrancesa(monto, plazo, tasaAnual) {
    const i = tasaAnual / 100 / 12;
    if (i === 0) return monto / plazo;
    return (monto * i) / (1 - Math.pow(1 + i, -plazo));
  }

  function estimarCuota(monto, plazo) {
    return redondear(cuotaFrancesa(monto, plazo, TASA_ANUAL));
  }

  // Respuesta SIMULADA del sistema de riesgo crediticio (siempre igual para la misma cédula)
  function consultarRiesgoSimulado(ci) {
    let hash = 0;
    for (let i = 0; i < ci.length; i++) hash += ci.charCodeAt(i) * (i + 1);
    return {
      referencia: "RIE-" + (100000 + ((hash * 7919) % 900000)),
      score: 450 + ((hash * 37) % 400),
      deudas_vigentes: hash % 3,
      mora_externa: hash % 5 === 0 ? 1 : 0,
      fecha_consulta: fechaSistema()
    };
  }

  // Política SUPUESTA: relación cuota / capacidad de pago y mora externa
  function sugerirRiesgo(capacidad, cuota, historial) {
    const relacion = capacidad > 0 ? cuota / capacidad : Infinity;
    let nivel = relacion <= 0.5 ? "BAJO" : relacion <= 0.8 ? "MEDIO" : "ALTO";
    if (historial && historial.mora_externa > 0) {
      nivel = nivel === "BAJO" ? "MEDIO" : "ALTO";
    }
    const resultado = nivel === "ALTO" || capacidad < cuota ? "DESFAVORABLE" : "FAVORABLE";
    return { nivel: nivel, resultado: resultado, relacion: relacion };
  }

  // ----------------------------- Crédito y cuotas -----------------------
  function generarCronograma(monto, plazo, tasaAnual, fechaBase, primerId) {
    const i = tasaAnual / 100 / 12;
    const cuotaFija = redondear(cuotaFrancesa(monto, plazo, tasaAnual));
    let saldo = monto;
    const cuotas = [];

    for (let n = 1; n <= plazo; n++) {
      const interes = redondear(saldo * i);
      const capital = n === plazo ? redondear(saldo) : redondear(cuotaFija - interes);
      const montoCuota = redondear(capital + interes);
      saldo = redondear(saldo - capital);
      cuotas.push({
        id_cuota: primerId + n - 1,
        numero: n,
        fecha_vencimiento: sumarMeses(fechaBase, n),
        capital: capital,
        interes: interes,
        monto: montoCuota,
        saldo: montoCuota, // lo que falta pagar de esta cuota
        pagado: 0,
        dias_mora: 0,
        fecha_pago_completo: "",
        estado: "PENDIENTE"
      });
    }
    return cuotas;
  }

  function siguienteIdCuota() {
    let max = 0;
    leer("creditos").forEach(c => c.cuotas.forEach(q => { max = Math.max(max, q.id_cuota); }));
    return max + 1;
  }

  function saldoExigible(credito) {
    return redondear(credito.cuotas
      .filter(c => c.estado !== "PAGADA")
      .reduce((suma, c) => suma + c.saldo, 0));
  }

  // RN08: el pago se distribuye entre las cuotas más antiguas. RN07: el saldo no queda negativo.
  // RN10: el crédito pasa a CANCELADO solo cuando el saldo exigible llega a cero.
  function aplicarPago(credito, monto) {
    let restante = redondear(monto);
    const detalle = [];

    for (const cuota of credito.cuotas) {
      if (restante <= 0) break;
      if (cuota.estado === "PAGADA") continue;

      const aplicado = redondear(Math.min(restante, cuota.saldo));
      const pagadoAntes = cuota.pagado;
      cuota.pagado = redondear(cuota.pagado + aplicado);
      cuota.saldo = redondear(cuota.saldo - aplicado);

      // se paga primero el interés y después el capital
      const capitalAntes = Math.max(0, pagadoAntes - cuota.interes);
      const capitalDespues = Math.max(0, cuota.pagado - cuota.interes);
      credito.saldo_capital = redondear(credito.saldo_capital - (capitalDespues - capitalAntes));
      restante = redondear(restante - aplicado);

      if (cuota.saldo <= 0) {
        cuota.saldo = 0;
        cuota.estado = "PAGADA";
        cuota.fecha_pago_completo = fechaSistema();
        cuota.dias_mora = 0;
      }
      detalle.push({ id_cuota: cuota.id_cuota, numero: cuota.numero, monto_aplicado: aplicado });
    }

    if (credito.saldo_capital < 0) credito.saldo_capital = 0;
    if (saldoExigible(credito) === 0) {
      credito.estado = "CANCELADO";
      credito.saldo_capital = 0;
    }
    return detalle;
  }

  // CU13: marca cuotas vencidas y pasa el crédito a EN_MORA (o lo regresa a VIGENTE)
  function controlarMora() {
    const hoy = fechaSistema();
    const creditos = leer("creditos");
    let cambios = 0;

    creditos.forEach(credito => {
      if (credito.estado !== "VIGENTE" && credito.estado !== "EN_MORA") return;

      let hayVencidas = false;
      credito.cuotas.forEach(cuota => {
        if (cuota.estado === "PAGADA") return;
        if (cuota.fecha_vencimiento < hoy) {
          cuota.estado = "VENCIDA";
          cuota.dias_mora = diasEntre(cuota.fecha_vencimiento, hoy);
          hayVencidas = true;
        } else {
          cuota.estado = "PENDIENTE";
          cuota.dias_mora = 0;
        }
      });

      const nuevo = hayVencidas ? "EN_MORA" : "VIGENTE";
      if (nuevo !== credito.estado) {
        registrarAuditoria("sistema", "CONTROL_MORA", "CREDITO", credito.id_credito,
          credito.estado + " → " + nuevo);
        credito.estado = nuevo;
        cambios++;
      }
    });

    guardar("creditos", creditos);
    return cambios;
  }

  return {
    TASA_ANUAL, LIMITE_APROBACION, ROLES,
    leer, guardar, registrarAuditoria,
    fechaSistema, fijarFechaSimulada, hayFechaSimulada, hoyReal, sumarMeses, diasEntre,
    redondear, formatoBs, nombreCompleto, siguienteId, formatoNumero,
    estimarCuota, consultarRiesgoSimulado, sugerirRiesgo,
    generarCronograma, siguienteIdCuota, saldoExigible, aplicarPago, controlarMora
  };
})();
