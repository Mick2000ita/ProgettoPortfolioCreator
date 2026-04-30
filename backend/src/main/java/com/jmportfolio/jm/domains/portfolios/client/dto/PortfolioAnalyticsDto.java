package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PortfolioAnalyticsDto {
    private long totalViews;
    private long monthlyViews;
    private long previousMonthViews;
    private List<PortfolioMonthlyViewsDto> monthlyTrend;
    private List<PortfolioViewSummaryDto> portfolioViews;
}
