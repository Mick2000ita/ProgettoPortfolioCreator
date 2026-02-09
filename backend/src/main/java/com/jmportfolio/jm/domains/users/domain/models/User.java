package com.jmportfolio.jm.domains.users.domain.models;

import java.util.List;
import java.util.UUID;

import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.roles.domain.model.Role;
import com.jmportfolio.jm.domains.usertemplates.domain.models.UserTemplate;

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
    private List<UserTemplate> templates;
}
