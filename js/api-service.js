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
        let t = elapsedMs / this.missionDurationMs; // Normalizado de 0 a 1
        
        if (t < 0) t = 0;
        if (t > 1) t = 1;

        let scale = 100000;
        let x = 0, y = 0, z = 0, speed = 0;

        // Posición futura de la Luna
        let flybyTimeMs = this.launchDateMs + (this.missionDurationMs * 0.45);
        let moonFlybyPos = window.physicsEngine ? 
            window.physicsEngine.getLunarGeocentricPosition(flybyTimeMs) : new THREE.Vector3(3.844, 0, 0);
        
        let targetX = moonFlybyPos.x * scale;
        let targetZ = moonFlybyPos.z * scale;
        let dir = new THREE.Vector3(targetX, 0, targetZ).normalize();
        let perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        // FASE 1: Órbita Altamente Elíptica (HEO) - Primer 10% del tiempo
        if (t <= 0.1) {
            let phaseT = t / 0.1; 
            let orbitRadius = 15000 + (Math.sin(phaseT * Math.PI) * 45000); 
            let angle = phaseT * Math.PI * 4; // 2 órbitas terrestres
            
            x = Math.cos(angle) * orbitRadius;
            z = Math.sin(angle) * orbitRadius;
            y = Math.sin(phaseT * Math.PI * 2) * 5000;
            speed = 28000;
        } 
        // FASE 2: Inyección Translunar y Retorno (Bucle 8 Continuo perfecto)
        else {
            let lunarT = (t - 0.1) / 0.9; // Normalizado del 10% al 100%
            
            // Math.sin(lunarT * PI) crea un arco perfecto que va a la Luna (400k) y vuelve a 0
            let progressRadius = Math.sin(lunarT * Math.PI) * 400000; 
            // Math.sin(lunarT * 2 * PI) crea la anchura del "8", cruzando el centro suavemente
            let bulge = Math.sin(lunarT * Math.PI * 2) * 45000; 
            
            x = (dir.x * progressRadius) + (perp.x * bulge);
            z = (dir.z * progressRadius) + (perp.z * bulge);
            y = Math.sin(lunarT * Math.PI) * 15000; // Inclinación orbital
            
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