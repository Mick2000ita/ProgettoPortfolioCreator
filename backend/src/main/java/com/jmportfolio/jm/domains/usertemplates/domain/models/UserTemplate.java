package com.jmportfolio.jm.domains.usertemplates.domain.models;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.jmportfolio.jm.domains.users.domain.models.User;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserTemplate {
    private UUID id;
    private String templateType;
    private List<Object> data = new ArrayList<>();
    private User user;
}
