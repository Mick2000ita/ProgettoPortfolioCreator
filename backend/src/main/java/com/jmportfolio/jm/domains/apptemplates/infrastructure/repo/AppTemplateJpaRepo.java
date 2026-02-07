package com.jmportfolio.jm.domains.apptemplates.infrastructure.repo;

import java.util.UUID;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.apptemplates.infrastructure.entities.AppTemplateJpaEntity;

public interface AppTemplateJpaRepo extends BaseRepository<AppTemplateJpaEntity, UUID> {
    
}
