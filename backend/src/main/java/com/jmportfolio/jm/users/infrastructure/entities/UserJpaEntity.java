package com.jmportfolio.jm.users.infrastructure.entities;

import java.sql.Timestamp;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.roles.infrastructure.entities.RoleJpaEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    @Column(name="last_login")
    private Timestamp lastLogin;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private RoleJpaEntity role;

    @OneToOne(mappedBy = "userJpaEntity", fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", referencedColumnName = "id")
    private PortfolioJpaEntity portfolio;
}
