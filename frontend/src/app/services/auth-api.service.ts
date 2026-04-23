import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginUserDto {
  email?: string | null;
  username: string;
  avatarUrl?: string | null;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: LoginUserDto;
}

export interface LoginRequestDto {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface GoogleLoginRequestDto {
  token: string;
  rememberMe: boolean;
}

export interface RegisterRequestDto {
  username: string;
  email: string;
  password: string;
}

export interface UserPortfolioSummaryDto {
  id: string;
  title: string;
  slug: string;
  public: boolean;
}

export type PortfolioTextAlign = 'left' | 'center' | 'right';
export type PortfolioTextVerticalAlign = 'start' | 'center' | 'end';

export interface PortfolioTextStyleDto {
  fontSize?: number;
  textColor?: string;
  textAlign?: PortfolioTextAlign;
  verticalAlign?: PortfolioTextVerticalAlign;
  bold?: boolean;
  italic?: boolean;
}

export interface PortfolioModuleDto {
  type: string;
  label: string;
  value?: string;
  values?: string[];
  subtitle?: string;
  buttonLabel?: string;
  url?: string;
  fileName?: string;
  fileData?: string;
  slotId?: string;
  templateId?: string;
  helperText?: string;
  locked?: boolean;
  textStyle?: PortfolioTextStyleDto;
  layout?: {
    columnStart?: number;
    rowStart?: number;
    columnSpan?: number;
    rowSpan?: number;
  };
  children?: PortfolioModuleDto[];
}

export interface CreatePortfolioRequestDto {
  title: string;
  modules: PortfolioModuleDto[];
}

export interface PortfolioPublicDto {
  id: string;
  title: string;
  slug: string;
  public: boolean;
  modules: PortfolioModuleDto[];
}

export interface UserProfileDto {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  roleCode: string;
  roleDescription: string;
  portfolio?: UserPortfolioSummaryDto | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  login(payload: LoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${this.apiUrl}/api/auth/login`, payload);
  }

  register(payload: RegisterRequestDto): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/user/register`, payload);
  }

  refreshSession(refreshToken: string): Observable<LoginResponseDto> {
    return this.http.get<LoginResponseDto>(`${this.apiUrl}/api/auth/refresh`, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });
  }

  loginWithGoogle(payload: GoogleLoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${this.apiUrl}/api/auth/google`, payload);
  }

  getCurrentUserProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.apiUrl}/api/user/me`);
  }

  getMyPortfolios(): Observable<UserPortfolioSummaryDto[]> {
    return this.http.get<UserPortfolioSummaryDto[]>(`${this.apiUrl}/api/portfolios/me`);
  }

  getMyPortfolio(slug: string): Observable<PortfolioPublicDto> {
    return this.http.get<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/${slug}`);
  }

  createPortfolio(payload: CreatePortfolioRequestDto): Observable<PortfolioPublicDto> {
    return this.http.post<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios`, payload);
  }

  updatePortfolio(
    slug: string,
    payload: CreatePortfolioRequestDto,
  ): Observable<PortfolioPublicDto> {
    return this.http.put<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/${slug}`, payload);
  }

  deletePortfolio(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/portfolios/${slug}`);
  }

  getPublicPortfolio(slug: string): Observable<PortfolioPublicDto> {
    return this.http.get<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/public/${slug}`);
  }
}
