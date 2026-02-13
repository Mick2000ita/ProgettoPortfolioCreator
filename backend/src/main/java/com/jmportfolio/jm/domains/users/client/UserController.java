package com.jmportfolio.jm.domains.users.client;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.domain.models.User;


@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "http://localhost:4210")
public class UserController {
 
    @Autowired
    private UserService userService;

    @GetMapping("{userId}")
    public User getUserById(@PathVariable String userId) {
        return userService.findById(UUID.fromString(userId));
    }
    
}
