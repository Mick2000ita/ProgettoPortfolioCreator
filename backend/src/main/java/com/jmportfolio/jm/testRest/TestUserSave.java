package com.jmportfolio.jm.testRest;

import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class TestUserSave implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        User user = userRepository.findByEmail("test@example.com");
        if (user != null) {
            System.out.println("Utente trovato: " + user.getUsername() + ", email: " + user.getEmail());
        } else {
            System.out.println("Utente non trovato nel DB");
        }
    }
}