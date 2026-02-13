package com.jmportfolio.jm.core.exceptions;

import java.security.SignatureException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

import org.apache.catalina.connector.ClientAbortException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.HttpClientErrorException.Forbidden;
import org.springframework.web.client.HttpClientErrorException.Unauthorized;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import jakarta.validation.ConstraintViolationException;

@ControllerAdvice
@Slf4j
class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(value = { ResponseStatusException.class })
    public ResponseEntity<Object> handleNotFoundException(ResponseStatusException ex) {
        log.error(ex.getMessage(), ex);
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getReason(), BaseErrorCode.DEFAULT),
                ex.getStatusCode());
    }

    @ExceptionHandler(value = { NoSuchElementException.class })
    public ResponseEntity<Object> handleNoSuchElementException(NoSuchElementException ex) {
        log.error("NoSuchElementException Exception: {}", ex);
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.NOT_FOUND),
                HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(value = { Unauthorized.class })
    public ResponseEntity<Object> handleUnauthorizedException(Unauthorized ex) {
        log.error("Unauthorized Exception: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.AUTH_FAIL),
                HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(value = { AccessDeniedException.class })
    public ResponseEntity<Object> handleAccessDeniedExceptionException(AccessDeniedException ex) {
        log.error("AccessDeniedException Exception: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.AUTH_FAIL),
                HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(value = { Forbidden.class })
    public ResponseEntity<Object> handleForbiddenException(Forbidden ex) {
        log.error("Forbidden Exception: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.FORBIDDEN),
                HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<Object> handleApplicationException(ApplicationException ex) {
        log.error("Application Exception: {}", ex.getMessage());

        return new ResponseEntity<>(
                new ExceptionResponseDto(
                        ex.getMessage(),
                        ex.getCode(),
                        ex.getParams()),
                ex.getHttpStatus());
    }

    @ExceptionHandler(value = { SignatureException.class })
    public ResponseEntity<Object> handleSignatureException(SignatureException ex) {
        log.error("Signature Exception: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.AUTH_FAIL),
                HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(value = { InternalAuthenticationServiceException.class })
    public ResponseEntity<Object> handleInternalAuthenticationServiceException(
            InternalAuthenticationServiceException ex) {
        log.error("InternalAuthenticationServiceException: Message: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.INVALID_CREDENTIAL),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(value = { ConstraintViolationException.class })
    public ResponseEntity<Object> handleValidationException(ConstraintViolationException ex) {
        log.error("Validation Exception: {}", ex.getMessage());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.INVALID_INPUT),
                HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(value = { ClientAbortException.class })
    public ResponseEntity<Object> handleBrokenPipeException(ClientAbortException ex) {
        log.info("broken pipe");
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.DEFAULT),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public final ResponseEntity<Object> handleAllExceptions(Exception ex) {
        log.error(ex.getMessage(), ex);
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.DEFAULT),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Throwable.class)
    public final ResponseEntity<Object> handleAllThrowable(Throwable ex) {
        log.error("Exception: {}", ex.toString());
        StringBuilder sb = new StringBuilder();
        Arrays.stream(ex.getStackTrace()).limit(20).forEach((element) -> {
            sb.append(element.toString() + '\n');
        });
        System.out.println(sb.toString());
        return new ResponseEntity<Object>(
                new ExceptionResponseDto(ex.getMessage(), BaseErrorCode.DEFAULT),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        log.error("Validation Exception: {}", ex.getBindingResult().getAllErrors().toString());

        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Validation failed");
        body.put("details", errors);

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        Throwable cause = ex.getCause();

        if (cause instanceof com.fasterxml.jackson.databind.exc.InvalidFormatException invalidFormatEx) {
            Class<?> targetType = invalidFormatEx.getTargetType();

            // If it's an enum, give a user-friendly message
            if (targetType.isEnum()) {
                Object[] accepted = targetType.getEnumConstants();
                String acceptedValues = Arrays.toString(accepted);
                String fieldPath = invalidFormatEx.getPath().stream().map(ref -> {
                    String name = ref.getFieldName();
                    if (name != null)
                        return name;
                    return "[" + ref.getIndex() + "]";
                }).collect(Collectors.joining(".")).replace(".[", "[");

                Map<String, Object> body = new LinkedHashMap<>();
                body.put("status", HttpStatus.BAD_REQUEST.value());
                body.put("error", "Invalid enum value");
                body.put("details", Map.of(fieldPath, "Invalid value '" + invalidFormatEx.getValue()
                        + "'. Accepted values: " + acceptedValues));

                return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
            }
        }

        // Default fallback if it's some other JSON error
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Invalid JSON input");
        body.put("details", ex.getMostSpecificCause().getMessage());

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

}
