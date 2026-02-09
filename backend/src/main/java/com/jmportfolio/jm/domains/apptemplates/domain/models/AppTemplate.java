package com.jmportfolio.jm.domains.apptemplates.domain.models;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppTemplate {
    private UUID id;
    private String templateType;
    private List<Object> data = new ArrayList<>();
}
