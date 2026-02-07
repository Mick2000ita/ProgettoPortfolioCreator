package com.jmportfolio.jm.domains.projects.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.projects.infrastructure.repo.ProjectJpaRepo;

@Component
public class ProjectRepository {
    @Autowired
    private ProjectJpaRepo projectJpaRepo;
}
