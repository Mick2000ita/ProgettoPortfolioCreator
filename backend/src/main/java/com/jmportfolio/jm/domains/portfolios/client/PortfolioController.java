package com.jmportfolio.jm.domains.portfolios.client;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.domains.portfolios.application.PortfolioService;
import com.jmportfolio.jm.domains.portfolios.client.dto.CreatePortfolioRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioAnalyticsDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioPublicDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSlugAvailabilityDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSummaryDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.UpdatePortfolioDescriptionRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.UpdatePortfolioDiscoveryPreferencesRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.UpdatePortfolioTagsRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.UpdatePortfolioVisibilityRequestDto;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/portfolios")
public class PortfolioController {

    @Autowired
    private PortfolioService portfolioService;

    @PostMapping
    public PortfolioPublicDto createPortfolio(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @Valid @RequestBody CreatePortfolioRequestDto request) {
        return portfolioService.createPortfolio(authenticatedUser.getUsername(), request);
    }

    @GetMapping("/me")
    public List<PortfolioSummaryDto> getMyPortfolios(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser) {
        return portfolioService.getUserPortfolios(authenticatedUser.getUsername());
    }

    @GetMapping("/me/analytics")
    public PortfolioAnalyticsDto getMyPortfolioAnalytics(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser) {
        return portfolioService.getUserPortfolioAnalytics(authenticatedUser.getUsername());
    }

    @GetMapping("/slug-availability")
    public PortfolioSlugAvailabilityDto checkSlugAvailability(@RequestParam String slug) {
        return portfolioService.checkSlugAvailability(slug);
    }

    @GetMapping("/{slug}")
    public PortfolioPublicDto getMyPortfolio(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug) {
        return portfolioService.getUserPortfolioBySlug(authenticatedUser.getUsername(), slug);
    }

    @PutMapping("/{slug}")
    public PortfolioPublicDto updatePortfolio(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug,
            @Valid @RequestBody CreatePortfolioRequestDto request) {
        return portfolioService.updatePortfolio(authenticatedUser.getUsername(), slug, request);
    }

    @PutMapping("/{slug}/visibility")
    public PortfolioSummaryDto updatePortfolioVisibility(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug,
            @RequestBody UpdatePortfolioVisibilityRequestDto request) {
        return portfolioService.updatePortfolioVisibility(authenticatedUser.getUsername(), slug,
                request.isPublic());
    }

    @PutMapping("/{slug}/discovery-preferences")
    public PortfolioSummaryDto updatePortfolioDiscoveryPreferences(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug,
            @RequestBody UpdatePortfolioDiscoveryPreferencesRequestDto request) {
        return portfolioService.updatePortfolioDiscoveryPreferences(authenticatedUser.getUsername(),
                slug, request.isShowHomeSnapshot(), request.isShowInExplore());
    }

    @PutMapping("/{slug}/tags")
    public PortfolioSummaryDto updatePortfolioTags(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug,
            @RequestBody UpdatePortfolioTagsRequestDto request) {
        return portfolioService.updatePortfolioTags(authenticatedUser.getUsername(), slug,
                request.getTags());
    }

    @PutMapping("/{slug}/description")
    public PortfolioSummaryDto updatePortfolioDescription(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug,
            @RequestBody UpdatePortfolioDescriptionRequestDto request) {
        return portfolioService.updatePortfolioDescription(authenticatedUser.getUsername(), slug,
                request.getDescription());
    }

    @DeleteMapping("/{slug}")
    public void deletePortfolio(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug) {
        portfolioService.deletePortfolio(authenticatedUser.getUsername(), slug);
    }

    @GetMapping("/public/home-snapshots/list")
    public List<PortfolioPublicDto> getHomeSnapshotPortfolios() {
        return portfolioService.getHomeSnapshotPortfolios();
    }

    @GetMapping("/public/{slug}")
    public PortfolioPublicDto getPublicPortfolio(@PathVariable String slug) {
        return portfolioService.getPublicPortfolioBySlug(slug);
    }

    @PostMapping("/public/{slug}/views")
    public void trackPublicPortfolioView(@PathVariable String slug) {
        portfolioService.trackPublicPortfolioView(slug);
    }
}
