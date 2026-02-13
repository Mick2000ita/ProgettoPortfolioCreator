package com.jmportfolio.jm.core.exceptions;

import java.util.Map;

import lombok.Getter;
import lombok.NoArgsConstructor;
import net.minidev.json.JSONObject;

@NoArgsConstructor
public class ExceptionResponseDto {

    @Getter
    private String message;
    @Getter
    private String code;
    @Getter
    private JSONObject params;

    /**
     * Application exception.
     *
     * @param message internal message
     * @param code used for translating the message
     */
    public ExceptionResponseDto(String message, String code, Map<String, String> params) {
        this.message = message;
        this.code = code;
        JSONObject paramsObj = null;
        if (params != null) {
            paramsObj = new JSONObject(params);
        }
        this.params = paramsObj;
    }

    /**
     * Application exception.
     *
     * @param message internal message
     * @param code used for translating the message
     */
    public ExceptionResponseDto(String message, String code, JSONObject params) {
        this.message = message;
        this.code = code;
        this.params = params;
    }

    /**
     * Application exception.
     *
     * @param message internal message
     * @param code used for translating the message
     */
    public ExceptionResponseDto(String message, String code) {
        this.message = message;
        this.code = code;
        this.params = null;
    }
}