package com.jmportfolio.jm.domains.usertemplates.infrastructure.mappers;

import java.util.List;

import com.jmportfolio.jm.domains.usertemplates.domain.models.UserTemplate;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.entities.UserTemplateJpaEntity;

public class UserTemplateJpaMapper {
    public static UserTemplateJpaEntity modelToEntity(UserTemplate model) {
        if (model == null)
            return null;
        UserTemplateJpaEntity jpaEntity = new UserTemplateJpaEntity();
        jpaEntity.setId(model.getId());
        jpaEntity.setTemplateType(model.getTemplateType());
        jpaEntity.setData(model.getData());
        return jpaEntity;
    }

    public static List<UserTemplateJpaEntity> modelToEntity(List<UserTemplate> models) {
        if (models == null)
            return null;
        return models.stream()
                .map(UserTemplateJpaMapper::modelToEntity)
                .toList();
    }

    public static UserTemplate entityToModel(UserTemplateJpaEntity entity) {
        if (entity == null)
            return null;

        UserTemplate model = new UserTemplate();
        model.setId(entity.getId());
        model.setTemplateType(entity.getTemplateType());
        model.setData(entity.getData());
        return model;
    }

    public static List<UserTemplate> entityToModel(List<UserTemplateJpaEntity> entities) {
        if (entities == null)
            return null;
        return entities.stream()
                .map(UserTemplateJpaMapper::entityToModel)
                .toList();
    }
}
