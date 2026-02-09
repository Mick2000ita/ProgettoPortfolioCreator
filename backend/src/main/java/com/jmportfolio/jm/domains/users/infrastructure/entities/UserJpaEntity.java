package com.jmportfolio.jm.domains.users.infrastructure.entities;

import java.sql.Timestamp;
import java.util.List;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.roles.infrastructure.entities.RoleJpaEntity;
import com.jmportfolio.jm.domains.usertemplates.infrastructure.entities.UserTemplateJpaEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "users")
@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserJpaEntity extends BaseJpaEntity {
    @Column(unique = true, nullable = false)
    private String email;

    @Column
    private String username;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "last_login")
    private Timestamp lastLogin;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private RoleJpaEntity role;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<UserTemplateJpaEntity> templates;

    @OneToOne(mappedBy = "userJpaEntity", fetch = FetchType.LAZY)
    private PortfolioJpaEntity portfolio;
}
