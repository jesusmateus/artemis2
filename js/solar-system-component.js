AFRAME.registerComponent('cosmic-environment', {
    init: function () {
        this.engine = window.physicsEngine;
        this.planets = this.engine.planets;
        this.planetEntities = {};
        
        // 1. Contenedor Maestro Heliocéntrico
        this.helioContainer = document.createElement('a-entity');
        this.helioContainer.setAttribute('id', 'heliocentric-system');
        this.el.appendChild(this.helioContainer);

        // 2. Vincular el Sol (Sin alterar el DOM para no romper la luz de A-Frame)
        this.sun = document.querySelector('#sun');
        if (this.sun) {
            // Solo le agregamos la rotación diferencial visual
            this.sun.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 2160000; easing: linear');
        }

        // 3. Generar Planetas y sus Anillos Orbitales
        Object.keys(this.planets).forEach(key => {
            if(key === 'earth') return; 

            let p = this.planets[key];
            let sphere = document.createElement('a-sphere');
            sphere.setAttribute('radius', p.r);
            sphere.setAttribute('color', p.color);
            sphere.setAttribute('class', 'clickable');
            sphere.setAttribute('data-name', key.toUpperCase());
            this.helioContainer.appendChild(sphere);
            this.planetEntities[key] = sphere;

            this.createOrbitRing(this.helioContainer, p.a, p.i, p.color);
        });

        // 4. Vincular la Luna
        this.moon = document.querySelector('#moon-container');
        let earthSystem = document.querySelector('#earth-system');
        
        if (earthSystem) {
            this.createOrbitRing(earthSystem, 3.844, 5.14, '#ffffff', 0.05);
        }
    },

    // --- AQUÍ ESTÁ LA CORRECCIÓN GEOMÉTRICA DEL ANILLO ---
    createOrbitRing: function(parent, radius, inclination, color, opacity = 0.2) {
        const geometry = new THREE.BufferGeometry();
        const points =[];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            let theta = (i / segments) * Math.PI * 2;
            // Dibuja estrictamente en el plano horizontal (X y Z). Y se mantiene en 0.
            points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
        }
        geometry.setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
        const ring = new THREE.Line(geometry, material);
        
        // La inclinación orbital se aplica rotando el anillo sobre el eje X
        ring.rotation.x = inclination * (Math.PI / 180);
        parent.object3D.add(ring);
    },

    tick: function () {
        let now = Date.now();

        Object.keys(this.planetEntities).forEach(key => {
            let pos = this.engine.getHeliocentricPosition(key, now);
            this.planetEntities[key].object3D.position.copy(pos);
            this.planetEntities[key].object3D.rotation.y += 0.01;
        });

        // B. El Truco de la Relatividad:
        let earthHeliocentricPos = this.engine.getHeliocentricPosition('earth', now);
        this.helioContainer.object3D.position.set(-earthHeliocentricPos.x, -earthHeliocentricPos.y, -earthHeliocentricPos.z);

        // Sincronizar el Sol al centro del Sistema Heliocéntrico dinámicamente
        if (this.sun) {
            this.sun.object3D.position.copy(this.helioContainer.object3D.position);
        }

        let earthKinematics = this.engine.getEarthRotationAndPrecession(now);
        let earthEl = document.querySelector('#earth-container');
        if (earthEl) {
            earthEl.object3D.rotation.set(
                23.44 * (Math.PI / 180), 
                (earthKinematics.rotation + earthKinematics.precession) * (Math.PI / 180), 
                0
            );
        }

        if (this.moon) {
            let moonPos = this.engine.getLunarGeocentricPosition(now);
            this.moon.object3D.position.copy(moonPos);
            this.moon.object3D.lookAt(new THREE.Vector3(0,0,0)); 
        }
    }
});