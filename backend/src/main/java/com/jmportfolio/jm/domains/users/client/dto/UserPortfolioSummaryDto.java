package com.jmportfolio.jm.domains.users.client.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserPortfolioSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private boolean isPublic;
}
