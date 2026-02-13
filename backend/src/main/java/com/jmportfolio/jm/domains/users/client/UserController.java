package com.jmportfolio.jm.domains.users.client;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.domain.models.User;

import lombok.extern.slf4j.Slf4j;



@RestController
@RequestMapping("/api/user")
@Slf4j
public class UserController {
    
    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public User getMethodName(@PathVariable UUID id) {
        log.info("Fetching user with id: {}", id);
        return userService.findById(id);
    }
    
}
