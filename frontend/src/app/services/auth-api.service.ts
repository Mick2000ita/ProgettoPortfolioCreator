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

export interface UpdateUserProfileRequestDto {
  email?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdatePortfolioTagsRequestDto {
  tags: string[];
}

export interface UserPortfolioSummaryDto {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  public: boolean;
  showHomeSnapshot?: boolean;
  showInExplore?: boolean;
}

export interface PortfolioViewSummaryDto extends UserPortfolioSummaryDto {
  totalViews: number;
  monthlyViews: number;
}

export interface PortfolioMonthlyViewsDto {
  month: string;
  label: string;
  views: number;
}

export interface PortfolioAnalyticsDto {
  totalViews: number;
  monthlyViews: number;
  previousMonthViews: number;
  monthlyTrend: PortfolioMonthlyViewsDto[];
  portfolioViews: PortfolioViewSummaryDto[];
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
  tableBorderWidth?: number;
  tableBorderColor?: string;
  tableCellBackgroundColor?: string;
  tableHeaderBackgroundColor?: string;
}

export interface PortfolioBackgroundImageDto {
  src: string;
  values?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  scaleX?: number;
  scaleY?: number;
  blur?: number;
}

export interface PortfolioModuleDto {
  type: string;
  label: string;
  value?: string;
  values?: string[];
  subtitle?: string;
  language?: string;
  buttonLabel?: string;
  url?: string;
  fileName?: string;
  fileData?: string;
  slotId?: string;
  templateId?: string;
  helperText?: string;
  locked?: boolean;
  textStyle?: PortfolioTextStyleDto;
  backgroundImages?: PortfolioBackgroundImageDto[];
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
  slug?: string;
  tags?: string[];
  modules: PortfolioModuleDto[];
  showHomeSnapshot?: boolean;
  showInExplore?: boolean;
  public?: boolean;
}

export interface PortfolioSlugAvailabilityDto {
  slug: string;
  available: boolean;
}

export interface PortfolioPublicDto {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  public: boolean;
  showHomeSnapshot?: boolean;
  showInExplore?: boolean;
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

  updateCurrentUserProfile(payload: UpdateUserProfileRequestDto): Observable<UserProfileDto> {
    return this.http.put<UserProfileDto>(`${this.apiUrl}/api/user/me`, payload);
  }

  getMyPortfolios(): Observable<UserPortfolioSummaryDto[]> {
    return this.http.get<UserPortfolioSummaryDto[]>(`${this.apiUrl}/api/portfolios/me`);
  }

  getMyPortfolioAnalytics(): Observable<PortfolioAnalyticsDto> {
    return this.http.get<PortfolioAnalyticsDto>(`${this.apiUrl}/api/portfolios/me/analytics`);
  }

  getMyPortfolio(slug: string): Observable<PortfolioPublicDto> {
    return this.http.get<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/${slug}`);
  }

  createPortfolio(payload: CreatePortfolioRequestDto): Observable<PortfolioPublicDto> {
    return this.http.post<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios`, payload);
  }

  checkPortfolioSlug(slug: string): Observable<PortfolioSlugAvailabilityDto> {
    return this.http.get<PortfolioSlugAvailabilityDto>(
      `${this.apiUrl}/api/portfolios/slug-availability`,
      {
        params: { slug },
      },
    );
  }

  updatePortfolio(
    slug: string,
    payload: CreatePortfolioRequestDto,
  ): Observable<PortfolioPublicDto> {
    return this.http.put<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/${slug}`, payload);
  }

  updatePortfolioVisibility(slug: string, isPublic: boolean): Observable<UserPortfolioSummaryDto> {
    return this.http.put<UserPortfolioSummaryDto>(
      `${this.apiUrl}/api/portfolios/${slug}/visibility`,
      {
        public: isPublic,
      },
    );
  }

  updatePortfolioTags(
    slug: string,
    payload: UpdatePortfolioTagsRequestDto,
  ): Observable<UserPortfolioSummaryDto> {
    return this.http.put<UserPortfolioSummaryDto>(
      `${this.apiUrl}/api/portfolios/${slug}/tags`,
      payload,
    );
  }

  deletePortfolio(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/portfolios/${slug}`);
  }

  getPublicPortfolio(slug: string): Observable<PortfolioPublicDto> {
    return this.http.get<PortfolioPublicDto>(`${this.apiUrl}/api/portfolios/public/${slug}`);
  }

  recordPublicPortfolioView(slug: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/portfolios/public/${slug}/views`, {});
  }
}
