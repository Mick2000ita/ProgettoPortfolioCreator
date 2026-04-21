package com.jmportfolio.jm.domains.users.application;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioJpaRepo;
import com.jmportfolio.jm.domains.roles.application.RoleService;
import com.jmportfolio.jm.domains.users.client.dto.UserPortfolioSummaryDto;
import com.jmportfolio.jm.domains.users.client.dto.UserProfileDto;
import com.jmportfolio.jm.domains.users.client.dto.RegisterUserDto;
import com.jmportfolio.jm.domains.users.domain.models.User;
import com.jmportfolio.jm.domains.users.domain.repo.UserRepository;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

import jakarta.transaction.Transactional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleService roleService;

    @Autowired
    private UserJpaRepo userJpaRepo;

    @Autowired
    private PortfolioJpaRepo portfolioJpaRepo;

    
    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;

    @Transactional
    public User findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User createuserFromGoogle(String email, String name, String picture) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(name);
        user.setAvatarUrl(picture);
        user.setRole(roleService.getUserRole());
        return userRepository.save(user);
    }

    @Transactional
    public void registerUser(RegisterUserDto dto) {
        User existingUser = findByEmail(dto.getEmail());
        if(existingUser != null) {
            throw new ApplicationException("Email already in use", "EMAIL_IN_USE");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setPassword(bCryptPasswordEncoder.encode(dto.getPassword()));
        user.setRole(roleService.getUserRole());
        userRepository.save(user);
    }

    @Transactional
    public UserProfileDto getProfileByUsername(String username) {
        UserJpaEntity user = userJpaRepo.findByUsernameWithRole(username)
                .orElseThrow(() -> new ApplicationException("User not found", "USER_NOT_FOUND"));

        PortfolioJpaEntity latestPortfolio = portfolioJpaRepo
                .findFirstByUserJpaEntityUsernameOrderByCreatedDesc(username)
                .orElse(null);

        UserPortfolioSummaryDto portfolio = null;
        if (latestPortfolio != null) {
            portfolio = new UserPortfolioSummaryDto(
                    latestPortfolio.getId(),
                    latestPortfolio.getTitle(),
                    latestPortfolio.getSlug(),
                    latestPortfolio.isPublic());
        }

        return new UserProfileDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getRole().getCode(),
                user.getRole().getDescription(),
                portfolio);
    }
}
