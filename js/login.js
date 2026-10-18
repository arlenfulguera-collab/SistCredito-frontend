// ---------------------------------------------------------------
// Los usuarios salen de Datos.leer("usuarios"). La primera vez se
// crean los usuarios de prueba (oficial, analista, jefe, cajero,
// gerente y admin, todos con la contraseña 1234). Después, el
// Administrador puede crear, editar y desactivar usuarios desde
// la pantalla "Usuarios".
// Con backend, esta comprobación se hace en el servidor y las
// contraseñas nunca se guardan en el frontend.
// ---------------------------------------------------------------
const formulario = document.getElementById("form-login");
const campoUsuario = document.getElementById("usuario");
const campoClave = document.getElementById("clave");
const botonVer = document.getElementById("ver-clave");
const mensaje = document.getElementById("mensaje");

function mostrarMensaje(texto, esExito = false) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("ok", esExito);
}

function marcarInvalido(campo, invalido) {
  campo.classList.toggle("invalido", invalido);
}

// Mostrar u ocultar la contraseña
botonVer.addEventListener("click", () => {
  const oculta = campoClave.type === "password";
  campoClave.type = oculta ? "text" : "password";
  botonVer.textContent = oculta ? "Ocultar" : "Mostrar";
  botonVer.setAttribute("aria-pressed", String(oculta));
});

function buscarUsuario(login, clave) {
  return Datos.leer("usuarios")
    .find(u => u.login === login.toLowerCase() && u.clave === clave) || null;
}

/* Versión con backend (se activa cuando exista el servicio):
async function iniciarSesionConApi(login, clave) {
  const respuesta = await fetch("http://localhost:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, clave })
  });
  if (!respuesta.ok) return null;
  return await respuesta.json(); // { nombre, rol, ... }
}
*/

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const login = campoUsuario.value.trim();
  const clave = campoClave.value;

  marcarInvalido(campoUsuario, false);
  marcarInvalido(campoClave, false);
  mostrarMensaje("");

  if (!login || !clave) {
    marcarInvalido(campoUsuario, !login);
    marcarInvalido(campoClave, !clave);
    mostrarMensaje("Escribe tu usuario y tu contraseña.");
    (login ? campoClave : campoUsuario).focus();
    return;
  }

  const usuario = buscarUsuario(login, clave);

  if (!usuario) {
    marcarInvalido(campoUsuario, true);
    marcarInvalido(campoClave, true);
    mostrarMensaje("Usuario o contraseña incorrectos. Revisa los datos e intenta de nuevo.");
    campoClave.select();
    return;
  }

  if (!usuario.activo) {
    marcarInvalido(campoUsuario, true);
    mostrarMensaje("Tu usuario está desactivado. Consulta con el administrador.");
    return;
  }

  // Guardamos quién ingresó para usarlo en las demás pantallas
  sessionStorage.setItem("usuario", JSON.stringify({
    id_usuario: usuario.id_usuario,
    login: usuario.login,
    nombre: usuario.nombre_completo,
    rol: usuario.rol
  }));

  Datos.registrarAuditoria(usuario.login, "INICIAR_SESION", "USUARIO", usuario.id_usuario, "Ingreso correcto");
  window.location.href = "menu.html";
});
