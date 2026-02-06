package com.jmportfolio.jm.testRest;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConf {

    // Configurazione CORS per Angular
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:4200")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowCredentials(true);
            }
        };
    }

    // Configurazione Security
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // disabilita CSRF per REST API
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/test/**").permitAll() // questa rotta senza login
                        .anyRequest().authenticated() // tutte le altre richiedono login
                )
                .cors(cors -> {}); // abilita CORS con configurazione WebMvcConfigurer

        return http.build();
    }
}
