AFRAME.registerComponent('artemis-tracker', {
    schema: {
        scaleFactor: {type: 'number', default: 100000}, 
        updateInterval: {type: 'number', default: 3000} 
    },

    init: function () {
        this.ship = document.querySelector('#orion-ship');
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.lastFetchTime = 0;
        this.pathPoints =[];
        
        // Material de la trayectoria
        const material = new THREE.LineBasicMaterial({ color: 0xff3300, linewidth: 2, transparent: true, opacity: 0.8 });
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(3000); // 1000 puntos máximo
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        
        this.line = new THREE.Line(this.geometry, material);
        this.el.sceneEl.object3D.add(this.line);

        // UI
        this.uiEarth = document.getElementById('dist-earth');
        this.uiMoon = document.getElementById('dist-moon');
        this.uiSpeed = document.getElementById('speed');
        this.uiStatus = document.getElementById('data-status');
        this.uiPing = document.getElementById('ping-rate');

        // Generar la línea roja del pasado ANTES del primer render
        this.precomputeHistoricalPath();
    },

    tick: function (time) {
        // Polling cada 3 segundos
        if (time - this.lastFetchTime > this.data.updateInterval) {
            window.arowService.fetchTelemetry().then(data => {
                if (data) this.updateTarget(data);
                this.updateUIStatus();
            });
            this.lastFetchTime = time;
        }

        // Interpolación fluida
        if (this.ship && this.ship.object3D) {
            this.ship.object3D.position.lerp(this.targetPosition, 0.05);
        }

        this.updatePath();
    },

    updateTarget: function(data) {
        let scale = this.data.scaleFactor;
        this.targetPosition.set(data.x / scale, data.y / scale, data.z / scale);

        if(this.uiEarth) this.uiEarth.innerText = data.distEarth.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiMoon) this.uiMoon.innerText = data.distMoon.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiSpeed) this.uiSpeed.innerText = data.speed.toLocaleString('es-ES', {maximumFractionDigits: 1});
    },

    updatePath: function() {
        if (!this.ship || !this.ship.object3D) return;

        let currentPos = this.ship.object3D.position;
        
        // Dibuja un punto solo si la nave se movió significativamente
        if (this.pathPoints.length === 0 || currentPos.distanceTo(this.pathPoints[this.pathPoints.length - 1]) > 0.01) {
            if (this.pathPoints.length >= 1000) this.pathPoints.shift(); 
            this.pathPoints.push(currentPos.clone());
            this.flushPathToGPU();
        }
    },

    // NUEVA FUNCIÓN: Dibuja la línea desde el despegue hasta AHORA
    precomputeHistoricalPath: function() {
        if (!window.arowService.isSimulating) return; // Si la API real funciona, dejamos que la API guíe.
        
        let now = Date.now();
        let launch = window.arowService.launchDateMs;
        if (now <= launch) return; // Aún no ha despegado

        let elapsed = now - launch;
        let intervals = 500; // Queremos 500 puntos en el historial
        let stepMs = elapsed / intervals;
        
        let scale = this.data.scaleFactor;

        for (let i = 0; i <= intervals; i++) {
            let timeSim = launch + (stepMs * i);
            let state = window.arowService.getDeterministicState(timeSim);
            
            this.pathPoints.push(new THREE.Vector3(
                state.x / scale,
                state.y / scale,
                state.z / scale
            ));
        }
        
        // Poner la nave inmediatamente al final de la línea para evitar saltos iniciales
        let lastPoint = this.pathPoints[this.pathPoints.length - 1];
        this.ship.object3D.position.copy(lastPoint);
        this.targetPosition.copy(lastPoint);
        
        this.flushPathToGPU();
    },

    flushPathToGPU: function() {
        for (let i = 0; i < this.pathPoints.length; i++) {
            this.positions[i * 3] = this.pathPoints[i].x;
            this.positions[i * 3 + 1] = this.pathPoints[i].y;
            this.positions[i * 3 + 2] = this.pathPoints[i].z;
        }
        this.line.geometry.attributes.position.needsUpdate = true;
        this.line.geometry.setDrawRange(0, this.pathPoints.length);
    },

    updateUIStatus: function() {
        if (!this.uiStatus) return;
        if (window.arowService.isSimulating) {
            this.uiStatus.innerText = "SIMULATION (AROW Offline / Calculating UTC)";
            this.uiStatus.style.color = "#ff9900"; 
        } else {
            this.uiStatus.innerText = "DATOS EN VIVO (AROW)";
            this.uiStatus.style.color = "#00ffcc"; 
        }
        if(this.uiPing) this.uiPing.innerText = `${this.data.updateInterval} ms`;
    }
});