package com.jmportfolio.jm.roles.infrastructure.mappers;

import com.jmportfolio.jm.roles.domain.model.Role;
import com.jmportfolio.jm.roles.infrastructure.entities.RoleJpaEntity;

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
}
