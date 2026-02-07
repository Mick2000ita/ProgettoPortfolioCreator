package com.jmportfolio.jm.portfolios.infrastructure.repo;

import java.util.UUID;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.portfolios.infrastructure.entities.PortfolioJpaEntity;

public interface PortfolioJpaRepo extends BaseRepository<PortfolioJpaEntity, UUID>{
    
}
