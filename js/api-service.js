class ArowService {
    constructor() {
        this.apiUrl = 'https://client.arow.nasa.gov/api/v1/telemetry/latest';
        this.isSimulating = true;
        this.apiFailedAttempts = 0; 
        this.apiDead = false;       
        
        this.launchDateMs = new Date('2026-04-01T14:00:00Z').getTime();
        this.missionDurationMs = 10 * 24 * 60 * 60 * 1000; 
    }

    async fetchTelemetry() {
        if (this.apiDead) return this.getDeterministicState(Date.now());

        try {
            const response = await fetch(this.apiUrl, { cache: "no-store" });
            if (!response.ok) throw new Error('API bloqueada');
            const data = await response.json();
            this.isSimulating = false;
            return { x: data.x, y: data.y, z: data.z, distEarth: data.distanceFromEarth, distMoon: data.distanceFromMoon, speed: data.relativeVelocity };
        } catch (error) {
            this.apiFailedAttempts++;
            if (this.apiFailedAttempts >= 3) {
                console.warn("[SISTEMA] Conexión AROW abortada tras 3 fallos. Modo UTC Determinista activado.");
                this.apiDead = true;
            }
            this.isSimulating = true;
            return this.getDeterministicState(Date.now());
        }
    }

    getDeterministicState(currentTimeMs) {
        let elapsedMs = currentTimeMs - this.launchDateMs;
        let t = elapsedMs / this.missionDurationMs; 
        
        if (t < 0) t = 0;
        if (t > 1) t = 1;

        let scale = 100000;
        let x = 0, y = 0, z = 0, speed = 0;

        let flybyTimeMs = this.launchDateMs + (this.missionDurationMs * 0.45);
        let moonFlybyPos = window.physicsEngine ? 
            window.physicsEngine.getLunarGeocentricPosition(flybyTimeMs) : new THREE.Vector3(3.844, 0, 0);
        
        let targetX = moonFlybyPos.x * scale;
        let targetZ = moonFlybyPos.z * scale;
        let dir = new THREE.Vector3(targetX, 0, targetZ).normalize();
        let perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        // -------------------------------------------------------------
        // FASE 1: ÓRBITA DE COMPROBACIÓN HEO (Un solo loop, Día 1)
        // -------------------------------------------------------------
        if (t <= 0.1) {
            let phaseT = t / 0.1; // Normalizado (0 a 1) para esta fase
            
            // Math.PI * 2 = Exactamente UNA (1) vuelta a la Tierra
            let angle = phaseT * Math.PI * 2; 
            
            // La órbita llega hasta 74,000 km (apogeo HEO) y regresa a 0 para el encendido TLI
            let orbitRadius = Math.sin(phaseT * Math.PI) * 74000; 
            
            // Giramos el loop HEO para que no colisione visualmente de frente con el "8"
            let heoDir = new THREE.Vector3(dir.x + perp.x, 0, dir.z + perp.z).normalize();
            let heoPerp = new THREE.Vector3(-heoDir.z, 0, heoDir.x).normalize();

            x = (heoDir.x * Math.cos(angle) * orbitRadius) + (heoPerp.x * Math.sin(angle) * orbitRadius * 0.4);
            z = (heoDir.z * Math.cos(angle) * orbitRadius) + (heoPerp.z * Math.sin(angle) * orbitRadius * 0.4);
            y = Math.sin(phaseT * Math.PI * 2) * 5000;
            
            speed = 28000;
        } 
        // -------------------------------------------------------------
        // FASE 2: INYECCIÓN TRANSLUNAR Y RETORNO (Día 2 al 10)
        // -------------------------------------------------------------
        else {
            let lunarT = (t - 0.1) / 0.9; 
            
            let progressRadius = Math.sin(lunarT * Math.PI) * 400000; 
            let bulge = Math.sin(lunarT * Math.PI * 2) * 45000; 
            
            x = (dir.x * progressRadius) + (perp.x * bulge);
            z = (dir.z * progressRadius) + (perp.z * bulge);
            y = Math.sin(lunarT * Math.PI) * 15000; 
            
            speed = 40000 - (Math.sin(lunarT * Math.PI) * 35000); 
        }

        let distEarth = Math.sqrt(x*x + y*y + z*z);
        let currentMoonPos = window.physicsEngine ? window.physicsEngine.getLunarGeocentricPosition(currentTimeMs) : moonFlybyPos;
        let mx = currentMoonPos.x * scale, my = currentMoonPos.y * scale, mz = currentMoonPos.z * scale;
        let distMoon = Math.sqrt(Math.pow(mx - x, 2) + Math.pow(my - y, 2) + Math.pow(mz - z, 2));

        return { x, y, z, distEarth, distMoon, speed };
    }
}
window.arowService = new ArowService();