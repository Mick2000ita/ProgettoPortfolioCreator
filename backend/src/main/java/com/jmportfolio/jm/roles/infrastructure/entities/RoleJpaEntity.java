package com.jmportfolio.jm.roles.infrastructure.entities;

import java.util.List;

import com.jmportfolio.jm.core.BaseJpaEntity;
import com.jmportfolio.jm.users.infrastructure.entities.UserJpaEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;


@Entity
@Table(name = "roles")
@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoleJpaEntity extends BaseJpaEntity{
    @Column(unique = true, nullable = false)
    private String code;

    @Column
    private String description;

    @OneToMany(mappedBy = "role")
    private List<UserJpaEntity> users;
}
