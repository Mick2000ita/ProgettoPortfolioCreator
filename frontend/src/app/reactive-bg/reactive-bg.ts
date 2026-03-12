import {
  Component,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';

interface Hex {
  ox: number;
  oy: number;
}

interface Wave {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
}

@Component({
  selector: 'app-reactive-bg',
  templateUrl: './reactive-bg.html',
  styleUrls: ['./reactive-bg.scss'],
})
export class ReactiveBg {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  hexes: Hex[] = [];
  waves: Wave[] = [];

  hexRadius = 16;
  stroke = 0.8;
  timeBetweenWaves = 1800;
  ringWidth = 32;

  @HostListener('window:load')
  onLoad() {
    this.resize();
    this.createHexGrid();
    this.animate();
    setInterval(() => this.spawnWave(), this.timeBetweenWaves);
  }

  @HostListener('window:resize')
  resize() {
    const c = this.canvasRef.nativeElement;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    this.createHexGrid();
  }

  createHexGrid() {
    const c = this.canvasRef.nativeElement;
    this.ctx = c.getContext('2d')!;
    this.hexes = [];

    const r = this.hexRadius;
    const w = Math.sqrt(3) * r;
    const h = 2 * r;
    const vStep = 1.5 * r;

    let row = 0;
    for (let y = r; y < c.height + h; y += vStep) {
      const offsetX = row % 2 === 0 ? 0 : w / 2;
      for (let x = offsetX; x < c.width + w; x += w) {
        this.hexes.push({ ox: x, oy: y });
      }
      row++;
    }
  }

  spawnWave() {
    const c = this.canvasRef.nativeElement;
    this.waves.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      radius: 0,
      age: 0,
      life: 220
    });
  }

  drawHex(x: number, y: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.stroke();
  }

  animate = () => {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);

    this.waves.forEach(w => {
      w.radius += 1.2;
      w.age++;
    });

    this.waves = this.waves.filter(w => w.age <= w.life);

    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    for (const h of this.hexes) {
      let glow = 0;

      for (const w of this.waves) {
        const dx = h.ox - w.x;
        const dy = h.oy - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = Math.abs(dist - w.radius);

        if (diff < this.ringWidth) {
          const fade = 1 - (w.age / w.life);
          const proximity = 1 - diff / this.ringWidth;
          // smooth bell curve: ease-in-out
          const intensity = proximity * proximity * (3 - 2 * proximity) * fade;
          glow = Math.max(glow, intensity);
        }
      }

      // base opacity 0.11, peaks at ~0.85 when wave front passes
      const alpha = 0.11 + glow * 0.74;
      this.ctx.strokeStyle = `rgba(0, 91, 65, ${alpha})`;
      this.ctx.lineWidth = this.stroke + glow * 0.9;
      this.drawHex(h.ox, h.oy, this.hexRadius);
    }

    requestAnimationFrame(this.animate);
  };
}
