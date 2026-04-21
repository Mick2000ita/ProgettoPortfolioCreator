package com.jmportfolio.jm.googleauth.application;

import java.sql.Timestamp;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.jmportfolio.jm.core.auth.application.JwtUserDetails;
import com.jmportfolio.jm.core.auth.application.TokenUtil;
import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.mappers.UserJpaMapper;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;
import com.jmportfolio.jm.googleauth.client.GoogleTokenVerifier;
import com.jmportfolio.jm.googleauth.client.dto.GoogleLoginRequestDto;

import jakarta.transaction.Transactional;

@Service
public class TokenService {

    private final GoogleTokenVerifier verifier;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUserDetails jwtUserDetails;

    @Autowired
    private TokenUtil tokenUtil;

    @Autowired
    private UserJpaRepo userRepository;

    public TokenService(GoogleTokenVerifier verifier) {
        this.verifier = verifier;
    }

    private void updateUserLastLogin(UserJpaEntity user) {
        user.setLastLogin(Timestamp.from(Instant.now()));
    }

    @Transactional
    public LoginResponseDto googleLogin(GoogleLoginRequestDto request) throws Exception {
        GoogleIdToken.Payload payload = verifier.verify(request.getToken());

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");
        boolean rememberMe = Boolean.TRUE.equals(request.getRememberMe());

        User user = userService.findByEmail(email);
        if (user == null) {
            user = userService.createuserFromGoogle(email, name, picture);
        }

        UserJpaEntity persistentUser = userRepository.findByEmail(email).orElseThrow(
                () -> new ApplicationException("User not Found", "User not found"));

        updateUserLastLogin(persistentUser);

        ExtendedAuthUser userDetails = jwtUserDetails.loadUserByUsername(persistentUser.getUsername());
        String accessToken = tokenUtil.generateUserToken(userDetails);
        String refreshToken = tokenUtil.generateRefreshToken(userDetails, rememberMe);

        return new LoginResponseDto(accessToken, refreshToken,
                UserJpaMapper.entityToModel(persistentUser));
    }
}
