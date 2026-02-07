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
import jakarta.persistence.OneToOne;
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
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PortfolioJpaEntity extends BaseJpaEntity{
    @Column
    private String title;

    @Column
    private String slug;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "public_data", columnDefinition = "JSONB")
    private List<Object> publicData;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "wip_data", columnDefinition = "JSONB")
    private List<Object> wipData;

    @Column(name = "is_public")
    private boolean isPublic;

    @OneToOne(mappedBy = "portfolio", fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private UserJpaEntity userJpaEntity;
}
