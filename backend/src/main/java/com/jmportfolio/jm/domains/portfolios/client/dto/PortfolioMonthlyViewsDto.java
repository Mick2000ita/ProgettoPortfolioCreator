package com.jmportfolio.jm.domains.portfolios.client.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PortfolioMonthlyViewsDto {
    private String month;
    private String label;
    private long views;
}
