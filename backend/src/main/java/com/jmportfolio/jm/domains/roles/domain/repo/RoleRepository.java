package com.jmportfolio.jm.domains.roles.domain.repo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.domains.roles.domain.model.Role;
import com.jmportfolio.jm.domains.roles.infrastructure.mappers.RoleJpaMapper;
import com.jmportfolio.jm.domains.roles.infrastructure.repo.RoleJpaRepo;

@Component
public class RoleRepository {
    @Autowired
    private RoleJpaRepo roleJpaRepo;;

    public Role findByCode(String code) {
        return RoleJpaMapper.entityToModel(roleJpaRepo.findByCode(code));
    }
}
