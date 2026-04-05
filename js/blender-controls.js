// 1. COMPONENTE: LETREROS DINÁMICOS (Escala proporcional a la distancia)
AFRAME.registerComponent('dynamic-label', {
    schema: {
        text: {type: 'string', default: 'OBJETO'},
        baseScale: {type: 'number', default: 0.1}
    },
    init: function () {
        this.cameraEl = document.querySelector('#camera');
        
        // Crear el texto en 3D
        this.textEl = document.createElement('a-text');
        this.textEl.setAttribute('value', this.data.text);
        this.textEl.setAttribute('align', 'center');
        this.textEl.setAttribute('color', '#00ffcc');
        this.textEl.setAttribute('font', 'monoid');
        // El texto siempre mirará a la cámara para ser legible
        this.textEl.setAttribute('look-at', '#camera'); 
        this.el.appendChild(this.textEl);
    },
    tick: function () {
        if (!this.cameraEl) return;
        
        // Obtener posiciones absolutas en el mundo 3D
        let targetPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(targetPos);
        
        let camPos = new THREE.Vector3();
        this.cameraEl.object3D.getWorldPosition(camPos);
        
        // Calcular distancia y escalar proporcionalmente
        let dist = targetPos.distanceTo(camPos);
        let scaleVal = dist * this.data.baseScale;
        
        // Aplicar la escala calculada
        this.textEl.setAttribute('scale', `${scaleVal} ${scaleVal} ${scaleVal}`);
        this.textEl.object3D.lookAt(camPos);
    }
});

// 2. COMPONENTE: GENERADOR DE ESTRELLAS
AFRAME.registerComponent('starfield', {
    init: function() {
        const geom = new THREE.BufferGeometry();
        const vertices =[];
        for(let i = 0; i < 10000; i++) {
            vertices.push(
                (Math.random() - 0.5) * 100000, 
                (Math.random() - 0.5) * 100000, 
                (Math.random() - 0.5) * 100000
            );
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const mat = new THREE.PointsMaterial({color: 0xffffff, size: 1.2, sizeAttenuation: false});
        const stars = new THREE.Points(geom, mat);
        this.el.sceneEl.object3D.add(stars);
    }
});

// 3. COMPONENTE: CONTROLES TIPO BLENDER (Click, Zoom Numpad, Orbitar Rueda Centro)
AFRAME.registerComponent('blender-controls', {
    init: function() {
        this.selectedEl = null;
        this.rigEl = document.querySelector('#rig');
        this.cameraEl = document.querySelector('#camera');
        this.orbiting = false;
        
        // Ajustar el límite de visión cercana para no atravesar los planetas al hacer Zoom In
        this.cameraEl.setAttribute('camera', 'near', 0.005);
        
        // A. DETECCIÓN DE CLICK REPARADA (Usando Raycaster sobre las Hitboxes)
        this.el.sceneEl.addEventListener('click', (e) => {
            if(e.detail.intersectedEl && e.detail.intersectedEl.classList.contains('clickable')) {
                this.selectedEl = e.detail.intersectedEl;
                let name = this.selectedEl.getAttribute('data-name');
                
                // Actualizar interfaz con las instrucciones de Blender
                document.getElementById('instructions').innerHTML = 
                    `Objeto: <strong>${name}</strong> | Enfocar: <strong>Numpad .</strong> | Orbitar: <strong>Rueda Ratón</strong> | Salir: <strong>Esc</strong>`;
            }
        });

        // B. EVENTOS DE TECLADO (Zoom In y Reset)
        window.addEventListener('keydown', (e) => {
            // Tecla Numpad (.) o el punto normal
            if ((e.code === 'NumpadDecimal' || e.key === '.') && this.selectedEl) {
                this.focusOnObject();
            }
            // Tecla Esc
            if (e.key === 'Escape') {
                this.resetControls();
            }
        });

        // C. EVENTOS DE RATÓN (Orbitar manteniendo presionado el botón central)
        window.addEventListener('mousedown', (e) => {
            // e.button === 1 es el botón de la rueda del ratón
            if (e.button === 1 && this.selectedEl) { 
                e.preventDefault();
                this.orbiting = true;
                this.cameraEl.setAttribute('look-controls', 'enabled', false);
                this.cameraEl.setAttribute('wasd-controls', 'enabled', false);
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.orbiting && this.selectedEl) {
                let deltaX = e.clientX - this.lastMouseX;
                let deltaY = e.clientY - this.lastMouseY;
                this.doOrbit(deltaX, deltaY);
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if(e.button === 1 && this.orbiting) {
                this.orbiting = false;
                this.cameraEl.setAttribute('look-controls', 'enabled', true);
                this.cameraEl.setAttribute('wasd-controls', 'enabled', true);
            }
        });
    },

    focusOnObject: function() {
        let targetPos = new THREE.Vector3();
        this.selectedEl.object3D.getWorldPosition(targetPos);
        
        // Ajustar la distancia del Zoom dependiendo del objeto
        let offsetZ = 0.5;
        let id = this.selectedEl.getAttribute('id');
        if(id === 'hitbox-earth') offsetZ = 0.25;  // Zoom Tierra
        if(id === 'hitbox-moon') offsetZ = 0.08;   // Zoom Luna
        if(id === 'hitbox-orion') offsetZ = 0.03;  // Zoom Nave

        // Mover todo el sistema de cámara (Rig) hacia el objetivo
        let newPos = targetPos.clone().add(new THREE.Vector3(0, 0, offsetZ));
        this.rigEl.object3D.position.copy(newPos);
        
        // Forzar a la cámara a mirar directamente al objetivo
        this.cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
        this.cameraEl.components['look-controls'].yawObject.rotation.y = 0;
        this.rigEl.object3D.lookAt(targetPos);
    },

    doOrbit: function(deltaX, deltaY) {
        let targetPos = new THREE.Vector3();
        this.selectedEl.object3D.getWorldPosition(targetPos);
        
        let rigPos = this.rigEl.object3D.position;
        let offset = rigPos.clone().sub(targetPos);
        
        // Matemática rotacional (Cuaterniones) para orbitar limpio
        offset.applyAxisAngle(new THREE.Vector3(0,1,0), -deltaX * 0.005);
        let right = new THREE.Vector3(1,0,0).applyQuaternion(this.rigEl.object3D.quaternion);
        offset.applyAxisAngle(right, -deltaY * 0.005);

        rigPos.copy(targetPos).add(offset);
        this.rigEl.object3D.lookAt(targetPos);
    },

    resetControls: function() {
        this.orbiting = false;
        this.selectedEl = null;
        this.cameraEl.setAttribute('look-controls', 'enabled', true);
        this.cameraEl.setAttribute('wasd-controls', 'enabled', true);
        document.getElementById('instructions').innerHTML = 
            "VR/PC NAVIGATION: Hold Left Click to aim | <strong>WASD</strong> to move | <strong>Orbit</strong> scroll click | Click en planeta para seleccionar.";
    }
});

// 4. COMPONENTE: PERSISTENCIA DE CÁMARA (SessionStorage)
AFRAME.registerComponent('persist-camera', {
    init: function () {
        this.cameraEl = document.querySelector('#camera');
        
        // Cargar estado al iniciar
        let savedState = sessionStorage.getItem('artemisCameraState');
        if (savedState) {
            let state = JSON.parse(savedState);
            this.el.setAttribute('position', state.pos); // Mover el Rig
            
            // Para rotar la cámara en A-Frame, debemos alterar los objetos Pitch y Yaw de look-controls
            let lookControls = this.cameraEl.components['look-controls'];
            if (lookControls) {
                lookControls.pitchObject.rotation.x = state.rotX;
                lookControls.yawObject.rotation.y = state.rotY;
            }
        }
    },
    tick: function () {
        // Guardar estado de forma continua pero ligera
        let lookControls = this.cameraEl.components['look-controls'];
        if (lookControls) {
            let currentState = {
                pos: this.el.getAttribute('position'),
                rotX: lookControls.pitchObject.rotation.x,
                rotY: lookControls.yawObject.rotation.y
            };
            sessionStorage.setItem('artemisCameraState', JSON.stringify(currentState));
        }
    }
});

// 5. COMPONENTE: NAVEGACIÓN TÁCTIL MÓVIL Y VR
AFRAME.registerComponent('touch-movement', {
    schema: { speed: { default: 0.15 } }, // Velocidad de avance al tocar
    init: function () {
        this.isMoving = false;
        this.cameraEl = document.querySelector('#camera');
        this.direction = new THREE.Vector3();

        // Detectar dedo en pantalla
        window.addEventListener('touchstart', (e) => {
            // Ignorar el toque si el usuario está pulsando un botón de la UI
            if (e.target.closest('#ui-container') || e.target.closest('#instructions')) return;
            this.isMoving = true;
        }, {passive: false});

        // Detener al soltar
        window.addEventListener('touchend', () => {
            this.isMoving = false;
        });
    },
    tick: function (time, delta) {
        if (this.isMoving && this.cameraEl) {
            // Obtener el vector hacia el cual está mirando el celular/gafas VR
            this.cameraEl.object3D.getWorldDirection(this.direction);
            
            // En Three.js, el frente de la cámara es el eje Z negativo (-1)
            this.direction.multiplyScalar(-this.data.speed * (delta / 16));
            
            // Sumar el vector a la posición actual del Rig
            this.el.object3D.position.add(this.direction);
        }
    }
});