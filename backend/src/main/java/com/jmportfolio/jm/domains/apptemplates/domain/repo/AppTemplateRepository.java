package com.jmportfolio.jm.domains.apptemplates.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.apptemplates.infrastructure.repo.AppTemplateJpaRepo;

@Component
public class AppTemplateRepository {
    @Autowired
    private AppTemplateJpaRepo appTemplateJpaRepo;
}
