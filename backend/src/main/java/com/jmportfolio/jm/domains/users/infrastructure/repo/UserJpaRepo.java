package com.jmportfolio.jm.domains.users.infrastructure.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;

public interface UserJpaRepo extends BaseRepository<UserJpaEntity, UUID> {
    Optional<UserJpaEntity> findByEmail(String email);

    Optional<UserJpaEntity> findByUsername(String username);

    @EntityGraph(attributePaths = { "role" })
    @Query("SELECT u FROM UserJpaEntity u WHERE u.id = :id")
    Optional<UserJpaEntity> findByIdWithRole(@Param("id") UUID id);

    @EntityGraph(attributePaths = { "role", "portfolio" })
    @Query("SELECT u FROM UserJpaEntity u WHERE u.id = :id")
    Optional<UserJpaEntity> findByIdWithRoleAndPortfolio(@Param("id") UUID id);

}
