package com.jmportfolio.jm.domains.projects.domain.models;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.jmportfolio.jm.domains.apptemplates.domain.models.AppTemplate;
import com.jmportfolio.jm.domains.portfolios.domain.models.Portfolio;
import com.jmportfolio.jm.domains.usertemplates.domain.models.UserTemplate;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class Project {
    private UUID id;
    private String name;
    private Integer position;
    private Boolean isActive;
    private List<Object> data = new ArrayList<>();
    private Portfolio portfolio;
    private UserTemplate userTemplate;
    private AppTemplate appTemplate;
}
