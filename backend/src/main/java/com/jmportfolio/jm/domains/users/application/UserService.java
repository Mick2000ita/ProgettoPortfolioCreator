package com.jmportfolio.jm.domains.users.application;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.portfolios.infrastructure.entities.PortfolioJpaEntity;
import com.jmportfolio.jm.domains.portfolios.infrastructure.repo.PortfolioJpaRepo;
import com.jmportfolio.jm.domains.roles.application.RoleService;
import com.jmportfolio.jm.domains.users.client.dto.RegisterUserDto;
import com.jmportfolio.jm.domains.users.client.dto.UpdateUserProfileDto;
import com.jmportfolio.jm.domains.users.client.dto.UserPortfolioSummaryDto;
import com.jmportfolio.jm.domains.users.client.dto.UserProfileDto;
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

        return buildProfileDto(username, user);
    }

    @Transactional
    public UserProfileDto updateProfileByUsername(String username, UpdateUserProfileDto dto) {
        if (dto == null) {
            dto = new UpdateUserProfileDto();
        }

        UserJpaEntity user = userJpaRepo.findByUsernameWithRole(username)
                .orElseThrow(() -> new ApplicationException("User not found", "USER_NOT_FOUND"));

        boolean hasLocalPassword = user.getPassword() != null && !user.getPassword().isBlank();
        boolean wantsEmailChange = dto.getEmail() != null
                && !dto.getEmail().isBlank()
                && !dto.getEmail().trim().equalsIgnoreCase(user.getEmail());
        boolean wantsPasswordChange = dto.getNewPassword() != null && !dto.getNewPassword().isBlank();

        if (!hasLocalPassword && (wantsEmailChange || wantsPasswordChange)) {
            throw new ApplicationException(
                    "Email and password cannot be changed for Google accounts",
                    "GOOGLE_ACCOUNT_LOCKED");
        }

        if (wantsEmailChange) {
            String newEmail = dto.getEmail().trim();
            userJpaRepo.findByEmail(newEmail).ifPresent(existingUser -> {
                if (!existingUser.getId().equals(user.getId())) {
                    throw new ApplicationException("Email already in use", "EMAIL_IN_USE");
                }
            });
            user.setEmail(newEmail);
        }

        if (wantsPasswordChange) {
            if (dto.getCurrentPassword() == null
                    || !bCryptPasswordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
                throw new ApplicationException("Current password is not valid", "INVALID_CURRENT_PASSWORD");
            }
            user.setPassword(bCryptPasswordEncoder.encode(dto.getNewPassword()));
        }

        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl().isBlank() ? null : dto.getAvatarUrl());
        }

        UserJpaEntity savedUser = userJpaRepo.save(user);
        return buildProfileDto(username, savedUser);
    }

    private UserProfileDto buildProfileDto(String username, UserJpaEntity user) {
        PortfolioJpaEntity latestPortfolio = portfolioJpaRepo
                .findFirstByUserJpaEntityUsernameOrderByCreatedDesc(username)
                .orElse(null);

        UserPortfolioSummaryDto portfolio = null;
        if (latestPortfolio != null) {
            portfolio = new UserPortfolioSummaryDto(
                    latestPortfolio.getId(),
                    latestPortfolio.getTitle(),
                    latestPortfolio.getSlug(),
                    latestPortfolio.getTags() == null ? List.of() : latestPortfolio.getTags(),
                    latestPortfolio.isPublic(),
                    latestPortfolio.isShowHomeSnapshot(),
                    latestPortfolio.isShowInExplore());
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
