# 🚀 Artemis II - AROW VR Telemetry Tracker

Visualizador 3D interactivo y en tiempo real de la misión Artemis II de la NASA. Construido bajo estándares de ingeniería de software web, este proyecto mapea la telemetría espacial utilizando el sistema AROW (Artemis Real-time Orbit Website) y renderiza la trayectoria de la nave Orión en un entorno de Realidad Virtual (WebVR).

## 🔭 Características Científicas y Técnicas

*   **Escala Paramétrica Rigurosa:** El entorno utiliza un factor de escala donde `1 unidad WebGL = 100,000 km`. La Tierra y la Luna están modeladas con sus diámetros proporcionales exactos (12,756.27 km y 3,474.8 km) y separadas por su distancia relativa media (384,400 km).
*   **Inclinación Axial Real:** Los cuerpos celestes respetan sus inclinaciones astronómicas (Tierra: 23.5°, Luna: 1.54°).
*   **Determinismo Temporal (UTC Epoch):** El motor orbital no depende de simulaciones de interfaz estáticas. Calcula la posición exacta en el marco de referencia J2000 sincronizándose con el reloj atómico (UNIX Epoch) y la hora "cero" de lanzamiento.
*   **Eficiencia de Memoria (VRAM):** La trayectoria ("Free-Return Trajectory") utiliza estructuras `BufferGeometry` y preasignación en `Float32Array` implementando colas FIFO para garantizar 60/90 FPS sostenidos en gafas VR.
*   **Fallback Tracker:** Si la API REST de la NASA experimenta bloqueos de CORS o caídas, el sistema interpola algorítmicamente la trayectoria translunar sin interrupciones.

## 🛠️ Tecnologías Utilizadas

*   **HTML5 / CSS3 / ES6 Javascript** (Arquitectura Modular).
*   **A-Frame (v1.5.0):** Framework declarativo para WebVR/WebXR.
*   **Three.js:** Motor de renderizado WebGL subyacente.
*   **Modelos PBR:** Archivos `.glb` (glTF Binary) para texturizado eficiente de cuerpos celestes.

## 📂 Estructura del Proyecto

```text
📦 artemis2-vr
 ┣ 📂 assets
 ┃ ┣ 📜 tierra.glb        # Modelo 3D de la Tierra (1m = 1 unidad)
 ┃ ┣ 📜 luna.glb          # Modelo 3D de la Luna
 ┃ ┣ 📜 orion.glb         # Modelo representativo de la nave Orion
 ┃ ┗ 📜 favicon.png       # Logo personal (16x16px)
 ┣ 📂 css
 ┃ ┗ 📜 styles.css        # HUD (Head-Up Display) de telemetría superpuesto
 ┣ 📂 js
 ┃ ┣ 📜 api-service.js          # Módulo de conexión AROW y motor determinista UTC
 ┃ ┣ 📜 telemetry-component.js  # Componente A-Frame (Interpolación Lerp y Line Path)
 ┃ ┗ 📜 blender-controls.js     # Controles avanzados de cámara (Orbit, Zoom, Raycaster)
 ┣ 📜 index.html          # Punto de entrada y grafo de la escena WebGL
 ┗ 📜 README.md           # Documentación