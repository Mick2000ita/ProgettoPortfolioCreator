package com.jmportfolio.jm.domains.projects.infrastructure.repo;

import java.util.UUID;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.projects.infrastructure.entities.ProjectJpaEntity;

public interface ProjectJpaRepo extends BaseRepository<ProjectJpaEntity, UUID> {
    
}
