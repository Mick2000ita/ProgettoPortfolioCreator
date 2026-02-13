package com.jmportfolio.jm.core.exceptions;

public class BaseErrorCode {
    // DEFAULT
    public static final String DEFAULT = "DEFAULT";
    public static final String INVALID_INPUT = "INVALID_INPUT";
    public static final String CONNECTION_ERROR = "CONNECTION_ERROR";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String PARSE_ERROR = "PARSE_ERROR";

        // AUTH
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String AUTH_FAIL = "AUTH_FAIL";
    public static final String INVALID_CREDENTIAL = "INVALID_CREDENTIAL";
    public static final String SIGNUP_FAIL = "SIGNUP_FAIL";
    public static final String REFRESH_FAIL = "REFRESH_FAIL";
    public static final String INVALID_REFRESH_TOKEN = "INVALID_REFRESH_TOKEN";
    public static final String TOKEN_NOT_FOUND = "TOKEN_NOT_FOUND";
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
    public static final String TOKEN_ALREADY_USED = "TOKEN_ALREADY_USED";
    public static final String EMAIL_FAILED = "EMAIL_FAILED";
    public static final String EMAIL_NOT_FOUND = "EMAIL_NOT_FOUND";
}
