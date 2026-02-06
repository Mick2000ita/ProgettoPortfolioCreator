package com.jmportfolio.jm.users.infrastructure.mappers;

import com.jmportfolio.jm.roles.infrastructure.mappers.RoleJpaMapper;
import com.jmportfolio.jm.users.domain.models.User;
import com.jmportfolio.jm.users.infrastructure.entities.UserJpaEntity;

public class UserJpaMapper {
    public static User entityToModel(UserJpaEntity entity) {
        if (entity == null) return null;

        User model = new User();
        if(entity.getId() != null){
            model.setId(entity.getId());
        }
        model.setEmail(entity.getEmail());
        model.setUsername(entity.getUsername());
        model.setAvatarUrl(entity.getAvatarUrl());
        model.setRole(RoleJpaMapper.entityToModel(entity.getRole()));
        return model;
    }
}
