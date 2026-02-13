package com.jmportfolio.jm.domains.users.client;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jmportfolio.jm.domains.users.application.UserService;
import com.jmportfolio.jm.domains.users.client.dto.RegisterUserDto;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/user")
@Slf4j
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public void registerUser(@RequestBody RegisterUserDto dto) {
        userService.registerUser(dto);
    }
    
}
