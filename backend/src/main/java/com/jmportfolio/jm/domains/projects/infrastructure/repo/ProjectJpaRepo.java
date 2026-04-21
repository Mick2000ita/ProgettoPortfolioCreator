package com.jmportfolio.jm.domains.projects.infrastructure.repo;

import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.projects.infrastructure.entities.ProjectJpaEntity;

public interface ProjectJpaRepo extends BaseRepository<ProjectJpaEntity, UUID> {
    @Modifying
    @Query("DELETE FROM ProjectJpaEntity project WHERE project.portfolio.id = :portfolioId")
    void deleteAllByPortfolioId(@Param("portfolioId") UUID portfolioId);
}
