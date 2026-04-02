/**
 * COMPONENTE ÓPTICO PROCEDIMENTAL (Lens Flare & Bloom)
 * Simula la dispersión de la luz en la lente de una cámara espacial.
 */
AFRAME.registerComponent('solar-flare', {
    init: function () {
        // 1. GENERADOR PROCEDIMENTAL DE TEXTURAS EN MEMORIA (Sin descargas)
        
        // Función interna para crear un gradiente de luz esférica (Bloom)
        const createGlowTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Centro blanco brillante
            gradient.addColorStop(0.1, 'rgba(255, 245, 200, 0.8)'); // Amarillo intenso
            gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.2)'); // Naranja difuso
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Desvanecimiento
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(canvas);
        };

        // Función interna para crear los rayos / destellos de estrella (Flare)
        const createStarFlareTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const cx = 256, cy = 256;

            // Dibujar cruz de destello (Astigmatismo de lente)
            ctx.beginPath();
            ctx.moveTo(cx, 0); ctx.lineTo(cx, 512); // Línea vertical
            ctx.moveTo(0, cy); ctx.lineTo(512, cy); // Línea horizontal
            // Rayos diagonales
            ctx.moveTo(75, 75); ctx.lineTo(437, 437);
            ctx.moveTo(437, 75); ctx.lineTo(75, 437);
            
            ctx.lineWidth = 4;
            // Sombras para crear efecto de brillo
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(255, 220, 100, 1)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.stroke();

            return new THREE.CanvasTexture(canvas);
        };

        // 2. CONSTRUCCIÓN DE MATERIALES ÓPTICOS DE THREE.JS
        // El Blending Aditivo asegura que la luz se sume al fondo estrellado.
        
        const glowMaterial = new THREE.SpriteMaterial({
            map: createGlowTexture(),
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false // Evita fallos de orden de renderizado (Z-fighting)
        });

        const starMaterial = new THREE.SpriteMaterial({
            map: createStarFlareTexture(),
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        // 3. ENSAMBLAJE EN EL ESPACIO
        this.glowSprite = new THREE.Sprite(glowMaterial);
        this.glowSprite.scale.set(60, 60, 1); // Escala del Bloom

        this.flareSprite = new THREE.Sprite(starMaterial);
        this.flareSprite.scale.set(12, 12, 1); // Escala de los destellos largos

        // Añadir a la entidad Sol
        this.el.object3D.add(this.glowSprite);
        this.el.object3D.add(this.flareSprite);
    },
    
    // Rotar lentamente el destello en cada frame para simular efecto óptico cinemático
    tick: function(time, timeDelta) {
        if(this.flareSprite) {
            // El material del sprite tiene una propiedad de rotación
            this.flareSprite.material.rotation += 0.00006 * timeDelta;
        }
    }
});