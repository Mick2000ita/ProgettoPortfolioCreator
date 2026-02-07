package com.jmportfolio.jm.domains.users.infrastructure.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;

public interface UserJpaRepo extends BaseRepository<UserJpaEntity, UUID> {
    Optional<UserJpaEntity> findByEmail(String email);

    Optional<UserJpaEntity> findByUsername(String username);

    @EntityGraph(attributePaths = {"role"})
    Optional<UserJpaEntity> findByIdWithRole(UUID id);

    @EntityGraph(attributePaths = {"role", "portfolio"})
    Optional<UserJpaEntity> findByIdWithRoleAndPortfolio(UUID id);

}
