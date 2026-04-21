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
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.domains.portfolios.application.PortfolioService;
import com.jmportfolio.jm.domains.portfolios.client.dto.CreatePortfolioRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioPublicDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSummaryDto;

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

    @DeleteMapping("/{slug}")
    public void deletePortfolio(
            @AuthenticationPrincipal ExtendedAuthUser authenticatedUser,
            @PathVariable String slug) {
        portfolioService.deletePortfolio(authenticatedUser.getUsername(), slug);
    }

    @GetMapping("/public/{slug}")
    public PortfolioPublicDto getPublicPortfolio(@PathVariable String slug) {
        return portfolioService.getPublicPortfolioBySlug(slug);
    }
}
