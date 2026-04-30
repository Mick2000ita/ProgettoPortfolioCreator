import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AuthApiService,
  UpdateUserProfileRequestDto,
  UserProfileDto,
} from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage implements OnInit {
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authApiService = inject(AuthApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly user = this.authSessionService.user;
  protected readonly isGoogleSession = this.authSessionService.isGoogleSession;
  protected readonly profile = signal<UserProfileDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly avatarInitial = computed(() => {
    const username = this.profile()?.username ?? this.user()?.username ?? 'Utente';
    return username.charAt(0).toUpperCase();
  });

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    avatarUrl: [''],
    currentPassword: [''],
    newPassword: ['', [Validators.minLength(8)]],
  });

  ngOnInit() {
    this.syncGoogleLockedFields();
    this.loadProfile();
  }

  protected saveProfile() {
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formValue = this.profileForm.getRawValue();
    const payload: UpdateUserProfileRequestDto = {
      avatarUrl: formValue.avatarUrl,
    };

    if (!this.isGoogleSession()) {
      payload.email = formValue.email.trim();

      if (formValue.newPassword.trim()) {
        payload.currentPassword = formValue.currentPassword;
        payload.newPassword = formValue.newPassword;
      }
    }

    this.saving.set(true);

    this.authApiService.updateCurrentUserProfile(payload).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.avatarPreview.set(profile.avatarUrl ?? null);
        this.profileForm.patchValue({
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? '',
          currentPassword: '',
          newPassword: '',
        });
        this.authSessionService.updateSessionUser({
          email: profile.email,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        });
        this.statusMessage.set('Profilo aggiornato.');
        this.saving.set(false);
      },
      error: () => {
        this.errorMessage.set('Non sono riuscito ad aggiornare il profilo.');
        this.saving.set(false);
      },
    });
  }

  protected onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Seleziona un file immagine valido.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set("L'immagine deve pesare meno di 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.errorMessage.set('Non sono riuscito a leggere questa immagine.');
        return;
      }

      this.avatarPreview.set(reader.result);
      this.profileForm.controls.avatarUrl.setValue(reader.result);
      this.profileForm.controls.avatarUrl.markAsDirty();
      this.saveAvatar(reader.result);
    };
    reader.onerror = () => {
      this.errorMessage.set('Non sono riuscito a leggere questa immagine.');
    };
    reader.readAsDataURL(file);
  }

  protected removeAvatar() {
    this.avatarPreview.set(null);
    this.profileForm.controls.avatarUrl.setValue('');
    this.profileForm.controls.avatarUrl.markAsDirty();
    this.saveAvatar('');
  }

  private loadProfile() {
    this.loading.set(true);

    this.authApiService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.avatarPreview.set(profile.avatarUrl ?? null);
        this.profileForm.patchValue({
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? '',
          currentPassword: '',
          newPassword: '',
        });
        this.authSessionService.updateSessionUser({
          email: profile.email,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        });
        this.syncGoogleLockedFields();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Non sono riuscito a caricare il profilo.');
        this.loading.set(false);
      },
    });
  }

  private syncGoogleLockedFields() {
    const lockedControls = [
      this.profileForm.controls.email,
      this.profileForm.controls.currentPassword,
      this.profileForm.controls.newPassword,
    ];

    if (this.isGoogleSession()) {
      lockedControls.forEach((control) => control.disable({ emitEvent: false }));
      return;
    }

    lockedControls.forEach((control) => control.enable({ emitEvent: false }));
  }

  private saveAvatar(avatarUrl: string) {
    const previousAvatarUrl = this.profile()?.avatarUrl ?? null;

    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.saving.set(true);

    this.authApiService.updateCurrentUserProfile({ avatarUrl }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.avatarPreview.set(profile.avatarUrl ?? null);
        this.profileForm.controls.avatarUrl.setValue(profile.avatarUrl ?? '');
        this.authSessionService.updateSessionUser({
          email: profile.email,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        });
        this.statusMessage.set('Immagine profilo aggiornata.');
        this.saving.set(false);
      },
      error: () => {
        this.avatarPreview.set(previousAvatarUrl);
        this.profileForm.controls.avatarUrl.setValue(previousAvatarUrl ?? '');
        this.errorMessage.set("Non sono riuscito ad aggiornare l'immagine profilo.");
        this.saving.set(false);
      },
    });
  }
}
