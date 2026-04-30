package com.jmportfolio.jm.domains.portfolios.infrastructure.repo;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jmportfolio.jm.core.BaseRepository;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioViewJpaEntity;

public interface PortfolioViewJpaRepo extends BaseRepository<PortfolioViewJpaEntity, UUID> {
    long countByPortfolio_UserJpaEntity_Username(String username);

    long countByPortfolio_UserJpaEntity_UsernameAndCreatedGreaterThanEqual(
            String username,
            Timestamp created);

    long countByPortfolio_UserJpaEntity_UsernameAndCreatedGreaterThanEqualAndCreatedLessThan(
            String username,
            Timestamp createdFrom,
            Timestamp createdTo);

    @Query("""
            SELECT view.portfolio.id, COUNT(view)
            FROM PortfolioViewJpaEntity view
            WHERE view.portfolio.userJpaEntity.username = :username
            GROUP BY view.portfolio.id
            """)
    List<Object[]> countViewsByPortfolio(@Param("username") String username);

    @Query("""
            SELECT view.portfolio.id, COUNT(view)
            FROM PortfolioViewJpaEntity view
            WHERE view.portfolio.userJpaEntity.username = :username
              AND view.created >= :createdFrom
            GROUP BY view.portfolio.id
            """)
    List<Object[]> countViewsByPortfolioFrom(
            @Param("username") String username,
            @Param("createdFrom") Timestamp createdFrom);

    @Query("""
            SELECT FUNCTION('to_char', view.created, 'YYYY-MM'), COUNT(view)
            FROM PortfolioViewJpaEntity view
            WHERE view.portfolio.userJpaEntity.username = :username
              AND view.created >= :createdFrom
            GROUP BY FUNCTION('to_char', view.created, 'YYYY-MM')
            ORDER BY FUNCTION('to_char', view.created, 'YYYY-MM')
            """)
    List<Object[]> countViewsByMonthFrom(
            @Param("username") String username,
            @Param("createdFrom") Timestamp createdFrom);
}
