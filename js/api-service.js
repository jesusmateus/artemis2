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

        let flybyTimeMs = this.launchDateMs + (this.missionDurationMs * 0.5);
        let moonFlybyPos = window.physicsEngine ? 
            window.physicsEngine.getLunarGeocentricPosition(flybyTimeMs) : 
            new THREE.Vector3(3.844, 0, 0);

        let scale = 100000;
        let targetX = moonFlybyPos.x * scale;
        let targetY = moonFlybyPos.y * scale;
        let targetZ = moonFlybyPos.z * scale;

        // --- CORRECCIÓN VECTORIAL HORIZONTAL (X-Z) ---
        let dir = new THREE.Vector3(targetX, targetY, targetZ).normalize();
        // El vector perpendicular extrae el componente 'y' y cruza X con Z para que la curva sea acostada
        let perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        let progressRadius = Math.sin(t * Math.PI) * 400000;
        let bulge = Math.sin(t * 2 * Math.PI) * 150000;

        // El componente 'y' (altura) solo sufre una leve variación debido a la inclinación de la órbita (5.14°)
        let x = (dir.x * progressRadius) + (perp.x * bulge);
        let y = (dir.y * progressRadius) + (Math.sin(t * Math.PI) * 20000);
        let z = (dir.z * progressRadius) + (perp.z * bulge);

        let distEarth = Math.sqrt(x*x + y*y + z*z);

        let currentMoonPos = window.physicsEngine ? window.physicsEngine.getLunarGeocentricPosition(currentTimeMs) : moonFlybyPos;
        let mx = currentMoonPos.x * scale, my = currentMoonPos.y * scale, mz = currentMoonPos.z * scale;
        let distMoon = Math.sqrt(Math.pow(mx - x, 2) + Math.pow(my - y, 2) + Math.pow(mz - z, 2));

        let speed = 40000 - (Math.abs(Math.sin(t * Math.PI)) * 34000);

        return { x, y, z, distEarth, distMoon, speed };
    }
}
window.arowService = new ArowService();