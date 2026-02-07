package com.jmportfolio.jm.domains.portfolios.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioJpaRepo;

@Component
public class PortfolioRepository {
    @Autowired
    private PortfolioJpaRepo portfolioJpaRepo;
}
