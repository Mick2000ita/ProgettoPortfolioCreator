package com.jmportfolio.jm.core.exceptions;


import java.util.Map;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import net.minidev.json.JSONObject;

public class ApplicationException extends RuntimeException {

    @Getter
    private final String code;

    @Getter
    private final JSONObject params;

    @Getter
    private final HttpStatus httpStatus;

    public ApplicationException(String message, String code) {
        this(message, code, null, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public ApplicationException(String message, String code, Map<String, String> params) {
        this(message, code, new JSONObject(params), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public ApplicationException(String message, String code, HttpStatus status) {
        this(message, code, null, status);
    }

    public ApplicationException(
            String message,
            String code,
            JSONObject params,
            HttpStatus status
    ) {
        super(message); // <-- CLEAN MESSAGE
        this.code = code;
        this.params = params;
        this.httpStatus = status;
    }
}
