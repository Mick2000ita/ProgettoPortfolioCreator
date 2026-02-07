package com.jmportfolio.jm.domains.usertemplates.infrastructure.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.entities.UserTemplateJpaEntity;

public interface UserTemplateJpaRepo extends BaseRepository<UserTemplateJpaEntity, UUID> {
    @EntityGraph(attributePaths = {"user"})
    Optional<UserTemplateJpaEntity> findByIdWithUser(UUID id);
}
