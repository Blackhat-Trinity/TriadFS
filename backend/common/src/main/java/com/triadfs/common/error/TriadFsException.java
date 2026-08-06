package com.triadfs.common.error;

public class TriadFsException extends RuntimeException {
    private final String code;

    public TriadFsException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}