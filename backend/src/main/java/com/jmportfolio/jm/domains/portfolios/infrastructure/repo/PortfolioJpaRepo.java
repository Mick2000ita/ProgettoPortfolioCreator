package com.jmportfolio.jm.domains.portfolios.infrastructure.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;

public interface PortfolioJpaRepo extends BaseRepository<PortfolioJpaEntity, UUID>{
    
    @EntityGraph(attributePaths = {"user"})
    Optional<PortfolioJpaEntity> findById(UUID id);
}
