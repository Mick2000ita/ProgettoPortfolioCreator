package com.jmportfolio.jm.core.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import lombok.Getter;
import net.minidev.json.JSONObject;

public class ApplicationException extends HttpClientErrorException {

    @Getter
    private String code;

    @Getter
    private JSONObject params;

    /**
     * exception.
     *
     * @param message internal message
     * @param code used for translate the message
     */
    public ApplicationException(String message, String code, Map<String, String> params) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
        this.code = code;
        JSONObject paramsObj = null;
        if (params != null) {
            paramsObj = new JSONObject(params);
        }
        this.params = paramsObj;
    }

    /**
     * exception.
     *
     * @param message internal message
     * @param code used for translate the message
     */
    public ApplicationException(String message, String code, JSONObject params) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
        this.code = code;
        JSONObject paramsObj = null;
        if (params != null) {
            paramsObj = new JSONObject(params);
        }
        this.params = paramsObj;
    }

    /**
     * exception.
     *
     * @param message internal message
     * @param code used for translate the message
     */
    public ApplicationException(String message, String code) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
        this.code = code;
        this.params = null;
    }

    public ApplicationException(String message, String code, HttpStatus httpStatus) {
        super(httpStatus, message);
        this.code = code;
        this.params = null;
    }
}
