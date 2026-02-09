package com.jmportfolio.jm.domains.usertemplates.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.domains.usertemplates.domain.repo.UserTemplateRepository;

@Service
public class UserTemplateService {
    @Autowired
    private UserTemplateRepository userTemplateRepository;
}
