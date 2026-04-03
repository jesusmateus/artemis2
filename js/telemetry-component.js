AFRAME.registerComponent('artemis-tracker', {
    schema: { scaleFactor: {type: 'number', default: 100000}, updateInterval: {type: 'number', default: 3000} },

    init: function () {
        this.ship = document.querySelector('#orion-ship');
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.lastFetchTime = 0;
        
        // DOS TRAYECTORIAS SEPARADAS (Pasado y Futuro)
        this.pastPoints =[];
        this.futurePoints =[];

        // Geometría Pasada (Línea Roja sólida)
        this.pastGeom = new THREE.BufferGeometry();
        this.pastLine = new THREE.Line(this.pastGeom, new THREE.LineBasicMaterial({ color: 0xff3300, linewidth: 2 }));
        
        // Geometría Futura (Línea Cyan translúcida)
        this.futureGeom = new THREE.BufferGeometry();
        this.futureLine = new THREE.Line(this.futureGeom, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 }));
        
        this.el.sceneEl.object3D.add(this.pastLine);
        this.el.sceneEl.object3D.add(this.futureLine);

        this.uiEarth = document.getElementById('dist-earth');
        this.uiMoon = document.getElementById('dist-moon');
        this.uiSpeed = document.getElementById('speed');
        this.uiStatus = document.getElementById('data-status');

        this.precomputeHistoricalAndFuturePath();
    },

    tick: function (time) {
        if (time - this.lastFetchTime > this.data.updateInterval) {
            window.arowService.fetchTelemetry().then(data => {
                if (data) this.updateTarget(data);
                this.updateUIStatus();
            });
            this.lastFetchTime = time;
        }

        if (this.ship && this.ship.object3D) {
            this.ship.object3D.position.lerp(this.targetPosition, 0.05);
        }
    },

    updateTarget: function(data) {
        let scale = this.data.scaleFactor;
        this.targetPosition.set(data.x / scale, data.y / scale, data.z / scale);

        if(this.uiEarth) this.uiEarth.innerText = data.distEarth.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiMoon) this.uiMoon.innerText = data.distMoon.toLocaleString('es-ES', {maximumFractionDigits: 1});
        if(this.uiSpeed) this.uiSpeed.innerText = data.speed.toLocaleString('es-ES', {maximumFractionDigits: 1});
    },

    precomputeHistoricalAndFuturePath: function() {
        let now = Date.now();
        let launch = window.arowService.launchDateMs;
        let duration = window.arowService.missionDurationMs;
        let scale = this.data.scaleFactor;
        
        let intervals = 600; // Resolución del dibujo
        let stepMs = duration / intervals;

        for (let i = 0; i <= intervals; i++) {
            let timeSim = launch + (stepMs * i);
            let state = window.arowService.getDeterministicState(timeSim);
            let pos = new THREE.Vector3(state.x / scale, state.y / scale, state.z / scale);

            if (timeSim <= now) {
                this.pastPoints.push(pos);
            } else {
                this.futurePoints.push(pos);
            }
        }
        
        // Actualizar los Buffers de WebGL
        this.pastGeom.setFromPoints(this.pastPoints);
        
        // Para que las líneas conecten, el primer punto futuro es el último del pasado
        if (this.pastPoints.length > 0) {
            this.futurePoints.unshift(this.pastPoints[this.pastPoints.length - 1]);
        }
        this.futureGeom.setFromPoints(this.futurePoints);
        
        // Ubicar la nave en el tiempo presente (final de la línea roja)
        if (this.pastPoints.length > 0) {
            let currentRealPos = this.pastPoints[this.pastPoints.length - 1];
            this.ship.object3D.position.copy(currentRealPos);
            this.targetPosition.copy(currentRealPos);
        }
    },

    updateUIStatus: function() {
        if (!this.uiStatus) return;
        if (window.arowService.isSimulating) {
            this.uiStatus.innerText = "UTC CALCULATION (AROW API Blocked/Offline)";
            this.uiStatus.style.color = "#ff9900"; 
        } else {
            this.uiStatus.innerText = "LIVE DATA (AROW Connected)";
            this.uiStatus.style.color = "#00ffcc"; 
        }
    }
});