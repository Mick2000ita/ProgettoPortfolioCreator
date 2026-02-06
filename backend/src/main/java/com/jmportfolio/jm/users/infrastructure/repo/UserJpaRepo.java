package com.jmportfolio.jm.users.infrastructure.repo;

import java.util.UUID;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.users.infrastructure.entities.UserJpaEntity;

public interface UserJpaRepo extends BaseRepository<UserJpaEntity, UUID> {
    
}
