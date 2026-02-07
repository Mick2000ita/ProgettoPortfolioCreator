package com.jmportfolio.jm.domains.projects.infrastructure.entities;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.domains.apptemplates.infrastructure.entities.AppTemplateJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.entities.UserTemplateJpaEntity;

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
@Table(name = "projects")
@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectJpaEntity extends BaseJpaEntity {
    @Column(name = "name")
    private String name;

    @Column(name = "position")
    private Integer position;

    @Column(name = "is_active", columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive;

    @Type(JsonBinaryType.class)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "JSONB")
    private List<Object> data;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", referencedColumnName = "id")
    private PortfolioJpaEntity portfolio;

    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "app_template_id", referencedColumnName = "id")
    private AppTemplateJpaEntity appTemplate;

    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_template_id", referencedColumnName = "id")
    private UserTemplateJpaEntity userTemplate;
}
