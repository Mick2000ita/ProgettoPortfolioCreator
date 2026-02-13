import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit
} from '@angular/core';

interface Hex {
  x: number;
  y: number;
  ox: number;
  oy: number;
}

interface Wave {
  x: number;
  y: number;
  radius: number;
  baseStrength: number;
  age: number;
   life: number;
}

@Component({
  selector: 'app-reactive-bg',
  templateUrl: './reactive-bg.html',
  styleUrls: ['./reactive-bg.scss'],
})
export class ReactiveBg implements AfterViewInit {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  hexes: Hex[] = [];
  waves: Wave[] = [];

  hexRadius = 16;
  stroke = 1;
  timeBetweenWaves = 1800; 
  

  ngAfterViewInit() {
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
        this.hexes.push({ x, y, ox: x, oy: y });
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
    baseStrength: 22,
    age: 0,
    life: 240
  });
}

  drawHex(x: number, y: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6; // rotazione 30° per honeycomb
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
  w.radius += 1.1;
  w.age += 1;
});

// rimuovi onde scadute
this.waves = this.waves.filter(w => w.age <= w.life);

    // rimuovi onde troppo grandi
    this.waves = this.waves.filter(w => w.radius < 800);

    this.ctx.strokeStyle = '#1E7F4D';
    this.ctx.lineWidth = this.stroke;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    for (const h of this.hexes) {
      let offsetX = 0;
      let offsetY = 0;

      for (const w of this.waves) {
        const dx = h.ox - w.x;
        const dy = h.oy - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = Math.abs(dist - w.radius);
        

        if (diff < 18) {
          // smoothstep fade-in
          const t = Math.min(1, w.age / 40);
          const fade = 1 - Math.min(1, w.age / w.life); // decrescita finale
          const smooth = t * t * (3 - 2 * t);
          const strength = w.baseStrength * smooth * fade;         
          const force = (1 - diff / 18) * strength;
          offsetX += (dx / dist) * force;
          offsetY += (dy / dist) * force;
        }
      }

      // interpolazione verso la posizione target
      h.x += (h.ox + offsetX - h.x) * 0.07;
      h.y += (h.oy + offsetY - h.y) * 0.07;

      this.drawHex(h.x, h.y, this.hexRadius);
    }

    requestAnimationFrame(this.animate);
  };
}