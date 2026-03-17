package com.jmportfolio.jm.googleauth.client;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.googleauth.application.GoogleTokenService;

@RestController
@RequestMapping("/api/auth")
public class GoogleTokenController {

    @Autowired
    private GoogleTokenService tokenService;

    @PostMapping("/google")
    public LoginResponseDto googleLogin(@RequestBody Map<String, String> body) throws Exception {
        return tokenService.googleLogin(body);
    }
}
