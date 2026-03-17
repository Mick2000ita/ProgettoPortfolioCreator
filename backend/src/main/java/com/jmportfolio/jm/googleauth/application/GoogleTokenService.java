package com.jmportfolio.jm.googleauth.application;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.jmportfolio.jm.core.auth.application.JwtUserDetails;
import com.jmportfolio.jm.core.auth.application.TokenUtil;
import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.domains.auth.client.dto.LoginResponseDto;
import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.googleauth.client.GoogleTokenVerifier;

@Service
public class GoogleTokenService {

    private final GoogleTokenVerifier verifier;

    @Autowired
    private UserService userService;

    @Autowired
    private TokenUtil jwtTokenUtil;

    @Autowired
    private JwtUserDetails jwtUserDetails;

    public GoogleTokenService(GoogleTokenVerifier verifier) {
        this.verifier = verifier;
    }

    public LoginResponseDto googleLogin(Map<String, String> body) throws Exception {
        String token = body.get("token");
        GoogleIdToken.Payload payload = verifier.verify(token);

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        User user = userService.findByEmail(email);
        if (user == null) {
            user = userService.createuserFromGoogle(email, name, picture);
        }

        ExtendedAuthUser userDetails = jwtUserDetails.loadUserByUsername(user.getUsername());
        String accessToken = jwtTokenUtil.generateUserToken(userDetails);
        String refreshToken = jwtTokenUtil.refreshUserToken(accessToken);

        return new LoginResponseDto(accessToken, refreshToken, user);
    }
}
