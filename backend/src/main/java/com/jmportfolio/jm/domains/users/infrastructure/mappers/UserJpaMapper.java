package com.jmportfolio.jm.domains.users.infrastructure.mappers;

import com.jmportfolio.jm.domains.roles.infrastructure.mappers.RoleJpaMapper;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.mappers.UserTemplateJpaMapper;

public class UserJpaMapper {
    public static User entityToModel(UserJpaEntity entity) {
        if (entity == null) return null;

        User model = new User();
        if(entity.getId() != null){
            model.setId(entity.getId());
        }
        model.setEmail(entity.getEmail());
        model.setUsername(entity.getUsername());
        model.setPassword(entity.getPassword());
        model.setAvatarUrl(entity.getAvatarUrl());
        model.setRole(RoleJpaMapper.entityToModel(entity.getRole()));
        model.setTemplates(UserTemplateJpaMapper.entityToModel(entity.getTemplates()));
        return model;
    }

    public static UserJpaEntity modelToEntity(User model) {
        if (model == null) return null;

        UserJpaEntity entity = new UserJpaEntity();
        if(model.getId() != null){
            entity.setId(model.getId());
        }
        entity.setEmail(model.getEmail());
        entity.setUsername(model.getUsername());
        entity.setPassword(model.getPassword());
        entity.setAvatarUrl(model.getAvatarUrl());
        entity.setRole(RoleJpaMapper.modelToEntity(model.getRole()));
        entity.setTemplates(UserTemplateJpaMapper.modelToEntity(model.getTemplates()));
        return entity;
    }
}
