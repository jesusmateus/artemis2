/**
 * Servicio de conexión a AROW (Artemis Real-time Orbit Website)
 * Extrae vectores de estado X, Y, Z y telemetría de la misión.
 */
class ArowService {
    constructor() {
        // Endpoint oficial/estimado de AROW para Artemis II
        this.apiUrl = 'https://data.nasa.gov/api/artemis/telemetry/latest';
        this.currentData = null;
        this.isSimulating = false; // Fallback si la API está caída
        this.mockTime = 0;
    }

    async fetchTelemetry() {
        try {
            // En un entorno de producción estricto, validar CORS.
            const response = await fetch(this.apiUrl);
            if (!response.ok) throw new Error('API AROW no disponible');
            
            const data = await response.json();
            // Estructura esperada de AROW J2000
            this.currentData = {
                x: data.x, // en km
                y: data.y, // en km
                z: data.z, // en km
                distEarth: data.distanceFromEarth,
                distMoon: data.distanceFromMoon,
                speed: data.relativeVelocity
            };
            this.isSimulating = false;
        } catch (error) {
            console.warn("Fallo al conectar con AROW. Usando simulador orbital de respaldo (TLI).");
            this.generateMockData();
        }
        return this.currentData;
    }

// Generador de trayectoria translunar (Free-Return Figure-8)
    generateMockData() {
        this.isSimulating = true;
        this.mockTime += 0.001; // Velocidad de simulación
        
        if (this.mockTime > 1) {
            this.mockTime = 0; // Reinicia ciclo completo
            // Para evitar el cruce de líneas, emitimos un evento custom
            window.dispatchEvent(new Event('orbitReset')); 
        }

        // 't' va de 0 a 2*PI
        let t = this.mockTime * Math.PI * 2;
        
        // Ecuaciones paramétricas de retorno libre hacia la Luna (X = 384,400)
        let x = (1 - Math.cos(t)) * 210000;  // Alcanza hasta X=420,000 (rodea la Luna)
        let y = Math.sin(t) * 80000;         // Arco de ida y vuelta
        let z = Math.sin(t / 2) * 15000;     // Ligera inclinación orbital

        let distEarth = Math.sqrt(x*x + y*y + z*z);
        let distMoon = Math.sqrt(Math.pow(384400 - x, 2) + Math.pow(y, 2) + Math.pow(z, 2));

        this.currentData = {
            x: x, y: y, z: z,
            distEarth: distEarth,
            distMoon: distMoon,
            speed: 39500 - (Math.abs(Math.sin(t)) * 10000)
        };
    }
}

// Exportar globalmente para A-Frame
window.arowService = new ArowService();