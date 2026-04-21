package com.jmportfolio.jm.domains.users.client.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserProfileDto {
    private UUID id;
    private String email;
    private String username;
    private String avatarUrl;
    private String roleCode;
    private String roleDescription;
    private UserPortfolioSummaryDto portfolio;
}
