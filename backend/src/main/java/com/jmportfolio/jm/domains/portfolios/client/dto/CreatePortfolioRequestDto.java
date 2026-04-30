package com.jmportfolio.jm.domains.portfolios.client.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreatePortfolioRequestDto {
    @NotBlank
    private String title;

    private String slug;

    private List<String> tags;

    private List<Map<String, Object>> modules;

    private Boolean showHomeSnapshot;

    private Boolean showInExplore;

    @JsonProperty("public")
    private Boolean isPublic;
}
