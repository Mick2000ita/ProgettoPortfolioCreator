package com.jmportfolio.jm.domains.portfolios.application;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.portfolios.client.dto.CreatePortfolioRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioPublicDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSummaryDto;
import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.portfolios.domain.repo.PortfolioRepository;
import com.jmportfolio.jm.domains.projects.domain.repo.ProjectRepository;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class PortfolioService {
    private static final List<String> RESERVED_SLUGS =
            List.of("login", "home", "profile", "portfolios", "api");

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public PortfolioPublicDto createPortfolio(String username, CreatePortfolioRequestDto request) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        String title = request.getTitle().trim();
        String slug = generateUniqueSlug(title, null);
        List<Map<String, Object>> modules = normalizeModules(request.getModules());

        Portfolio portfolio = new Portfolio();
        portfolio.setTitle(title);
        portfolio.setSlug(slug);
        portfolio.setPublic(true);
        portfolio.setPublicData(new ArrayList<>(modules));
        portfolio.setWipData(new ArrayList<>(modules));
        portfolio.setUser(user);

        Portfolio savedPortfolio = portfolioRepository.save(portfolio);
        return toPublicDto(savedPortfolio);
    }

    public PortfolioPublicDto getUserPortfolioBySlug(String username, String slug) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));
        return toPublicDto(portfolio);
    }

    public PortfolioPublicDto updatePortfolio(String username, String currentSlug,
            CreatePortfolioRequestDto request) {
        Portfolio existingPortfolio = portfolioRepository.findBySlugAndUsername(currentSlug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        String title = request.getTitle().trim();
        String slug = generateUniqueSlug(title, existingPortfolio.getSlug());
        List<Map<String, Object>> modules = normalizeModules(request.getModules());

        existingPortfolio.setTitle(title);
        existingPortfolio.setSlug(slug);
        existingPortfolio.setPublicData(new ArrayList<>(modules));
        existingPortfolio.setWipData(new ArrayList<>(modules));
        existingPortfolio.setPublic(true);
        existingPortfolio.setUser(user);

        Portfolio savedPortfolio = portfolioRepository.save(existingPortfolio);
        return toPublicDto(savedPortfolio);
    }

    public List<PortfolioSummaryDto> getUserPortfolios(String username) {
        return portfolioRepository.findAllByUsername(username).stream()
                .map(portfolio -> new PortfolioSummaryDto(
                        portfolio.getId(),
                        portfolio.getTitle(),
                        portfolio.getSlug(),
                        portfolio.isPublic()))
                .toList();
    }

    public PortfolioPublicDto getPublicPortfolioBySlug(String slug) {
        Portfolio portfolio = portfolioRepository.findPublicBySlug(slug)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));
        return toPublicDto(portfolio);
    }

    @Transactional
    public void deletePortfolio(String username, String slug) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        projectRepository.deleteAllByPortfolioId(portfolio.getId());
        portfolioRepository.deleteById(portfolio.getId());
    }

    private PortfolioPublicDto toPublicDto(Portfolio portfolio) {
        List<Map<String, Object>> modules = portfolio.getPublicData() == null
                ? List.of()
                : portfolio.getPublicData().stream()
                        .filter(Map.class::isInstance)
                        .map(module -> (Map<String, Object>) module)
                        .toList();

        return new PortfolioPublicDto(
                portfolio.getId(),
                portfolio.getTitle(),
                portfolio.getSlug(),
                portfolio.isPublic(),
                modules);
    }

    private List<Map<String, Object>> normalizeModules(List<Map<String, Object>> modules) {
        if (modules == null) {
            return List.of();
        }

        return modules.stream()
                .filter(module -> module.get("type") != null)
                .toList();
    }

    private String generateUniqueSlug(String title, String currentSlug) {
        String baseSlug = slugify(title);
        if (baseSlug.isBlank()) {
            throw new ApplicationException("Invalid portfolio title", "INVALID_PORTFOLIO_TITLE");
        }

        if (RESERVED_SLUGS.contains(baseSlug)) {
            baseSlug = baseSlug + "-portfolio";
        }

        if (baseSlug.equals(currentSlug)) {
            return currentSlug;
        }

        String candidate = baseSlug;
        int suffix = 2;
        while ((!candidate.equals(currentSlug) && portfolioRepository.existsBySlug(candidate))
                || RESERVED_SLUGS.contains(candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "");
    }
}
