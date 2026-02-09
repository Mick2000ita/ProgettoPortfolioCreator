package com.jmportfolio.jm.domains.usertemplates.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.usertemplates.infrastructure.repo.UserTemplateJpaRepo;

@Component
public class UserTemplateRepository {
    @Autowired
    private UserTemplateJpaRepo userTemplateJpaRepo;
}
