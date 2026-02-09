package com.jmportfolio.jm.domains.portfolios.infrastructure.mappers;

import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.mappers.UserJpaMapper;

public class PortfolioJpaMapper {
    public static Portfolio entityToModel(PortfolioJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        Portfolio model = new Portfolio();
        model.setId(entity.getId());
        model.setTitle(entity.getTitle());
        model.setSlug(entity.getSlug());
        model.setPublicData(entity.getPublicData());
        model.setWipData(entity.getWipData());
        model.setPublic(entity.isPublic());
        model.setUser(UserJpaMapper.entityToModel(entity.getUserJpaEntity()));
        return model;
    }

    public static PortfolioJpaEntity modelToEntity(Portfolio model) {
        if (model == null) {
            return null;
        }

        PortfolioJpaEntity entity = new PortfolioJpaEntity();
        entity.setId(model.getId());
        entity.setTitle(model.getTitle());
        entity.setSlug(model.getSlug());
        entity.setPublicData(model.getPublicData());
        entity.setWipData(model.getWipData());
        entity.setPublic(model.isPublic());
        entity.setUserJpaEntity(UserJpaMapper.modelToEntity(model.getUser()));
        return entity;
    }
}
