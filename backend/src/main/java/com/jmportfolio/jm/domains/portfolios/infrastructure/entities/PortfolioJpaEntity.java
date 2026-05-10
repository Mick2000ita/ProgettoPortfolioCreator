package com.jmportfolio.jm.domains.portfolios.infrastructure.entities;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "portfolios")
@Getter
@Setter
@ToString(exclude = "userJpaEntity")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PortfolioJpaEntity extends BaseJpaEntity {
    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB", nullable = false)
    private List<String> tags;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "public_data", columnDefinition = "JSONB")
    private List<Object> publicData;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "wip_data", columnDefinition = "JSONB")
    private List<Object> wipData;

    @Column(name = "show_home_snapshot", nullable = false)
    private boolean showHomeSnapshot;

    @Column(name = "show_in_explore", nullable = false)
    private boolean showInExplore;

    @Column(name = "is_public")
    private boolean isPublic;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserJpaEntity userJpaEntity;
}
