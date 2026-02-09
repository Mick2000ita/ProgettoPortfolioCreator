package com.jmportfolio.jm.domains.users.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
