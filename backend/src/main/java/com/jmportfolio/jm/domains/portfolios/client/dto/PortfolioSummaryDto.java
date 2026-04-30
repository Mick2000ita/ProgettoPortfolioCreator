package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PortfolioSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private List<String> tags;
    private boolean isPublic;
    private boolean showHomeSnapshot;
    private boolean showInExplore;
}
