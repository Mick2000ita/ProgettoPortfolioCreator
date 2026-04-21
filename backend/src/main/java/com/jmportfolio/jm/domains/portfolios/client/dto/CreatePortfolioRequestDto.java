package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreatePortfolioRequestDto {
    @NotBlank
    private String title;

    private List<Map<String, Object>> modules;
}
