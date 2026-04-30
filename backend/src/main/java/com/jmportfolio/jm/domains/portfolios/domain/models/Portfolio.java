package com.jmportfolio.jm.domains.portfolios.domain.models;

import java.util.List;
import java.util.UUID;

import com.jmportfolio.jm.domains.users.domain.models.User;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class Portfolio {
    private UUID id;
    private String title;
    private String slug;
    private List<String> tags;
    private List<Object> publicData;
    private List<Object> wipData;
    private boolean showHomeSnapshot;
    private boolean showInExplore;
    private boolean isPublic;
    private User user;
}
