package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PortfolioSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private boolean isPublic;
}
