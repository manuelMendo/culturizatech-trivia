# 🇵🇪 Culturizatech · Trivia en Vivo

**Culturizatech** es una aplicación web interactiva de trivia en tiempo real, diseñada para jugar en eventos, competencias en vivo o dinámicas de grupo. Cuenta con un sistema de pantalla dividida para TV/Anfitrión y botones de *buzzer* dinámicos para los participantes desde sus teléfonos móviles.

---

## 🚀 Características Principales

* **🖥️ Pantalla de TV / Host:** Muestra el estado del juego, marcador en vivo, categorías, temporizadores y vista previa de los jugadores conectados.
* **📱 Modo Jugador (Móvil):** Interfaz optimizada para celulares con sistema de *buzzer* con bloqueo automático y vibración.
* **⚡ Tiempo Real:** Sincronización instantánea entre el panel del anfitrión y los dispositivos mediante **Firebase Realtime Database**.
* **👥 Torneo por Equipos:** Soporte para hasta 12 equipos configurables con marcadores independientes.
* **🔊 Efectos de Sonido:** Efectos integrados con la API de Audio de Web (ding, beeps, error, fanfarria).

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3 (variables nativas, Flexbox/Grid, animaciones).
* **JavaScript:** JavaScript ES6+ (Vanilla JS).
* **Base de Datos en Tiempo Real:** Firebase Realtime Database SDK `v9.22.0`.

---

## 📁 Estructura del Proyecto

├── index.html         # Estructura principal y carga de librerías
├── styles.css         # Estilos visuales, temas y modo responsive
├── script.js          # Lógica completa del juego, estado y Firebase
├── Logo.png           # Logo oficial de Techcenter+
├── Fondo-landing.png  # Fondo para la pantalla de inicio
└── fondo-tv.png       # Fondo temático para la vista de TV

---

## ⚙️ Configuración e Instalación

1. **Clonar el repositorio:**
   git clone https://github.com/manuelMendo/culturizatech-trivia.git

2. **Abrir el proyecto:**
   No requiere servidor de desarrollo de Node.js. Puedes abrir directamente el archivo `index.html` en cualquier navegador web.

3. **Configuración de Firebase:**
   Para usar tu propia base de datos, reemplaza la constante `firebaseConfig` en el archivo `script.js`:
   
   const firebaseConfig = {
     databaseURL: "https://TU-PROYECTO-default-rtdb.firebaseio.com"
   };

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
