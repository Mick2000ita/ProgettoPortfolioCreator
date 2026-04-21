package com.jmportfolio.jm.domains.users.domain.repo;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.infrastructure.mappers.UserJpaMapper;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

import jakarta.transaction.Transactional;

@Component
public class UserRepository {

    @Autowired
    private UserJpaRepo userJpaRepo;

    @Transactional
    public User findById(UUID id) {
        return UserJpaMapper.entityToModel(userJpaRepo.findById(id).orElse(null));
    }

    @Transactional
    public User findByEmail(String email) {
        return userJpaRepo.findByEmail(email)
                .map(UserJpaMapper::entityToModel)
                .orElse(null);
    }

    @Transactional
    public User findByUsername(String username) {
        return userJpaRepo.findByUsername(username)
                .map(UserJpaMapper::entityToModel)
                .orElse(null);
    }

    @Transactional
    public User save(User user) {
        var entity = UserJpaMapper.modelToEntity(user);
        return UserJpaMapper.entityToModel(userJpaRepo.save(entity));
    }
}
