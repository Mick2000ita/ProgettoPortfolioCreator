package com.jmportfolio.jm.roles.infrastructure.repo;

import java.util.UUID;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.roles.infrastructure.entities.RoleJpaEntity;

public interface RoleJpaRepo extends BaseRepository<RoleJpaEntity, UUID> {
    
}
