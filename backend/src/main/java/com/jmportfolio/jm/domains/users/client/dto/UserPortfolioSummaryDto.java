package com.jmportfolio.jm.domains.users.client.dto;

import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserPortfolioSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private List<String> tags;
    private boolean isPublic;
    private boolean showHomeSnapshot;
    private boolean showInExplore;
}
