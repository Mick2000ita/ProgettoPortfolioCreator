package com.jmportfolio.jm.domains.portfolios.domain.repo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.portfolios.infrastructure.mappers.PortfolioJpaMapper;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioJpaRepo;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

@Component
public class PortfolioRepository {
    @Autowired
    private PortfolioJpaRepo portfolioJpaRepo;

    @Autowired
    private UserJpaRepo userJpaRepo;

    public Portfolio save(Portfolio portfolio) {
        PortfolioJpaEntity entity = PortfolioJpaMapper.modelToEntity(portfolio);
        entity.setUserJpaEntity(userJpaRepo.findById(portfolio.getUser().getId()).orElseThrow(
                () -> new ApplicationException("User not found", "USER_NOT_FOUND")));
        return PortfolioJpaMapper.entityToModel(portfolioJpaRepo.save(entity));
    }

    public boolean existsBySlug(String slug) {
        return portfolioJpaRepo.existsBySlug(slug);
    }

    public List<Portfolio> findAllByUsername(String username) {
        return portfolioJpaRepo.findAllByUserJpaEntityUsernameOrderByCreatedDesc(username).stream()
                .map(PortfolioJpaMapper::entityToModel)
                .toList();
    }

    public Optional<Portfolio> findBySlug(String slug) {
        return portfolioJpaRepo.findBySlug(slug).map(PortfolioJpaMapper::entityToModel);
    }

    public Optional<Portfolio> findBySlugAndUsername(String slug, String username) {
        return portfolioJpaRepo.findBySlugAndUserJpaEntityUsername(slug, username)
                .map(PortfolioJpaMapper::entityToModel);
    }

    public Optional<Portfolio> findPublicBySlug(String slug) {
        return portfolioJpaRepo.findBySlugAndIsPublicTrue(slug)
                .map(PortfolioJpaMapper::entityToModel);
    }

    public List<Portfolio> findHomeSnapshotPortfolios() {
        return portfolioJpaRepo.findTop4ByIsPublicTrueAndShowHomeSnapshotTrueOrderByCreatedDesc()
                .stream()
                .map(PortfolioJpaMapper::entityToModel)
                .toList();
    }

    public Optional<Portfolio> findById(UUID id) {
        return portfolioJpaRepo.findById(id).map(PortfolioJpaMapper::entityToModel);
    }

    public void deleteById(UUID id) {
        portfolioJpaRepo.deleteById(id);
    }
}
