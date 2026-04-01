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

    // Generador de trayectoria translunar para hoy (1 de Abril 2026) si la API falla
    generateMockData() {
        this.isSimulating = true;
        this.mockTime += 0.05; // Incremento de tiempo simulado
        
        // Simulación de Inyección Translunar (TLI)
        let x = this.mockTime * 150000; 
        let y = Math.sin(this.mockTime * 2) * 15000;
        let z = Math.cos(this.mockTime) * 10000;
        
        if (x > 380000) this.mockTime = 0; // Reinicia cerca de la Luna

        let distEarth = Math.sqrt(x*x + y*y + z*z);
        let distMoon = Math.sqrt(Math.pow(384400 - x, 2) + Math.pow(y, 2) + Math.pow(z, 2));

        this.currentData = {
            x: x, y: y, z: z,
            distEarth: distEarth,
            distMoon: distMoon,
            speed: 39500 - (this.mockTime * 2000) // Desaceleración en ruta
        };
    }
}

// Exportar globalmente para A-Frame
window.arowService = new ArowService();