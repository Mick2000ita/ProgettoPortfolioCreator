package com.jmportfolio.jm.googleauth.application;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.jmportfolio.jm.googleauth.client.GoogleTokenVerifier;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;
import com.jmportfolio.jm.domains.roles.domain.model.Role;
import com.jmportfolio.jm.domains.roles.infrastructure.mappers.RoleJpaMapper;
import com.jmportfolio.jm.domains.roles.infrastructure.repo.RoleJpaRepo;
import com.jmportfolio.jm.domains.roles.infrastructure.entities.RoleJpaEntity;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class TokenService {

    private final GoogleTokenVerifier verifier;
    private final UserRepository userRepository;
    private final RoleJpaRepo roleJpaRepo;


    public TokenService(GoogleTokenVerifier verifier, UserRepository userRepository, RoleJpaRepo roleJpaRepo) {
        this.verifier = verifier;
        this.userRepository = userRepository;
        this.roleJpaRepo = roleJpaRepo;
    }
    @Transactional
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) throws Exception {
        String token = body.get("token");
        GoogleIdToken.Payload payload = verifier.verify(token);

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");


        User user = userRepository.findByEmail(email);
        if (user == null) {


            RoleJpaEntity roleEntity = roleJpaRepo.findById(UUID.fromString("2248ef78-f50a-4d0a-a107-3a8d6d591a27"))
                    .orElseThrow(() -> new RuntimeException("Ruolo ADMIN non trovato nel DB"));

            Role roleModel = RoleJpaMapper.entityToModel(roleEntity);


            user = new User();
            user.setId(UUID.randomUUID());
            user.setEmail(email);
            user.setUsername(name);
            user.setAvatarUrl(picture);
            user.setRole(roleModel);

            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
                "email", user.getEmail(),
                "name", user.getUsername(),
                "picture", user.getAvatarUrl()
        ));
    }


}
