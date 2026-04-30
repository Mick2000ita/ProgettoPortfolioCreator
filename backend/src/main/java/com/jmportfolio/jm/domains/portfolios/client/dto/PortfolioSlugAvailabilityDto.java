package com.jmportfolio.jm.domains.portfolios.client.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PortfolioSlugAvailabilityDto {
    private String slug;
    private boolean available;
}
