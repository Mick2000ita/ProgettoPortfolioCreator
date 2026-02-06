package com.jmportfolio.jm.googleauth.application;

import com.jmportfolio.jm.googleauth.client.GoogleTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class TokenService {

    private final GoogleTokenVerifier verifier;

    public TokenService(GoogleTokenVerifier verifier) {
        this.verifier = verifier;
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) throws Exception {

        String token = body.get("token");

        GoogleIdToken.Payload payload = verifier.verify(token);

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        return ResponseEntity.ok(Map.of(
                "email", email,
                "name", name,
                "picture", picture
        ));
    }
}
