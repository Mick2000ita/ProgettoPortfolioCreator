package com.jmportfolio.jm.domains.apptemplates.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.domains.apptemplates.domain.repo.AppTemplateRepository;

@Service
public class AppTemplateService {
    @Autowired
    private AppTemplateRepository appTemplateRepository;
}
