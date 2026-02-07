package com.jmportfolio.jm.portfolios.infrastructure.mappers;

import com.jmportfolio.jm.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.users.infrastructure.mappers.UserJpaMapper;

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
}
