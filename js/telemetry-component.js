/**
 * Componente A-Frame para el seguimiento de la nave Orión.
 * Renderiza la trayectoria (Path) e interpola la posición en VR.
 */
AFRAME.registerComponent('artemis-tracker', {
    schema: {
        scaleFactor: {type: 'number', default: 100000}, // 1 metro VR = 100,000 km reales
        updateInterval: {type: 'number', default: 3000} // Consulta a la API cada 3 segundos
    },

    init: function () {
        this.ship = document.querySelector('#orion-ship');
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.lastFetchTime = 0;
        this.pathPoints =[];
        
        // 1. Configuración de la trayectoria (Three.js Line) altamente optimizada
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff3300, 
            linewidth: 2, 
            transparent: true, 
            opacity: 0.8 
        });
        
        // Usamos BufferGeometry por ser el estándar para alto rendimiento en WebGL
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(3000); // Pre-asignamos memoria para 1000 vértices (x,y,z)
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        
        this.line = new THREE.Line(this.geometry, material);
        this.el.sceneEl.object3D.add(this.line);

        // 2. Referencias a los elementos del DOM (HUD UI)
        this.uiEarth = document.getElementById('dist-earth');
        this.uiMoon = document.getElementById('dist-moon');
        this.uiSpeed = document.getElementById('speed');
        this.uiStatus = document.getElementById('data-status');
        this.uiPing = document.getElementById('ping-rate');

        // 3. --- CORRECCIÓN DE BUCLE ORBITAL ---
        // Escucha el evento disparado por api-service.js cuando la simulación
        // de la trayectoria en forma de 8 se reinicia.
        window.addEventListener('orbitReset', () => {
            this.pathPoints =[]; // Vaciamos el array de puntos
            this.line.geometry.setDrawRange(0, 0); // Ocultamos la línea dibujada
        });
    },

    tick: function (time, timeDelta) {
        // A. Polling asíncrono a la API (o simulador) según el updateInterval
        if (time - this.lastFetchTime > this.data.updateInterval) {
            window.arowService.fetchTelemetry().then(data => {
                if (data) this.updateTarget(data);
                this.updateUIStatus();
            });
            this.lastFetchTime = time;
        }

        // B. Interpolación Lineal (Lerp) para movimiento VR fluido
        // En lugar de "teletransportar" la nave cada 3 segundos, la movemos un
        // 5% de la distancia hacia su objetivo real en cada frame (60 FPS).
        if (this.ship && this.ship.object3D) {
            this.ship.object3D.position.lerp(this.targetPosition, 0.05);
        }

        // C. Actualización del trazado en el espacio 3D
        this.updatePath();
    },

    updateTarget: function(data) {
        // Transformación del Vector de Estado (Km) a la Escala VR (Metros)
        let scale = this.data.scaleFactor;
        this.targetPosition.set(
            data.x / scale,
            data.y / scale,
            data.z / scale
        );

        // Actualizar UI formateando los números astronómicos a estilo europeo/latino
        if(this.uiEarth) this.uiEarth.innerText = data.distEarth.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiMoon) this.uiMoon.innerText = data.distMoon.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiSpeed) this.uiSpeed.innerText = data.speed.toLocaleString('es-ES', {maximumFractionDigits: 1});
    },

    updatePath: function() {
        if (!this.ship || !this.ship.object3D) return;

        let currentPos = this.ship.object3D.position;
        
        // Optimización de la VRAM: Solo agrega un vértice a la línea si la nave 
        // se ha desplazado más de 0.01 unidades VR desde el último punto.
        if (this.pathPoints.length === 0 || currentPos.distanceTo(this.pathPoints[this.pathPoints.length - 1]) > 0.01) {
            
            // FIFO (First In, First Out) - Si llegamos a 1000 puntos, borramos el más viejo
            // Esto evita caídas de FPS (Frame Drops) por exceso de geometría.
            if (this.pathPoints.length >= 1000) {
                this.pathPoints.shift(); 
            }
            
            this.pathPoints.push(currentPos.clone());
            
            // Volcado rápido del array de objetos Vector3 a Float32Array para WebGL
            for (let i = 0; i < this.pathPoints.length; i++) {
                this.positions[i * 3] = this.pathPoints[i].x;
                this.positions[i * 3 + 1] = this.pathPoints[i].y;
                this.positions[i * 3 + 2] = this.pathPoints[i].z;
            }
            
            // Banderas necesarias para que Three.js sepa que debe re-renderizar la geometría
            this.line.geometry.attributes.position.needsUpdate = true;
            this.line.geometry.setDrawRange(0, this.pathPoints.length);
        }
    },

    updateUIStatus: function() {
        if (!this.uiStatus) return;
        
        // Indicador semántico del estado de los datos
        if (window.arowService.isSimulating) {
            this.uiStatus.innerText = "SIMULACIÓN (AROW Offline)";
            this.uiStatus.style.color = "#ff9900"; // Naranja de advertencia
        } else {
            this.uiStatus.innerText = "DATOS EN VIVO (AROW)";
            this.uiStatus.style.color = "#00ffcc"; // Cyan de OK
        }
        if(this.uiPing) this.uiPing.innerText = `${this.data.updateInterval} ms`;
    }
});