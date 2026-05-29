/**
 * Utilidad premium de confeti para animaciones de celebración.
 * Genera una explosión física de partículas desde las esquinas inferiores de la pantalla.
 */

class ConfettiParticle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = Math.random() * 8 + 6;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 15;
        this.opacity = 1;
        this.gravity = 0.22;
        this.drag = 0.975;
        // Forma aleatoria: 0 = cuadrado, 1 = círculo, 2 = triángulo
        this.shape = Math.floor(Math.random() * 3);
    }

    update() {
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        // Empezar a desvanecer cuando caen
        if (this.vy > 1) {
            this.opacity -= 0.008;
        }
    }

    draw(ctx) {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        if (this.shape === 0) {
            // Cuadrado
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.shape === 1) {
            // Círculo
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Triángulo
            ctx.moveTo(0, -this.size / 2);
            ctx.lineTo(this.size / 2, this.size / 2);
            ctx.lineTo(-this.size / 2, this.size / 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

export const triggerConfetti = () => {
    // Si ya existe un canvas activo de confeti, no duplicarlo
    if (document.getElementById('visor-confetti-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'visor-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
        '#3b82f6', // Azul
        '#10b981', // Esmeralda
        '#f59e0b', // Ámbar
        '#ef4444', // Rojo
        '#8b5cf6', // Violeta
        '#ec4899', // Rosa
        '#06b6d4', // Cian
        '#f43f5e', // Rosa fuerte
        '#10b981'  // Verde
    ];

    const particles = [];

    // Generar partículas desde la esquina inferior izquierda (cañón izquierdo)
    const generateLeftCannon = () => {
        const count = 75;
        for (let i = 0; i < count; i++) {
            // Ángulo hacia arriba y a la derecha (entre -35 y -75 grados aprox)
            const angle = (-45 - Math.random() * 35) * Math.PI / 180;
            const velocity = Math.random() * 12 + 10;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push(new ConfettiParticle(0, height, vx, vy, color));
        }
    };

    // Generar partículas desde la esquina inferior derecha (cañón derecho)
    const generateRightCannon = () => {
        const count = 75;
        for (let i = 0; i < count; i++) {
            // Ángulo hacia arriba y a la izquierda (entre -105 y -145 grados aprox)
            const angle = (-135 + Math.random() * 35) * Math.PI / 180;
            const velocity = Math.random() * 12 + 10;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push(new ConfettiParticle(width, height, vx, vy, color));
        }
    };

    // Disparar ambos cañones
    generateLeftCannon();
    generateRightCannon();

    let animationFrameId;

    const animate = () => {
        // Si no quedan partículas con opacidad positiva, terminar
        if (particles.length > 0 && particles.every(p => p.opacity <= 0)) {
            cleanup();
            return;
        }

        ctx.clearRect(0, 0, width, height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update();
            p.draw(ctx);

            // Eliminar partículas invisibles o fuera de la pantalla
            if (p.opacity <= 0 || p.y > height + 20) {
                particles.splice(i, 1);
            }
        }

        if (particles.length === 0) {
            cleanup();
            return;
        }

        animationFrameId = requestAnimationFrame(animate);
    };

    const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        cancelAnimationFrame(animationFrameId);
    };

    animate();
};

// Exponer en window para pruebas sencillas desde la consola
if (typeof window !== 'undefined') {
    window.triggerConfetti = triggerConfetti;
}
