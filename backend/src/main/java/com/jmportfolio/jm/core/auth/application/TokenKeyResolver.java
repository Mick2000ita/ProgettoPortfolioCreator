package com.jmportfolio.jm.core.auth.application;

import java.security.Key;
import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Header;
import io.jsonwebtoken.Locator;
import jakarta.annotation.PostConstruct;

@Component
@Slf4j
public class TokenKeyResolver implements Locator<Key> {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        byte[] secretBytes = Base64.getDecoder().decode(secret);
        if (secretBytes.length < 32) {
            log.error("La chiave HS256 deve essere lunga almeno 256 bit (32 byte)");
        }
        secretKey = new SecretKeySpec(secretBytes, "HmacSHA256");
    }

    public SecretKey getSecretKey() {
        return secretKey;
    }

    @Override
    public Key locate(Header header) {
        return getSecretKey();
    }
}
