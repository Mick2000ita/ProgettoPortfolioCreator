package com.jmportfolio.jm.domains.portfolios.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePortfolioVisibilityRequestDto {
    @JsonProperty("public")
    private boolean isPublic;
}
