package com.jmportfolio.jm.domains.projects.infrastructure.mappers;

import com.jmportfolio.jm.domains.apptemplates.infrastructure.mappers.AppTemplateJpaMapper;
import com.jmportfolio.jm.domains.portfolios.infrastructure.mappers.PortfolioJpaMapper;
import com.jmportfolio.jm.domains.projects.domain.models.Project;
import com.jmportfolio.jm.domains.projects.infrastructure.entities.ProjectJpaEntity;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.mappers.UserTemplateJpaMapper;

public class ProjectJpaMapper {
    public static Project entityToModel(ProjectJpaEntity entity) {
        if (entity == null)
            return null;

        Project model = new Project();
        if (entity.getId() != null) {
            model.setId(entity.getId());
        }
        model.setName(entity.getName());
        model.setData(entity.getData());
        model.setPortfolio(PortfolioJpaMapper.entityToModel(entity.getPortfolio()));
        model.setAppTemplate(AppTemplateJpaMapper.entityToModel(entity.getAppTemplate()));
        model.setUserTemplate(UserTemplateJpaMapper.entityToModel(entity.getUserTemplate()));

        return model;
    }

    public static ProjectJpaEntity modelToEntity(Project model) {
        if (model == null)
            return null;

        ProjectJpaEntity entity = new ProjectJpaEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setName(model.getName());
        entity.setData(model.getData());
        entity.setPortfolio(PortfolioJpaMapper.modelToEntity(model.getPortfolio()));
        entity.setAppTemplate(AppTemplateJpaMapper.modelToEntity(model.getAppTemplate()));
        entity.setUserTemplate(UserTemplateJpaMapper.modelToEntity(model.getUserTemplate()));

        return entity;
    }
}
