import { Component, HostListener, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthApiService } from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import { GoogleLoginComponent } from '../google-login-component/google-login-component';
import { ReactiveBg } from '../reactive-bg/reactive-bg';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    GoogleLoginComponent,
    ReactiveBg,
    CardModule,
    FloatLabelModule,
    InputTextModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  providers: [MessageService]
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly messageService = inject(MessageService);

  protected mode: AuthMode = 'login';
  protected isSubmitting = false;
  protected isSmallScreen = false;

  protected readonly authForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: [''],
    rememberMe: [false]
  });

  @HostListener('window:resize')
  onResize() {
    this.isSmallScreen = this.readIsSmallScreen();
  }

  ngOnInit() {
    this.isSmallScreen = this.readIsSmallScreen();
    this.syncValidatorsWithMode();
  }

  protected get isRegisterMode() {
    return this.mode === 'register';
  }

  protected get submitLabel() {
    return this.isRegisterMode ? 'Crea Account' : 'Login';
  }

  protected get switchLabel() {
    return this.isRegisterMode ? 'Torna al login' : 'Crea un account';
  }

  protected submit() {
    this.messageService.clear('authToast');
    this.syncValidatorsWithMode();
    this.authForm.markAllAsTouched();

    if (this.authForm.invalid) {
      this.showWarning(this.buildValidationMessage());
      return;
    }

    this.isSubmitting = true;

    if (this.isRegisterMode) {
      this.submitRegistration();
      return;
    }

    this.submitLogin();
  }

  protected toggleMode(nextMode?: AuthMode, clearToast = true) {
    this.mode = nextMode ?? (this.isRegisterMode ? 'login' : 'register');
    this.isSubmitting = false;
    if (clearToast) {
      this.messageService.clear('authToast');
    }
    this.syncValidatorsWithMode();

    if (!this.isRegisterMode) {
      this.authForm.patchValue({
        email: '',
        confirmPassword: ''
      });
    }

    this.authForm.markAsPristine();
    this.authForm.markAsUntouched();
  }

  protected showGoogleError(message: string) {
    this.messageService.clear('authToast');
    this.messageService.add({
      key: 'authToast',
      severity: 'error',
      summary: 'Accesso Google fallito',
      detail: message
    });
  }

  private submitLogin() {
    const { username, password, rememberMe } = this.authForm.getRawValue();

    this.authApiService
      .login({
        username: username.trim(),
        password,
        rememberMe
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          this.authSessionService.saveLoginSession(response, { rememberMe });
          void this.router.navigate(['/analytics']);
        },
        error: (error) => {
          const detail = error?.error?.message ?? 'Credenziali non valide o utente non trovato';
          this.showError('Login fallito', detail);
        }
      });
  }

  private submitRegistration() {
    const { username, email, password } = this.authForm.getRawValue();

    this.authApiService
      .register({
        username: username.trim(),
        email: email.trim(),
        password
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.showSuccess(
            'Registrazione completata',
            'Account creato con successo. Ora puoi accedere.'
          );

          this.authForm.patchValue({
            email: '',
            password: '',
            confirmPassword: '',
            rememberMe: false
          });

          this.toggleMode('login', false);
        },
        error: (error) => {
          const detail =
            error?.error?.message ?? 'Non è stato possibile completare la registrazione';
          this.showError('Registrazione fallita', detail);
        }
      });
  }

  private buildValidationMessage() {
    const { username, email, password, confirmPassword } = this.authForm.controls;
    const errors: string[] = [];

    if (username.invalid) {
      errors.push('Inserisci il nome utente');
    }

    if (password.invalid) {
      errors.push('Inserisci la password');
    }

    if (this.isRegisterMode) {
      if (email.hasError('required')) {
        errors.push("Inserisci l'email");
      } else if (email.hasError('email')) {
        errors.push('Email non valida');
      }

      if (confirmPassword.hasError('required')) {
        errors.push('Conferma la password');
      } else if (confirmPassword.hasError('mismatch')) {
        errors.push('Le password non corrispondono');
      }
    }

    return errors.join(', ');
  }

  private syncValidatorsWithMode() {
    const emailControl = this.authForm.controls.email;
    const confirmPasswordControl = this.authForm.controls.confirmPassword;
    const passwordValue = this.authForm.controls.password.value;
    const confirmPasswordValue = confirmPasswordControl.value;

    if (this.isRegisterMode) {
      emailControl.setValidators([Validators.required, Validators.email]);
      confirmPasswordControl.setValidators([Validators.required]);

      if (confirmPasswordValue && confirmPasswordValue !== passwordValue) {
        confirmPasswordControl.setErrors({ mismatch: true });
      } else if (confirmPasswordControl.hasError('mismatch')) {
        confirmPasswordControl.setErrors(null);
      }
    } else {
      emailControl.clearValidators();
      confirmPasswordControl.clearValidators();
      confirmPasswordControl.setErrors(null);
    }

    emailControl.updateValueAndValidity({ emitEvent: false });
    confirmPasswordControl.updateValueAndValidity({ emitEvent: false });
  }

  private showWarning(detail: string) {
    this.messageService.add({
      key: 'authToast',
      severity: 'warn',
      summary: 'Attenzione',
      detail
    });
  }

  private showSuccess(summary: string, detail: string) {
    this.messageService.add({
      key: 'authToast',
      severity: 'success',
      summary,
      detail
    });
  }

  private showError(summary: string, detail: string) {
    this.messageService.add({
      key: 'authToast',
      severity: 'error',
      summary,
      detail
    });
  }

  private readIsSmallScreen() {
    return typeof window !== 'undefined' && window.innerWidth < 920;
  }
}
