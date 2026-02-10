package com.jmportfolio.jm.domains.users.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.domains.roles.application.RoleService;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleService roleService;

    @Transactional
    public User findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User createuserFromGoogle(String email, String name, String picture) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(name);
        user.setAvatarUrl(picture);
        user.setRole(roleService.getUserRole());
        return userRepository.save(user);
    }
}
