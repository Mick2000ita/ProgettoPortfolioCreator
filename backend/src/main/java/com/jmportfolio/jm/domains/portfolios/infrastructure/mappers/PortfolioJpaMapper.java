package com.jmportfolio.jm.domains.portfolios.infrastructure.mappers;

import java.util.List;

import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;

public class PortfolioJpaMapper {
    public static Portfolio entityToModel(PortfolioJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        Portfolio model = new Portfolio();
        model.setId(entity.getId());
        model.setTitle(entity.getTitle());
        model.setSlug(entity.getSlug());
        model.setTags(entity.getTags() == null ? List.of() : entity.getTags());
        model.setPublicData(entity.getPublicData());
        model.setWipData(entity.getWipData());
        model.setShowHomeSnapshot(entity.isShowHomeSnapshot());
        model.setShowInExplore(entity.isShowInExplore());
        model.setPublic(entity.isPublic());
        return model;
    }

    public static PortfolioJpaEntity modelToEntity(Portfolio model) {
        if (model == null) {
            return null;
        }

        PortfolioJpaEntity entity = new PortfolioJpaEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setTitle(model.getTitle());
        entity.setSlug(model.getSlug());
        entity.setTags(model.getTags() == null ? List.of() : model.getTags());
        entity.setPublicData(model.getPublicData());
        entity.setWipData(model.getWipData());
        entity.setShowHomeSnapshot(model.isShowHomeSnapshot());
        entity.setShowInExplore(model.isShowInExplore());
        entity.setPublic(model.isPublic());
        return entity;
    }
}
