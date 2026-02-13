package com.jmportfolio.jm.domains.users.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.roles.application.RoleService;
import com.jmportfolio.jm.domains.users.client.dto.RegisterUserDto;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleService roleService;

    
    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;

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

    @Transactional
    public void registerUser(RegisterUserDto dto) {
        User existingUser = findByEmail(dto.getEmail());
        if(existingUser != null) {
            throw new ApplicationException("Email already in use", "EMAIL_IN_USE");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setPassword(bCryptPasswordEncoder.encode(dto.getPassword()));
        user.setRole(roleService.getUserRole());
        userRepository.save(user);
    }
}
