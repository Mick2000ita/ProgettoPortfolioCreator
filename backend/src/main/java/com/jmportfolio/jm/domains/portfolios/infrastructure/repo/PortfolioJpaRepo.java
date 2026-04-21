package com.jmportfolio.jm.domains.portfolios.infrastructure.repo;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;

public interface PortfolioJpaRepo extends BaseRepository<PortfolioJpaEntity, UUID>{
    
    @EntityGraph(attributePaths = {"userJpaEntity"})
    Optional<PortfolioJpaEntity> findById(UUID id);

    @EntityGraph(attributePaths = {"userJpaEntity"})
    List<PortfolioJpaEntity> findAllByUserJpaEntityUsernameOrderByCreatedDesc(String username);

    @EntityGraph(attributePaths = {"userJpaEntity"})
    Optional<PortfolioJpaEntity> findFirstByUserJpaEntityUsernameOrderByCreatedDesc(String username);

    @EntityGraph(attributePaths = {"userJpaEntity"})
    Optional<PortfolioJpaEntity> findBySlug(String slug);

    @EntityGraph(attributePaths = {"userJpaEntity"})
    Optional<PortfolioJpaEntity> findBySlugAndUserJpaEntityUsername(String slug, String username);

    @EntityGraph(attributePaths = {"userJpaEntity"})
    Optional<PortfolioJpaEntity> findBySlugAndIsPublicTrue(String slug);

    boolean existsBySlug(String slug);

    void deleteById(UUID id);
}
