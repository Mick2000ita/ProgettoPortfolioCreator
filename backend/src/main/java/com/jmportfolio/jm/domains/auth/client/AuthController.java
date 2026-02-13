package com.jmportfolio.jm.domains.auth.client;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.auth.application.AuthenticationService;
import com.jmportfolio.jm.domains.auth.client.dto.LoginRequestDto;
import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.client.dto.RegisterUserDto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {
    @Autowired
    private AuthenticationService userAuthenticationService;

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto loginRequest) {
        log.debug("Login {}", loginRequest.getUsername());
        return userAuthenticationService.login(loginRequest);
    }

    @GetMapping("/refresh")
    public LoginResponseDto refreshToken(
            @RequestHeader("Authorization") @NotBlank String refreshToken) {
        log.debug("Refresh token");
        try {
            return userAuthenticationService.refreshAppToken(refreshToken);
        } catch (ApplicationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
    }

    @PostMapping("/register")
    public void registerUser(@RequestBody RegisterUserDto dto) {
        userService.registerUser(dto);
    }
}
