package com.jmportfolio.jm.domains.portfolios.application;

import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.portfolios.client.dto.CreatePortfolioRequestDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioAnalyticsDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioMonthlyViewsDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioPublicDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSlugAvailabilityDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioSummaryDto;
import com.jmportfolio.jm.domains.portfolios.client.dto.PortfolioViewSummaryDto;
import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.portfolios.domain.repo.PortfolioRepository;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioViewJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioJpaRepo;
import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioViewJpaRepo;
import com.jmportfolio.jm.domains.projects.domain.repo.ProjectRepository;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class PortfolioService {
    private static final List<String> RESERVED_SLUGS =
            List.of("login", "home", "profile", "portfolios", "api");
    private static final int DESCRIPTION_LIMIT = 180;

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private PortfolioJpaRepo portfolioJpaRepo;

    @Autowired
    private PortfolioViewJpaRepo portfolioViewJpaRepo;

    public PortfolioPublicDto createPortfolio(String username, CreatePortfolioRequestDto request) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        String title = request.getTitle().trim();
        String slug = validateRequestedSlug(request.getSlug(), null);
        List<String> tags = normalizeTags(request.getTags());
        List<Map<String, Object>> modules = normalizeModules(request.getModules());

        Portfolio portfolio = new Portfolio();
        portfolio.setTitle(title);
        portfolio.setSlug(slug);
        portfolio.setDescription(normalizeDescription(request.getDescription()));
        portfolio.setTags(tags);
        portfolio.setShowHomeSnapshot(resolvePreference(request.getShowHomeSnapshot(), true));
        portfolio.setShowInExplore(resolvePreference(request.getShowInExplore(), false));
        portfolio.setPublic(resolvePreference(request.getIsPublic(), true));
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
        String slug = hasText(request.getSlug())
                ? validateRequestedSlug(request.getSlug(), existingPortfolio.getSlug())
                : generateUniqueSlug(title, existingPortfolio.getSlug());
        List<String> tags = request.getTags() == null
                ? safeTags(existingPortfolio.getTags())
                : normalizeTags(request.getTags());
        List<Map<String, Object>> modules = normalizeModules(request.getModules());

        existingPortfolio.setTitle(title);
        existingPortfolio.setSlug(slug);
        if (request.getDescription() != null) {
            existingPortfolio.setDescription(normalizeDescription(request.getDescription()));
        }
        existingPortfolio.setTags(tags);
        existingPortfolio.setPublicData(new ArrayList<>(modules));
        existingPortfolio.setWipData(new ArrayList<>(modules));
        existingPortfolio.setShowHomeSnapshot(
                resolvePreference(request.getShowHomeSnapshot(),
                        existingPortfolio.isShowHomeSnapshot()));
        existingPortfolio.setShowInExplore(
                resolvePreference(request.getShowInExplore(), existingPortfolio.isShowInExplore()));
        existingPortfolio.setPublic(resolvePreference(request.getIsPublic(), existingPortfolio.isPublic()));
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
                        portfolio.getDescription(),
                        safeTags(portfolio.getTags()),
                        portfolio.isPublic(),
                        portfolio.isShowHomeSnapshot(),
                        portfolio.isShowInExplore()))
                .toList();
    }

    public PortfolioAnalyticsDto getUserPortfolioAnalytics(String username) {
        LocalDate currentMonthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
        LocalDate previousMonthStart = currentMonthStart.minusMonths(1);
        LocalDate trendStart = currentMonthStart.minusMonths(5);

        Timestamp currentMonthTimestamp = toTimestamp(currentMonthStart);
        Timestamp previousMonthTimestamp = toTimestamp(previousMonthStart);
        Timestamp trendStartTimestamp = toTimestamp(trendStart);

        long totalViews = portfolioViewJpaRepo.countByPortfolio_UserJpaEntity_Username(username);
        long monthlyViews = portfolioViewJpaRepo
                .countByPortfolio_UserJpaEntity_UsernameAndCreatedGreaterThanEqual(username,
                        currentMonthTimestamp);
        long previousMonthViews = portfolioViewJpaRepo
                .countByPortfolio_UserJpaEntity_UsernameAndCreatedGreaterThanEqualAndCreatedLessThan(
                        username,
                        previousMonthTimestamp,
                        currentMonthTimestamp);

        Map<UUID, Long> totalViewsByPortfolio = toPortfolioCountMap(
                portfolioViewJpaRepo.countViewsByPortfolio(username));
        Map<UUID, Long> monthlyViewsByPortfolio = toPortfolioCountMap(
                portfolioViewJpaRepo.countViewsByPortfolioFrom(username, currentMonthTimestamp));
        Map<String, Long> viewsByMonth = portfolioViewJpaRepo
                .countViewsByMonthFrom(username, trendStartTimestamp).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue()));

        List<PortfolioMonthlyViewsDto> monthlyTrend = new ArrayList<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM", Locale.ITALIAN);
        for (int i = 0; i < 6; i++) {
            LocalDate month = trendStart.plusMonths(i);
            String monthKey = month.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            String label = month.format(monthFormatter);
            monthlyTrend.add(new PortfolioMonthlyViewsDto(
                    monthKey,
                    label,
                    viewsByMonth.getOrDefault(monthKey, 0L)));
        }

        List<PortfolioViewSummaryDto> portfolioViews = portfolioJpaRepo
                .findAllByUserJpaEntityUsernameOrderByCreatedDesc(username).stream()
                .map(portfolio -> new PortfolioViewSummaryDto(
                        portfolio.getId(),
                        portfolio.getTitle(),
                        portfolio.getSlug(),
                        portfolio.getDescription(),
                        safeTags(portfolio.getTags()),
                        portfolio.isPublic(),
                        portfolio.isShowHomeSnapshot(),
                        portfolio.isShowInExplore(),
                        totalViewsByPortfolio.getOrDefault(portfolio.getId(), 0L),
                        monthlyViewsByPortfolio.getOrDefault(portfolio.getId(), 0L)))
                .toList();

        return new PortfolioAnalyticsDto(
                totalViews,
                monthlyViews,
                previousMonthViews,
                monthlyTrend,
                portfolioViews);
    }

    public PortfolioSlugAvailabilityDto checkSlugAvailability(String requestedSlug) {
        String slug = normalizeSlug(requestedSlug);
        boolean available = hasText(slug)
                && !RESERVED_SLUGS.contains(slug)
                && !portfolioRepository.existsBySlug(slug);

        return new PortfolioSlugAvailabilityDto(slug, available);
    }

    public PortfolioPublicDto getPublicPortfolioBySlug(String slug) {
        Portfolio portfolio = portfolioRepository.findPublicBySlug(slug)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));
        return toPublicDto(portfolio);
    }

    public List<PortfolioPublicDto> getHomeSnapshotPortfolios() {
        return portfolioRepository.findHomeSnapshotPortfolios().stream()
                .map(this::toPublicDto)
                .toList();
    }

    public void trackPublicPortfolioView(String slug) {
        Portfolio portfolio = portfolioRepository.findPublicBySlug(slug)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));
        trackPortfolioView(portfolio.getId());
    }

    public PortfolioSummaryDto updatePortfolioVisibility(String username, String slug, boolean isPublic) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        portfolio.setPublic(isPublic);
        portfolio.setUser(user);
        Portfolio savedPortfolio = portfolioRepository.save(portfolio);

        return new PortfolioSummaryDto(
                savedPortfolio.getId(),
                savedPortfolio.getTitle(),
                savedPortfolio.getSlug(),
                savedPortfolio.getDescription(),
                safeTags(savedPortfolio.getTags()),
                savedPortfolio.isPublic(),
                savedPortfolio.isShowHomeSnapshot(),
                savedPortfolio.isShowInExplore());
    }

    public PortfolioSummaryDto updatePortfolioDiscoveryPreferences(String username, String slug,
            boolean showHomeSnapshot, boolean showInExplore) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        portfolio.setShowHomeSnapshot(showHomeSnapshot);
        portfolio.setShowInExplore(showInExplore);
        portfolio.setUser(user);
        Portfolio savedPortfolio = portfolioRepository.save(portfolio);

        return new PortfolioSummaryDto(
                savedPortfolio.getId(),
                savedPortfolio.getTitle(),
                savedPortfolio.getSlug(),
                savedPortfolio.getDescription(),
                safeTags(savedPortfolio.getTags()),
                savedPortfolio.isPublic(),
                savedPortfolio.isShowHomeSnapshot(),
                savedPortfolio.isShowInExplore());
    }

    public PortfolioSummaryDto updatePortfolioTags(String username, String slug, List<String> tags) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        portfolio.setTags(normalizeTags(tags));
        portfolio.setUser(user);
        Portfolio savedPortfolio = portfolioRepository.save(portfolio);

        return new PortfolioSummaryDto(
                savedPortfolio.getId(),
                savedPortfolio.getTitle(),
                savedPortfolio.getSlug(),
                savedPortfolio.getDescription(),
                safeTags(savedPortfolio.getTags()),
                savedPortfolio.isPublic(),
                savedPortfolio.isShowHomeSnapshot(),
                savedPortfolio.isShowInExplore());
    }

    public PortfolioSummaryDto updatePortfolioDescription(String username, String slug, String description) {
        Portfolio portfolio = portfolioRepository.findBySlugAndUsername(slug, username)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new ApplicationException("User not found", "USER_NOT_FOUND");
        }

        portfolio.setDescription(normalizeDescription(description));
        portfolio.setUser(user);
        Portfolio savedPortfolio = portfolioRepository.save(portfolio);

        return new PortfolioSummaryDto(
                savedPortfolio.getId(),
                savedPortfolio.getTitle(),
                savedPortfolio.getSlug(),
                savedPortfolio.getDescription(),
                safeTags(savedPortfolio.getTags()),
                savedPortfolio.isPublic(),
                savedPortfolio.isShowHomeSnapshot(),
                savedPortfolio.isShowInExplore());
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
                portfolio.getDescription(),
                safeTags(portfolio.getTags()),
                portfolio.isPublic(),
                portfolio.isShowHomeSnapshot(),
                portfolio.isShowInExplore(),
                modules);
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }

        return tags.stream()
                .filter(this::hasText)
                .map(String::trim)
                .distinct()
                .limit(12)
                .toList();
    }

    private List<String> safeTags(List<String> tags) {
        return tags == null ? List.of() : tags;
    }

    private String normalizeDescription(String description) {
        if (!hasText(description)) {
            return null;
        }

        String compactDescription = description.trim().replaceAll("\\s+", " ");
        return compactDescription.length() > DESCRIPTION_LIMIT
                ? compactDescription.substring(0, DESCRIPTION_LIMIT).trim()
                : compactDescription;
    }

    private List<Map<String, Object>> normalizeModules(List<Map<String, Object>> modules) {
        if (modules == null) {
            return List.of();
        }

        return modules.stream()
                .filter(module -> module.get("type") != null)
                .toList();
    }

    private boolean resolvePreference(Boolean requestedPreference, boolean currentPreference) {
        if (requestedPreference == null) {
            return currentPreference;
        }

        return requestedPreference;
    }

    private void trackPortfolioView(UUID portfolioId) {
        PortfolioJpaEntity portfolio = portfolioJpaRepo.findById(portfolioId)
                .orElseThrow(() -> new ApplicationException("Portfolio not found",
                        "PORTFOLIO_NOT_FOUND"));

        PortfolioViewJpaEntity view = new PortfolioViewJpaEntity();
        view.setPortfolio(portfolio);
        portfolioViewJpaRepo.save(view);
    }

    private Timestamp toTimestamp(LocalDate date) {
        return Timestamp.from(date.atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private Map<UUID, Long> toPortfolioCountMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()));
    }

    private String validateRequestedSlug(String requestedSlug, String currentSlug) {
        String slug = normalizeSlug(requestedSlug);
        if (!hasText(slug)) {
            throw new ApplicationException("Lo slug del portfolio e obbligatorio",
                    "PORTFOLIO_SLUG_REQUIRED", HttpStatus.BAD_REQUEST);
        }

        if (RESERVED_SLUGS.contains(slug)) {
            throw new ApplicationException("Questo slug e riservato",
                    "PORTFOLIO_SLUG_RESERVED", HttpStatus.BAD_REQUEST);
        }

        if (!slug.equals(currentSlug) && portfolioRepository.existsBySlug(slug)) {
            throw new ApplicationException("Esiste gia un portfolio con questo slug",
                    "PORTFOLIO_SLUG_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        return slug;
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

    private String normalizeSlug(String input) {
        return slugify(input == null ? "" : input);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
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
