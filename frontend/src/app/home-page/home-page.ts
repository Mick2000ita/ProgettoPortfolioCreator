import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthSessionService } from '../services/auth-session.service';

interface PortfolioShowcase {
  title: string;
  discipline: string;
  owner: string;
  description: string;
  accent: string;
  tags: string[];
  stats: Array<{ label: string; value: string }>;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss'
})
export class HomePage implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authSessionService = inject(AuthSessionService);
  protected readonly portfolios: PortfolioShowcase[] = [
    {
      title: 'Atelier Motion',
      discipline: 'Motion Designer',
      owner: 'Giulia Ferri',
      description:
        'Uno showcase editoriale con reel, frame di storyboard e casi studio pensati per agenzie creative.',
      accent: 'linear-gradient(135deg, #d87f47, #7c2f12)',
      tags: ['Showreel', 'Brand Film', '3D Frames'],
      stats: [
        { label: 'Progetti', value: '18' },
        { label: 'Clienti', value: '9' },
        { label: 'Anno', value: '2026' }
      ]
    },
    {
      title: 'Code and Craft',
      discipline: 'Frontend Engineer',
      owner: 'Marco Rinaldi',
      description:
        'Portfolio tecnico con metriche, component library personale e casi studio sul prodotto digitale.',
      accent: 'linear-gradient(135deg, #0a7a59, #114a54)',
      tags: ['React', 'Design Systems', 'Case Study'],
      stats: [
        { label: 'Deploy', value: '32' },
        { label: 'UI Kit', value: '12' },
        { label: 'Team', value: '5' }
      ]
    },
    {
      title: 'Nordic Frames',
      discipline: 'Photographer',
      owner: 'Elena Sala',
      description:
        'Griglia immersiva con focus su ritratti, travel editorial e landing narrativa per shooting premium.',
      accent: 'linear-gradient(135deg, #5976d6, #1d2855)',
      tags: ['Portrait', 'Travel', 'Editorial'],
      stats: [
        { label: 'Album', value: '24' },
        { label: 'Citta', value: '14' },
        { label: 'Awards', value: '6' }
      ]
    }
  ];

  private cycleIntervalId: number | null = null;
  protected readonly activeIndex = signal(0);
  protected readonly activePortfolio = computed(() => this.portfolios[this.activeIndex()]);
  protected readonly isAuthenticated = this.authSessionService.authenticated;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cycleIntervalId = window.setInterval(() => {
      this.activeIndex.update((currentIndex) => (currentIndex + 1) % this.portfolios.length);
    }, 4200);
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId) && this.cycleIntervalId !== null) {
      window.clearInterval(this.cycleIntervalId);
    }
  }

  protected selectPortfolio(index: number) {
    this.activeIndex.set(index);
  }
}
