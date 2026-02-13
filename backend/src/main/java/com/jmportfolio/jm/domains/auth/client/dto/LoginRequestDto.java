package com.jmportfolio.jm.domains.auth.client.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class LoginRequestDto {
    @NotBlank
    private String username;

    @NotBlank
    private String password;
}

