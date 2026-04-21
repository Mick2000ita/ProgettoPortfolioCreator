import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  styleUrls: ['./reactive-bg.scss']
})
export class ReactiveBg implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);

  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private waveIntervalId: number | null = null;
  private isRunning = false;

  hexes: Hex[] = [];
  waves: Wave[] = [];

  hexRadius = 16;
  stroke = 1;
  timeBetweenWaves = 1800;

  ngAfterViewInit() {
    if (!this.isBrowser()) {
      return;
    }

    this.start();
  }

  ngOnDestroy() {
    if (!this.isBrowser()) {
      return;
    }

    this.stop();
  }

  @HostListener('window:resize')
  onResize() {
    if (!this.isRunning) {
      return;
    }

    this.resizeCanvas();
    this.createHexGrid();
  }

  private start() {
    this.stop();
    this.resizeCanvas();
    this.createHexGrid();
    this.spawnWave();
    this.isRunning = true;
    this.waveIntervalId = window.setInterval(() => this.spawnWave(), this.timeBetweenWaves);
    this.animate();
  }

  private stop() {
    this.isRunning = false;

    if (this.waveIntervalId !== null) {
      window.clearInterval(this.waveIntervalId);
      this.waveIntervalId = null;
    }

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private createHexGrid() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      return;
    }

    this.hexes = [];
    this.waves = [];

    const radius = this.hexRadius;
    const hexWidth = Math.sqrt(3) * radius;
    const hexHeight = 2 * radius;
    const verticalStep = 1.5 * radius;

    let row = 0;
    for (let y = radius; y < canvas.height + hexHeight; y += verticalStep) {
      const offsetX = row % 2 === 0 ? 0 : hexWidth / 2;
      for (let x = offsetX; x < canvas.width + hexWidth; x += hexWidth) {
        this.hexes.push({ x, y, ox: x, oy: y });
      }
      row++;
    }
  }

  private spawnWave() {
    const canvas = this.canvasRef.nativeElement;
    this.waves.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0,
      baseStrength: 22,
      age: 0,
      life: 240
    });
  }

  private drawHex(x: number, y: number, radius: number) {
    if (!this.ctx) {
      return;
    }

    this.ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      i === 0 ? this.ctx.moveTo(pointX, pointY) : this.ctx.lineTo(pointX, pointY);
    }

    this.ctx.closePath();
    this.ctx.stroke();
  }

  private animate = () => {
    if (!this.isRunning || !this.ctx) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.waves.forEach((wave) => {
      wave.radius += 1.1;
      wave.age += 1;
    });

    this.waves = this.waves.filter((wave) => wave.age <= wave.life && wave.radius < 800);

    this.ctx.strokeStyle = '#005B41';
    this.ctx.lineWidth = this.stroke;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    for (const hex of this.hexes) {
      let offsetX = 0;
      let offsetY = 0;

      for (const wave of this.waves) {
        const dx = hex.ox - wave.x;
        const dy = hex.oy - wave.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const distanceFromWave = Math.abs(distance - wave.radius);

        if (distanceFromWave < 18 && distance > 0) {
          const growIn = Math.min(1, wave.age / 40);
          const fadeOut = 1 - Math.min(1, wave.age / wave.life);
          const smoothGrow = growIn * growIn * (3 - 2 * growIn);
          const strength = wave.baseStrength * smoothGrow * fadeOut;
          const force = (1 - distanceFromWave / 18) * strength;

          offsetX += (dx / distance) * force;
          offsetY += (dy / distance) * force;
        }
      }

      hex.x += (hex.ox + offsetX - hex.x) * 0.07;
      hex.y += (hex.oy + offsetY - hex.y) * 0.07;
      this.drawHex(hex.x, hex.y, this.hexRadius);
    }

    this.animationFrameId = window.requestAnimationFrame(this.animate);
  };

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}
