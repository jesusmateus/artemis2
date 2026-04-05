/**
 * Componente de Rastreo y Renderizado de Trayectoria Suavizada (Spline)
 */
AFRAME.registerComponent('artemis-tracker', {
    schema: { 
        scaleFactor: {type: 'number', default: 100000}, 
        updateInterval: {type: 'number', default: 3000} 
    },

    init: function () {
        this.ship = document.querySelector('#orion-ship');
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.lastFetchTime = 0;
        
        // DOS TRAYECTORIAS SEPARADAS (Pasado y Futuro)
        this.pastGeom = new THREE.BufferGeometry();
        // Naranja Dorado para la ruta completada (Histórico)
        this.pastLine = new THREE.Line(this.pastGeom, new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 }));
        
        this.futureGeom = new THREE.BufferGeometry();
        // Cyan translúcido para la ruta proyectada (Futuro)
        this.futureLine = new THREE.Line(this.futureGeom, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 }));
        
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

        // Interpolación fluida (Lerp) de la nave
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
        
        let rawPastPoints =[];
        let rawFuturePoints =[];
        let intervals = 400; // Puntos de anclaje base
        let stepMs = duration / intervals;

        // 1. Extraer los datos matemáticos
        for (let i = 0; i <= intervals; i++) {
            let timeSim = launch + (stepMs * i);
            let state = window.arowService.getDeterministicState(timeSim);
            let pos = new THREE.Vector3(state.x / scale, state.y / scale, state.z / scale);

            if (timeSim <= now) {
                rawPastPoints.push(pos);
            } else {
                rawFuturePoints.push(pos);
            }
        }

        // Para evitar cortes, unimos la línea futura exactamente donde termina la pasada
        if (rawPastPoints.length > 0 && rawFuturePoints.length > 0) {
            rawFuturePoints.unshift(rawPastPoints[rawPastPoints.length - 1]);
        }
        
        // 2. INGENIERÍA GRÁFICA: Splines de Catmull-Rom para suavizado perfecto
        if (rawPastPoints.length > 1) {
            const pastCurve = new THREE.CatmullRomCurve3(rawPastPoints);
            // Genera 1000 vértices perfectamente curvos entre los anclajes
            this.pastGeom.setFromPoints(pastCurve.getPoints(1000)); 
        }

        if (rawFuturePoints.length > 1) {
            const futureCurve = new THREE.CatmullRomCurve3(rawFuturePoints);
            this.futureGeom.setFromPoints(futureCurve.getPoints(1000));
        }
        
        // Ubicar la nave en el último punto del pasado
        if (rawPastPoints.length > 0) {
            let currentRealPos = rawPastPoints[rawPastPoints.length - 1];
            this.ship.object3D.position.copy(currentRealPos);
            this.targetPosition.copy(currentRealPos);
        }
    },

    updateUIStatus: function() {
        if (!this.uiStatus) return;
        if (window.arowService.isSimulating) {
            this.uiStatus.innerText = "UTC DETERMINISTIC CALCULATION (Telemetry API Offline)";
            this.uiStatus.style.color = "#ff9900"; 
        } else {
            this.uiStatus.innerText = "LIVE DATA (AROW Connected)";
            this.uiStatus.style.color = "#00ffcc"; 
        }
    }
});