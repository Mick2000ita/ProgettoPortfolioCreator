package com.jmportfolio.jm.domains.portfolios.client.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePortfolioDiscoveryPreferencesRequestDto {
    private boolean showHomeSnapshot;
    private boolean showInExplore;
}
