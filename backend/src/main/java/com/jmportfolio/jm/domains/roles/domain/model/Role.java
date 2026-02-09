package com.jmportfolio.jm.domains.roles.domain.model;

import java.util.List;
import java.util.UUID;

import com.jmportfolio.jm.domains.users.domain.models.User;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Role {
    private UUID id;
    private String code;
    private String description;
    private List<User> users;
}
