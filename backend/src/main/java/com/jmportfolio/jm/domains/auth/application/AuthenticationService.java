package com.jmportfolio.jm.domains.auth.application;

import java.sql.Timestamp;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.auth.application.JwtUserDetails;
import com.jmportfolio.jm.core.auth.application.TokenUtil;
import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.auth.client.dto.LoginInternalResponse;
import com.jmportfolio.jm.domains.auth.client.dto.LoginRequestDto;
import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.mappers.UserJpaMapper;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AuthenticationService {

    @Autowired
    private TokenUtil jwtTokenUtil;

    @Autowired
    private JwtUserDetails jwtuserDetailsService;

    @Autowired
    private UserJpaRepo userRepository;

    private void updateUserLastLoginByUsername(UserJpaEntity users) {
        Timestamp now = Timestamp.from(Instant.now());
        users.setLastLogin(now);
    }

    @Transactional
    public LoginResponseDto loginApp(LoginRequestDto loginRequest) {
        String username = loginRequest.getUsername();

        jwtuserDetailsService.authenticate(username, loginRequest.getPassword());

        final ExtendedAuthUser userDetails = jwtuserDetailsService.loadUserByUsername(username);
        UserJpaEntity user = userRepository.findByUsername(username).orElseThrow(
                () -> new ApplicationException("User not Found", "User not found"));

        updateUserLastLoginByUsername(user);

        final String accessToken = jwtTokenUtil.generateUserToken(userDetails);
        final String refreshToken = jwtTokenUtil.refreshUserToken(accessToken);

        return new LoginResponseDto(accessToken, refreshToken,
                UserJpaMapper.entityToModel(user));
    }

    @Transactional()
    public LoginResponseDto refreshAppToken(String refreshToken) {
        // Strip "Bearer " prefix if present
        if (refreshToken != null && refreshToken.startsWith("Bearer ")) {
            refreshToken = refreshToken.substring(7);
        }
        LoginInternalResponse internalResponse = refresh(refreshToken);
        final ExtendedAuthUser userDetails = jwtuserDetailsService
                .loadUserByUsername(jwtTokenUtil.getUsernameFromToken(refreshToken));
        UserJpaEntity user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ApplicationException("User not Found",
                        "User not found"));

        return new LoginResponseDto(internalResponse.getAccessToken(),
                internalResponse.getRefreshToken(), UserJpaMapper.entityToModel(user));
    }

    @Transactional
    public LoginInternalResponse refresh(String refreshToken) {
        try {
            if (!jwtTokenUtil.canTokenBeRefreshed(refreshToken)) {
                throw new ApplicationException("Invalid refresh token", "Invalid refresh token");
            }
        } catch (Exception e) {
            throw new ApplicationException("Refresh token verification failed",
                    "Refresh token verification failed");
        }

        final String username = jwtTokenUtil.getUsernameFromToken(refreshToken);
        final ExtendedAuthUser userDetails = jwtuserDetailsService.loadUserByUsername(username);

        if (!userDetails.isEnabled()) {
            throw new ApplicationException("User disabled", "User disabled");
        }

        log.info("New Access and Refresh token for user {}", userDetails.getUsername());

        final String newAccessToken = jwtTokenUtil.generateUserToken(userDetails);
        final String newRefreshToken = jwtTokenUtil.refreshUserToken(newAccessToken);

        return new LoginInternalResponse(newAccessToken, newRefreshToken);
    }
}
