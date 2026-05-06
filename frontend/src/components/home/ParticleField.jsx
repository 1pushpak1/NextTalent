import { useEffect, useRef } from 'react';

const GOLD = '200, 169, 107';
const WHITE = '255, 255, 255';

function createParticles(width, height) {
  const area = width * height;
  const targetCount = Math.max(130, Math.min(280, Math.round(area / 9500)));

  return Array.from({ length: targetCount }, (_, index) => ({
    x: Math.random() * width,
    y: (Math.random() < 0.58 ? 1 - Math.pow(Math.random(), 1.8) : Math.random()) * height,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55,
    size: 1 + Math.random() * 2.1,
    color: index % 5 === 0 ? WHITE : GOLD,
  }));
}

export default function ParticleField({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = {
      x: 0,
      y: 0,
      active: false,
    };

    const resize = () => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (!nextWidth || !nextHeight) return;

      width = nextWidth;
      height = nextHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(nextWidth, nextHeight);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 100 && distance > 0) {
            const force = (100 - distance) / 780;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        }

        const speed = Math.hypot(particle.vx, particle.vy);
        if (speed < 0.12) {
          particle.vx += (Math.random() - 0.5) * 0.08;
          particle.vy += (Math.random() - 0.5) * 0.08;
        }

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, 0.95)`;
        context.shadowBlur = 18;
        context.shadowColor = `rgba(${particle.color}, 0.48)`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.shadowBlur = 0;

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 170) {
            const opacity = (1 - distance / 170) * 0.36;
            context.beginPath();
            context.strokeStyle = `rgba(${GOLD}, ${opacity})`;
            context.lineWidth = 1;
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      if (!mediaQuery.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handleReducedMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      draw();
    };

    resize();
    draw();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    mediaQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      mediaQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
