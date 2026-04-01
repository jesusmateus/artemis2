AFRAME.registerComponent('artemis-tracker', {
    schema: {
        scaleFactor: {type: 'number', default: 100000}, // 1 metro A-Frame = 100,000 km
        updateInterval: {type: 'number', default: 3000} // Fetch a AROW cada 3 segundos
    },

    init: function () {
        this.ship = document.querySelector('#orion-ship');
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.lastFetchTime = 0;
        this.pathPoints =[];
        
        // Configuración de la trayectoria (Three.js Line)
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff3300, 
            linewidth: 2, 
            transparent: true, 
            opacity: 0.8 
        });
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(3000); // Max 1000 puntos (x,y,z)
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.line = new THREE.Line(this.geometry, material);
        this.el.sceneEl.object3D.add(this.line);

        // UI Elements
        this.uiEarth = document.getElementById('dist-earth');
        this.uiMoon = document.getElementById('dist-moon');
        this.uiSpeed = document.getElementById('speed');
        this.uiStatus = document.getElementById('data-status');
        this.uiPing = document.getElementById('ping-rate');
    },

    tick: function (time, timeDelta) {
        // 1. Polling a la API según el intervalo
        if (time - this.lastFetchTime > this.data.updateInterval) {
            window.arowService.fetchTelemetry().then(data => {
                if (data) this.updateTarget(data);
                this.updateUIStatus();
            });
            this.lastFetchTime = time;
        }

        // 2. Interpolación Lineal (Lerp) para movimiento fluido a 60FPS
        // Mueve la nave un 5% hacia su objetivo en cada frame
        this.ship.object3D.position.lerp(this.targetPosition, 0.05);

        // 3. Actualizar la línea de trayectoria
        this.updatePath();
    },

    updateTarget: function(data) {
        // Conversión de Km reales a Escala VR (1 unidad = 100,000 km)
        let scale = this.data.scaleFactor;
        this.targetPosition.set(
            data.x / scale,
            data.y / scale,
            data.z / scale
        );

        // Actualizar UI con datos matemáticos exactos
        this.uiEarth.innerText = data.distEarth.toLocaleString('es-ES', {maximumFractionDigits: 1});
        this.uiMoon.innerText = data.distMoon.toLocaleString('es-ES', {maximumFractionDigits: 1});
        this.uiSpeed.innerText = data.speed.toLocaleString('es-ES', {maximumFractionDigits: 1});
    },

    updatePath: function() {
        // Solo agrega un punto si la nave se ha movido lo suficiente (optimización de memoria)
        let currentPos = this.ship.object3D.position;
        if (this.pathPoints.length === 0 || currentPos.distanceTo(this.pathPoints[this.pathPoints.length - 1]) > 0.05) {
            
            if (this.pathPoints.length >= 1000) this.pathPoints.shift(); // Evita desbordamiento de memoria
            this.pathPoints.push(currentPos.clone());
            
            for (let i = 0; i < this.pathPoints.length; i++) {
                this.positions[i * 3] = this.pathPoints[i].x;
                this.positions[i * 3 + 1] = this.pathPoints[i].y;
                this.positions[i * 3 + 2] = this.pathPoints[i].z;
            }
            
            this.line.geometry.attributes.position.needsUpdate = true;
            this.line.geometry.setDrawRange(0, this.pathPoints.length);
        }
    },

    updateUIStatus: function() {
        if (window.arowService.isSimulating) {
            this.uiStatus.innerText = "SIMULACIÓN (AROW Offline)";
            this.uiStatus.style.color = "#ff9900";
        } else {
            this.uiStatus.innerText = "DATOS EN VIVO (AROW)";
            this.uiStatus.style.color = "#00ffcc";
        }
        this.uiPing.innerText = `${this.data.updateInterval} ms`;
    }
});