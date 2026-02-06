package com.jmportfolio.jm.users.infrastructure.entities;

import java.sql.Timestamp;
import java.util.UUID;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.roles.infrastructure.entities.RoleJpaEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
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
    @Column
    private String email;

    @Column
    private String username;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name="last_login")
    private Timestamp lastLogin;

    @ManyToOne(optional = false)
    private RoleJpaEntity role;
}
