package com.jmportfolio.jm.portfolios.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.portfolios.domain.repo.PortfolioRepository;

@Service
public class PortfolioService {
    @Autowired
    private PortfolioRepository portfolioRepository;
}
