package com.jmportfolio.jm.domains.auth.client.dto;

import com.jmportfolio.jm.domains.users.domain.models.User;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginResponseDto {

    private String accessToken;

    private String refreshToken;

    private User user;

    public LoginResponseDto(String accessToken, String refreshToken, User user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
    }
}
