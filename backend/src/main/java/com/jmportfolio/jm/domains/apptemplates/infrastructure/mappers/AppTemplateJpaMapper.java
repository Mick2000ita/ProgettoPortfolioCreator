package com.jmportfolio.jm.domains.apptemplates.infrastructure.mappers;

import com.jmportfolio.jm.domains.apptemplates.domain.models.AppTemplate;
import com.jmportfolio.jm.domains.apptemplates.infrastructure.entities.AppTemplateJpaEntity;

public class AppTemplateJpaMapper {
    public static AppTemplateJpaEntity modelToEntity(AppTemplate model) {
        if (model == null)
            return null;

        AppTemplateJpaEntity entity = new AppTemplateJpaEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setData(model.getData());
        entity.setTemplateType(model.getTemplateType());
        return entity;
    }

    public static AppTemplate entityToModel(AppTemplateJpaEntity entity) {
        if (entity == null)
            return null;

        AppTemplate model = new AppTemplate();
        if (entity.getId() != null) {
            model.setId(entity.getId());
        }
        model.setData(entity.getData());
        model.setTemplateType(entity.getTemplateType());
        return model;
    }
}
