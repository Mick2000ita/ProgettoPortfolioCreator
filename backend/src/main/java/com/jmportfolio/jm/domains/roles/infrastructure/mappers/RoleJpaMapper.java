package com.jmportfolio.jm.domains.roles.infrastructure.mappers;

import com.jmportfolio.jm.domains.roles.domain.model.Role;
import com.jmportfolio.jm.domains.roles.infrastructure.entities.RoleJpaEntity;

public class RoleJpaMapper {
    public static Role entityToModel(RoleJpaEntity entity) {
        if (entity == null) return null;

        Role model = new Role();
        if(entity.getId() != null){
            model.setId(entity.getId());
        }
        model.setCode(entity.getCode());
        model.setDescription(entity.getDescription());
        return model;
    }

    public static RoleJpaEntity modelToEntity(Role model) {
        if (model == null) return null;

        RoleJpaEntity entity = new RoleJpaEntity();
        if(model.getId() != null){
            entity.setId(model.getId());
        }
        entity.setCode(model.getCode());
        entity.setDescription(model.getDescription());
        return entity;
    }
}
