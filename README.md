# 🚀 Artemis II - AROW VR Telemetry Tracker

Visualizador 3D interactivo y en tiempo real de la misión Artemis II de la NASA. Construido bajo estrictos estándares de ingeniería de software aeroespacial y WebGL, este proyecto mapea la telemetría espacial utilizando el sistema AROW (Artemis Real-time Orbit Website) y renderiza la trayectoria de la nave Orión en un entorno de Realidad Virtual inmersivo.

## 🔭 Arquitectura Científica y de Software

*   **Motor de Efemérides Kepleriano (J2000):** Se ha abandonado la animación gráfica tradicional en favor de un motor físico en JavaScript. Calcula la Traslación y Rotación exacta de la Tierra, la Luna y los planetas del Sistema Solar basándose en el reloj atómico (UTC) y las constantes del Jet Propulsion Laboratory (JPL).
*   **Relatividad Geocéntrica:** Aplica un algoritmo de compensación de vectores que mueve el universo heliocéntrico en dirección opuesta a la Tierra, manteniendo a nuestro planeta en el centro de la escena (`0,0,0`) para evitar cinetosis (mareo virtual) en los usuarios de cascos VR.
*   **Trayectoria de Retorno Libre Bicolor:** El sistema traza el histórico de la misión (línea sólida roja) desde el lanzamiento el 1 de abril de 2026 hasta el "hoy" UTC, y proyecta la trayectoria futura (línea translúcida cyan) completando el majestuoso "Bucle en 8" alrededor de la Luna en el plano X-Z.
*   **Tolerancia a Fallos (Circuit Breaker):** Incluye un patrón de diseño que monitoriza la salud del endpoint de la API REST de la NASA. Ante fallos de DNS o bloqueos de CORS (3 intentos fallidos), el sistema se autotransfiere sin fricción al Motor Determinista UTC interno, garantizando un "Uptime" del 100% en la visualización.
*   **Física Óptica (Iluminación Astronómica):** Implementa Luz Direccional (rayos paralelos sin decaimiento de la inversa del cuadrado) para simular el Sol a escalas astronómicas, produciendo terminadores (ciclos día/noche) fotorealistas sobre modelos `.gltf` con materiales PBR. Incluye además un Lens Flare anamórfico de generación procedimental (Cero peso de red).
*   **Gestor de Caché Distribuido:** Integra un supervisor asíncrono (`version.json`) que realiza invalidación de caché activa. Obliga a los navegadores de los usuarios a recargar los *assets* sin intervención manual cuando se despliegan actualizaciones en la CDN.

## 🛠️ Tecnologías Utilizadas

*   **HTML5 / CSS3 / ES6 Javascript** (Arquitectura Modular y Orientada a Objetos).
*   **A-Frame (v1.5.0):** Framework declarativo para WebVR/WebXR.
*   **Three.js:** Motor de renderizado WebGL subyacente.

## 🖱️ Controles de Navegación (Ingeniería)

Inspirado en el estándar UX de software 3D como Blender:
*   **Vuelo Libre:** `Click Izquierdo` (mantener) para orientar + Teclas `W A S D` para desplazarse.
*   **Auto-Enfoque (Zoom In):** `Click` sobre el hitbox de un astro + Tecla `.` (Numpad) para saltar a su órbita.
*   **Órbita Analítica:** `Rueda central del ratón` (Click y arrastrar) para orbitar alrededor del objetivo seleccionado.
*   **Liberar Foco:** Tecla `Esc`.

## 🚀 Despliegue (CI/CD)

El proyecto está diseñado para ser alojado estáticamente en plataformas como GitHub Pages, Vercel o Netlify. Gracias a su arquitectura, los modelos `.gltf` de alta definición y las lógicas de API operan en el lado del cliente (Client-side rendering).

## 📜 Licencia y Fuentes
*   Las efemérides matemáticas y el modelo vectorial de inyección translunar están basados en la documentación pública de trayectorias de retorno libre del programa Artemis (NASA).
*   Texturas y modelados de dominio público vía NASA 3D Resources.

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
 ┃ ┣ 📜 cache-manager.js        # Verificará en tiempo real el archivo version.json
 ┃ ┣ 📜 ephemeris-engine.js     # Contiene la física de las leyes de Kepler para las órbitas planetarias válidas para la época J2000.
 ┃ ┣ 📜 optical-flare.js        # Halo o Destello de Lente.
 ┃ ┣ 📜 solar-system-component.js # Dibujamos todos los planetas usando esferas básicas.
 ┃ ┣ 📜 telemetry-component.js  # Componente A-Frame (Interpolación Lerp y Line Path)
 ┃ ┗ 📜 blender-controls.js     # Controles avanzados de cámara (Orbit, Zoom, Raycaster)
 ┣ 📜 index.html          # Punto de entrada y grafo de la escena WebGL
 ┣ 📜 version.json        # Control de versiones
 ┗ 📜 README.md           # Documentación
