package com.jmportfolio.jm.googleauth.client.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleLoginRequestDto {
    @NotBlank
    private String token;

    private Boolean rememberMe = false;
}
