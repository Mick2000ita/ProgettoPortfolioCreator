package com.jmportfolio.jm.users.domain.repo;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.users.domain.models.User;
import com.jmportfolio.jm.users.infrastructure.mappers.UserJpaMapper;
import com.jmportfolio.jm.users.infrastructure.repo.UserJpaRepo;

@Component
public class UserRepository {
    @Autowired
    private UserJpaRepo userJpaRepo;

    public User findById(UUID id) {
        return UserJpaMapper.entityToModel(userJpaRepo.findById(id).orElse(null));
    }
}
