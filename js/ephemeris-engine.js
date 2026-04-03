/**
 * MOTOR DE EFEMÉRIDES KEPLERIANO (Alineación Horizonte X-Z)
 */
class OrbitalMechanics {
    constructor() {
        this.scale = 100000;
        this.AU = 149597870.7 / this.scale; 
        this.J2000 = new Date('2000-01-01T12:00:00Z').getTime();

        this.planets = {
            mercury: { a: 0.387 * this.AU, e: 0.2056, i: 7.00, color: '#8c8c8c', r: 0.024 },
            venus:   { a: 0.723 * this.AU, e: 0.0068, i: 3.39, color: '#e6b800', r: 0.060 },
            earth:   { a: 1.000 * this.AU, e: 0.0167, i: 0.00, color: '#2b82c9', r: 0.06378, tilt: 23.44 },
            mars:    { a: 1.524 * this.AU, e: 0.0934, i: 1.85, color: '#cc4400', r: 0.033 },
            jupiter: { a: 5.203 * this.AU, e: 0.0484, i: 1.30, color: '#d9b38c', r: 0.699 },
            saturn:  { a: 9.537 * this.AU, e: 0.0539, i: 2.49, color: '#e6ccb3', r: 0.582 },
            uranus:  { a: 19.19 * this.AU, e: 0.0473, i: 0.77, color: '#b3e6ff', r: 0.253 },
            neptune: { a: 30.07 * this.AU, e: 0.0086, i: 1.77, color: '#3333ff', r: 0.246 },
            pluto:   { a: 39.48 * this.AU, e: 0.2488, i: 17.16, color: '#dddddd', r: 0.011 }
        };
    }

    getDaysSinceJ2000(timestamp) {
        return (timestamp - this.J2000) / (1000 * 60 * 60 * 24);
    }

    getHeliocentricPosition(planetId, timestamp) {
        let d = this.getDaysSinceJ2000(timestamp);
        let p = this.planets[planetId];
        let periodDays = Math.sqrt(Math.pow(p.a / this.AU, 3)) * 365.25;
        let M = (2 * Math.PI * (d / periodDays)) % (2 * Math.PI);
        let v = M + (2 * p.e * Math.sin(M));
        let r = p.a * (1 - p.e * p.e) / (1 + p.e * Math.cos(v));
        
        let iRad = p.i * (Math.PI / 180);
        
        // ¡CORRECCIÓN CRÍTICA! El horizonte es X-Z. La inclinación levanta el eje Y.
        let x = r * Math.cos(v);
        let z = r * Math.sin(v) * Math.cos(iRad);
        let y = r * Math.sin(v) * Math.sin(iRad);
        
        return new THREE.Vector3(x, y, z);
    }

    getEarthRotationAndPrecession(timestamp) {
        let d = this.getDaysSinceJ2000(timestamp);
        let rotY = (d * 360.9856) % 360;
        let precessionY = (d / (25772 * 365.25)) * 360; 
        return { rotation: rotY, precession: precessionY };
    }

    getLunarGeocentricPosition(timestamp) {
        let d = this.getDaysSinceJ2000(timestamp);
        let L = (2 * Math.PI * (d / 27.322)) % (2 * Math.PI);
        let e = 0.0549;
        let v = L + (2 * e * Math.sin(L)); 
        let distance = 384400 / this.scale; 
        
        let inc = 5.14 * (Math.PI / 180);
        
        // Alineación perfecta de la órbita lunar en el horizonte X-Z
        let x = distance * Math.cos(v);
        let z = distance * Math.sin(v) * Math.cos(inc);
        let y = distance * Math.sin(v) * Math.sin(inc);

        return new THREE.Vector3(x, y, z);
    }
}
window.physicsEngine = new OrbitalMechanics();