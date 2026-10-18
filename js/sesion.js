// ---------------------------------------------------------------
// Funciones compartidas por las pantallas internas (carpeta paginas/).
// Se cargan antes del script de cada pantalla.
// ---------------------------------------------------------------

// Devuelve el usuario que inició sesión, o lleva al login / menú.
// rolesPermitidos: lista de roles que pueden entrar (vacía = cualquiera).
function exigirSesion(rolesPermitidos) {
  const datos = sessionStorage.getItem("usuario");

  if (!datos) {
    window.location.replace("../index.html");
    return null;
  }

  const usuario = JSON.parse(datos);

  if (rolesPermitidos && rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
    window.location.replace("../menu.html");
    return null;
  }

  return usuario;
}

// Rellena la barra superior y activa "Cerrar sesión"
function mostrarBarra(usuario) {
  document.getElementById("nombre-usuario").textContent = usuario.nombre;
  document.getElementById("rol-usuario").textContent = usuario.rol;

  document.getElementById("cerrar-sesion").addEventListener("click", () => {
    sessionStorage.removeItem("usuario");
    window.location.href = "../index.html";
  });
}
