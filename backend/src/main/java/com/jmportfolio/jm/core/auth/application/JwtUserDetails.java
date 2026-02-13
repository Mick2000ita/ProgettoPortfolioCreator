package com.jmportfolio.jm.core.auth.application;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;
import com.jmportfolio.jm.core.exceptions.ApplicationException;
import com.jmportfolio.jm.domains.users.infrastructure.entities.UserJpaEntity;
import com.jmportfolio.jm.domains.users.infrastructure.repo.UserJpaRepo;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class JwtUserDetails implements UserDetailsService {

    @Autowired
    private UserJpaRepo userRepository;

    @Autowired
    @Lazy
    private AuthenticationManager authenticationManager;

    @Override
    public ExtendedAuthUser loadUserByUsername(String username) {
        UserJpaEntity user = userRepository.findByUsername(username).orElseThrow(
                () -> new ApplicationException("User not Found", "User not found"));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        // Non-superadmin users must have a role assigned
        if (user.getRole() == null) {
            log.error("Non-superadmin user {} has no role assigned", username);
            throw new ApplicationException("User has no role assigned", "User has no role assigned");
        }

        // Add the SHOPFLOOR role to all non-superadmin users
        authorities.add(new SimpleGrantedAuthority("ROLE_"));

        return new ExtendedAuthUser(
                user.getUsername(),
                user.getPassword(),
                true,
                true,
                true,
                true,
                authorities);
    }

    public void authenticate(String username, String password) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (DisabledException e) {
            log.error("User disabled");
            throw new ApplicationException("User disabled", "User disabled");
        } catch (BadCredentialsException e) {
            log.error("Invalid Credentials");
            throw new ApplicationException("Invalid Credentials", "Invalid Credentials");
        }
    }
}
