// ---------------------------------------------------------------
// Usuarios de PRUEBA: solo sirven mientras no exista el backend.
// Cuando el backend esté listo, se borra este arreglo y se usa
// la función iniciarSesionConApi() de más abajo.
// Las contraseñas reales nunca se guardan en el frontend.
// ---------------------------------------------------------------
const USUARIOS_PRUEBA = [
  { login: "oficial",  clave: "1234", nombre: "Oficial de prueba",  rol: "Oficial de Crédito" },
  { login: "analista", clave: "1234", nombre: "Analista de prueba", rol: "Analista de Crédito" },
  { login: "jefe",     clave: "1234", nombre: "Jefe de prueba",     rol: "Jefe de Créditos" },
  { login: "cajero",   clave: "1234", nombre: "Cajero de prueba",   rol: "Cajero" },
  { login: "gerente",  clave: "1234", nombre: "Gerente de prueba",  rol: "Gerente" },
  { login: "admin",    clave: "1234", nombre: "Administrador",      rol: "Administrador" }
];

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

// Versión con datos de prueba
function iniciarSesionDePrueba(login, clave) {
  return USUARIOS_PRUEBA.find(u => u.login === login && u.clave === clave) || null;
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

  const usuario = iniciarSesionDePrueba(login, clave);

  if (!usuario) {
    marcarInvalido(campoUsuario, true);
    marcarInvalido(campoClave, true);
    mostrarMensaje("Usuario o contraseña incorrectos. Revisa los datos e intenta de nuevo.");
    campoClave.select();
    return;
  }

  // Guardamos quién ingresó para usarlo en las demás pantallas
  sessionStorage.setItem("usuario", JSON.stringify({
    nombre: usuario.nombre,
    rol: usuario.rol
  }));

  mostrarMensaje("Ingreso correcto. Rol: " + usuario.rol + ".", true);

  // Cuando exista el menú principal, descomenta esta línea:
   window.location.href = "menu.html";
});
