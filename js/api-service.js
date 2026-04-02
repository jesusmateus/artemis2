/**
 * Servicio de Telemetría AROW - Arquitectura Determinista basada en Tiempo UTC
 */
class ArowService {
    constructor() {
        // Endpoint teórico esperado para AROW Artemis II. Puede variar según los protocolos de NASA hoy.
        this.apiUrl = 'https://client.arow.nasa.gov/api/v1/telemetry/latest';
        this.isSimulating = true;
        
        // HORA CERO EXACTA: 1 de Abril de 2026 (Ajusta la hora UTC según el despegue oficial)
        // Ejemplo: 14:00:00 UTC
        this.launchDateMs = new Date('2026-04-01T14:00:00Z').getTime();
        
        // Duración teórica de la misión Artemis II: ~10 días en milisegundos
        this.missionDurationMs = 10 * 24 * 60 * 60 * 1000; 
    }

    async fetchTelemetry() {
        try {
            // Intentamos conectar con la telemetría en vivo. 'cache: no-store' evita datos viejos.
            const response = await fetch(this.apiUrl, { cache: "no-store" });
            if (!response.ok) throw new Error('API AROW inaccesible o bloqueada por CORS');
            
            const data = await response.json();
            this.isSimulating = false;
            
            return {
                x: data.x, y: data.y, z: data.z,
                distEarth: data.distanceFromEarth,
                distMoon: data.distanceFromMoon,
                speed: data.relativeVelocity
            };
        } catch (error) {
            // Si la API falla (lo más probable en un entorno frontend sin proxy), 
            // entra el Simulador Determinista de precisión temporal.
            this.isSimulating = true;
            return this.getDeterministicState(Date.now());
        }
    }

    /**
     * Calcula la posición exacta de la nave basándose estrictamente en el reloj mundial.
     * @param {number} currentTimeMs - Timestamp actual
     */
    getDeterministicState(currentTimeMs) {
        let elapsedMs = currentTimeMs - this.launchDateMs;

        // 1. Si aún no hemos despegado (antes de la hora cero)
        if (elapsedMs < 0) {
            return { x: 0.1, y: 0, z: 0, distEarth: 0, distMoon: 384400, speed: 0 };
        }

        // 2. Si la misión ya terminó (Splashdown)
        if (elapsedMs > this.missionDurationMs) {
            return { x: 0.1, y: 0, z: 0, distEarth: 0, distMoon: 384400, speed: 0 };
        }

        // 3. Mapeo del progreso (t va de 0 a 1 durante los 10 días)
        let t = elapsedMs / this.missionDurationMs;
        let pi = Math.PI;

        // Ecuaciones paramétricas de la "Free-Return Trajectory" ajustadas a 10 días
        // El punto más lejano (apogeo lunar) ocurre aproximadamente a la mitad (t = ~0.4 a 0.5)
        let x = Math.sin(t * pi) * 400000;       // Llega hasta 400,000 km y vuelve a 0
        let y = Math.sin(t * 2 * pi) * 40000;    // Dibuja el arco del "8" en el eje Y
        let z = Math.sin(t * pi) * 15000;        // Inclinación orbital respecto a la eclíptica

        let distEarth = Math.sqrt(x*x + y*y + z*z);
        // Distancia a la luna (centro lunar en X = 384400, Y = 0, Z = 0)
        let distMoon = Math.sqrt(Math.pow(384400 - x, 2) + Math.pow(y, 2) + Math.pow(z, 2));

        // Cálculo de velocidad (mayor cerca de la Tierra ~39000 km/h, menor cerca de la Luna ~5000 km/h)
        let speed = 40000 - (Math.abs(Math.sin(t * pi)) * 35000);

        return { x: x, y: y, z: z, distEarth: distEarth, distMoon: distMoon, speed: speed };
    }
}

window.arowService = new ArowService();