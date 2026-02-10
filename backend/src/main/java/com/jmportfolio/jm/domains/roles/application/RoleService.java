package com.jmportfolio.jm.domains.roles.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.RoleCodeEnum;
import com.jmportfolio.jm.domains.roles.domain.model.Role;
import com.jmportfolio.jm.domains.roles.domain.repo.RoleRepository;

@Service
public class RoleService {
    @Autowired
    private RoleRepository roleRepository;

    public Role findByCode(String code) {
        return roleRepository.findByCode(code);
    }

    public Role getAdminRole() {
        return roleRepository.findByCode(RoleCodeEnum.ADMIN.name());
    }

    public Role getUserRole() {
        return roleRepository.findByCode(RoleCodeEnum.USER.name());
    }
}
