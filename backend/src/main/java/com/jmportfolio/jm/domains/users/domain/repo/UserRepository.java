package com.jmportfolio.jm.domains.users.domain.repo;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.infrastructure.entities.mappers.UserJpaMapper;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

@Component
public class UserRepository {
    @Autowired
    private UserJpaRepo userJpaRepo;

    public User findById(UUID id) {
        return UserJpaMapper.entityToModel(userJpaRepo.findById(id).orElse(null));
    }
}
