package com.jmportfolio.jm.core.auth.application;



import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.jmportfolio.jm.core.auth.config.Roles;
import com.jmportfolio.jm.core.auth.model.ExtendedAuthUser;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.MacAlgorithm;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TokenUtil {

    static final String CLAIM_KEY_REFRESH = "isRefreshToken";
    static final String CLAIM_ROLES = "roles";
    static final String CLAIM_KEY_REMEMBER_ME = "rememberMe";

    @Value("${jwt.expiration-access-token:3600}") // 1 hour
    private Long expirationAccessToken;

    @Value("${jwt.expiration-refresh-token:604800}") // 7 days
    private Long expirationRefreshToken;

    @Value("${jwt.expiration-remember-me-refresh-token:2592000}") // 30 days
    private Long expirationRememberMeRefreshToken;

    @Autowired
    private TokenKeyResolver tokenKeyResolver;

    /**
     * Returns the username for a sysuser, the deviceId for devices.
     *
     * @param token
     * @return the username for a sysuser, the deviceId for devices
     */
    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public List<SimpleGrantedAuthority> getRolesFromToken(String token) {
        Object rolesObj = getAllClaimsFromToken(token).get(CLAIM_ROLES);
        if (rolesObj instanceof String rolesString) {
            // Roles stored as comma-separated string
            return Arrays.stream(rolesString.split(",")).map(String::trim)
                    .filter(role -> !role.isEmpty()).map(SimpleGrantedAuthority::new).toList();
        } else if (rolesObj instanceof List<?> rolesList) {
            // Roles stored as a list
            return rolesList.stream().map(Object::toString).map(SimpleGrantedAuthority::new)
                    .toList();
        }
        return Collections.emptyList();
    }

    // retrieve refresh from jwt token
    public String getRefreshFromToken(String token) {
        return String.valueOf(getAllClaimsFromToken(token).get(CLAIM_KEY_REFRESH));
    }

    // retrieve expiration date from jwt token
    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    // retrieve audience from jwt token
    public Set<String> getAudienceFromToken(String token) {
        return getClaimFromToken(token, Claims::getAudience);
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Returns new user token.
     *
     * @param userDetails
     * @return new user token
     */
    public String generateInternalToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ROLES, Roles.ROLE_PREFIX);
        return doGenerateUserToken(claims, username, expirationAccessToken);
    }

    /**
     * Returns new user token.
     *
     * @param userDetails
     * @return new user token
     */
    public String generateUserToken(ExtendedAuthUser userDetails) {
        Map<String, Object> claims = new HashMap<>();

        return doGenerateUserToken(claims, userDetails.getUsername(), expirationAccessToken);
    }

    public String generateUserToken(ExtendedAuthUser userDetails, String tenantCode,
            Optional<Long> expiration) {
        Map<String, Object> claims = new HashMap<>();
        if (expiration.isEmpty()) {
            return doGenerateUserToken(claims, userDetails.getUsername(), expirationAccessToken);
        } else {
            return doGenerateUserToken(claims, userDetails.getUsername(), expiration.get());
        }
    }

    /**
     * Return a refreshed token.
     *
     * @param token to be refreshed
     * @return a refreshed token
     */
    // TODO: can be simple than that, it does not require all claims
    public String refreshUserToken(String token) {
        String refreshedToken;
        try {
            final Claims claims = getAllClaimsFromToken(token);

            // Copia i claims in una nuova mappa modificabile
            Map<String, Object> claimsMap = new HashMap<>(claims);
            claimsMap.put(CLAIM_KEY_REFRESH, true); // aggiungi il flag di refresh

            refreshedToken =
                    doGenerateUserToken(claimsMap, claims.getSubject(), expirationRefreshToken);
        } catch (Exception e) {
            e.printStackTrace();
            refreshedToken = null;
        }
        return refreshedToken;
    }

    /**
     * Return a refreshed token expired.
     *
     * @param token to be refreshed
     * @return a refreshed token
     */
    public String refreshUserTokenExpired(String token) {
        String refreshedToken;
        try {
            final Claims claims = getAllClaimsFromToken(token);

            // Copia i claims in una nuova mappa modificabile
            Map<String, Object> claimsMap = new HashMap<>(claims);
            claimsMap.put(CLAIM_KEY_REFRESH, true); // aggiungi il flag di refresh

            refreshedToken = doGenerateUserToken(claimsMap, claims.getSubject(), -1L);
        } catch (Exception e) {
            refreshedToken = null;
        }
        return refreshedToken;
    }

    /**
     * Return true if the token can be refreshed, false otherwise.
     *
     * @param token
     * @return true if the token can be refreshed, false otherwise
     */
    public Boolean canTokenBeRefreshed(String token) {
        return (!isTokenExpired(token) && isRefreshToken(token));
    }

    /**
     * Return true if the token is valid, false otherwise.
     *
     * @param token
     * @param userDetails
     * @return true if the token is valid, false otherwise
     */
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        log.debug("get username from token {}", username);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Return true if the token is valid, false otherwise.
     *
     * @param token
     * @return true if the token is valid, false otherwise
     */
    public Boolean validateToken(String token) {
        final String userId = getUsernameFromToken(token);
        return userId != null && !isTokenExpired(token);
    }

    private String doGenerateUserToken(Map<String, Object> claims, String subject,
            Long expiration) {
        Date expirationDate = new Date(System.currentTimeMillis() + expiration * 1000);
        return doGenerateToken(claims, subject, expirationDate, tokenKeyResolver.getSecretKey());
    }

    private static final MacAlgorithm JWT_SIGN_ALGO = Jwts.SIG.HS256;

    // while creating the token -
    // 1. Define claims of the token, like Issuer, Expiration, Subject, and the
    // ID
    // 2. Sign the JWT using the HS256 algorithm and secret key.
    // 3. According to JWS Compact
    // Serialization(https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#section-3.1)
    // compaction of the JWT to a URL-safe string
    // TODO: change with RSA256?
    private String doGenerateToken(Map<String, Object> claims, String subject, Date expirationDate,
            SecretKey secret) {
        return Jwts.builder().claims(claims).subject(subject)
                .issuedAt(new Date(System.currentTimeMillis())).expiration(expirationDate)
                .signWith(secret, JWT_SIGN_ALGO) // L'algoritmo viene dedotto dalla chiave
                .compact();
    }

    // for retrieveing any information from token we will need the secret key
    public Claims getAllClaimsFromToken(String token) {
        SecretKey secret = tokenKeyResolver.getSecretKey();
        return Jwts.parser().verifyWith(secret).build().parseSignedClaims(token).getPayload();
    }

    public Boolean isRefreshToken(String token) {
        final String refresh = getRefreshFromToken(token);
        return (refresh != null && refresh.equals("true"));
    }

    public Boolean isRememberMeToken(String token) {
        Object rememberMe = getAllClaimsFromToken(token).get(CLAIM_KEY_REMEMBER_ME);
        if (rememberMe instanceof Boolean rememberMeFlag) {
            return rememberMeFlag;
        }
        return "true".equals(String.valueOf(rememberMe));
    }

    public String generateRefreshToken(ExtendedAuthUser userDetails, boolean rememberMe) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_KEY_REFRESH, true);
        claims.put(CLAIM_KEY_REMEMBER_ME, rememberMe);

        Long expiration = rememberMe ? expirationRememberMeRefreshToken : expirationRefreshToken;
        return doGenerateUserToken(claims, userDetails.getUsername(), expiration);
    }

    /**
     * Return true if the token is expired, false otherwise.
     *
     * @param token
     * @return true if the token is expired, false otherwise
     */
    public Boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }
}
