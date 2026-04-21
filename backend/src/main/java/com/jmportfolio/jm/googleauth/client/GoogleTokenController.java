package com.jmportfolio.jm.googleauth.client;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.googleauth.application.TokenService;
import com.jmportfolio.jm.googleauth.client.dto.GoogleLoginRequestDto;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class GoogleTokenController {

    @Autowired
    private TokenService tokenService;
    
    @PostMapping("/google")
    public LoginResponseDto googleLogin(@Valid @RequestBody GoogleLoginRequestDto request)
            throws Exception {
        return tokenService.googleLogin(request);
    }
}
