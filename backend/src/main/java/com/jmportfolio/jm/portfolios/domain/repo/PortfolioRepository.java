package com.jmportfolio.jm.portfolios.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.portfolios.infrastructure.repo.PortfolioJpaRepo;

@Component
public class PortfolioRepository {
    @Autowired
    private PortfolioJpaRepo portfolioJpaRepo;
}
