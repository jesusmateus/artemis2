/**
 * SISTEMA DE INVALIDACIÓN DE CACHÉ Y AUTO-RECARGA
 * Verifica actualizaciones del repositorio en GitHub Pages.
 */
const APP_VERSION = "1.0.1"; // DEBES ACTUALIZAR ESTO MANUALMENTE AQUÍ Y EN version.json

// Ejecutar una comprobación asíncrona cada 60,000 milisegundos (1 minuto)
setInterval(async () => {
    try {
        // Date.now() rompe la caché de la CDN de Fastly (GitHub Pages)
        const response = await fetch(`version.json?t=${Date.now()}`, {
            cache: 'no-store'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Si la versión en el servidor de GitHub es distinta a la de esta sesión local:
            if (data.version !== APP_VERSION) {
                console.warn(`[UPDATE] Nueva versión detectada: ${data.version}. Forzando purga de caché...`);
                // location.reload(true) fuerza al navegador a ignorar la caché local y descargar todo de nuevo
                window.location.reload(true);
            }
        }
    } catch (error) {
        // Fallo silencioso: Si el usuario pierde internet, no interrumpimos la experiencia 3D.
    }
}, 60000);