package com.jmportfolio.jm.users.domain.models;

import java.util.UUID;

import com.jmportfolio.jm.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.roles.domain.model.Role;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class User {
    private UUID id;
    private String email;
    private String username;
    private String avatarUrl;
    private Role role;
    private Portfolio portfolio;
}
