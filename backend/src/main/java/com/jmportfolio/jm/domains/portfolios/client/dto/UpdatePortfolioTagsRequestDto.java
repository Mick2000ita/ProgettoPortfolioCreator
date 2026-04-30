package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePortfolioTagsRequestDto {
    private List<String> tags;
}
