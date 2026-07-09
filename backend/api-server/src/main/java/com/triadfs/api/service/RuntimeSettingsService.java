package com.triadfs.api.service;

import com.triadfs.api.dto.SettingsRequests;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RuntimeSettingsService {
    private final Map<String, Object> strategySettings = new ConcurrentHashMap<>(Map.of(
            "defaultChunkSize", 8192,
            "encryptionEnabled", false,
            "compressionEnabled", true
    ));

    private final Map<String, Object> securitySettings = new ConcurrentHashMap<>(Map.of(
            "checksumValidation", true,
            "aesOptional", true
    ));

    public Map<String, Object> strategySettings() {
        return Map.copyOf(strategySettings);
    }

    public Map<String, Object> securitySettings() {
        return Map.copyOf(securitySettings);
    }

    public Map<String, Object> updateStrategy(SettingsRequests.StrategyConfigRequest request) {
        strategySettings.put("defaultChunkSize", request.defaultChunkSize());
        strategySettings.put("encryptionEnabled", request.encryptionEnabled());
        strategySettings.put("compressionEnabled", request.compressionEnabled());
        return strategySettings();
    }

    public Map<String, Object> updateSecurity(SettingsRequests.SecuritySettingsRequest request) {
        securitySettings.put("checksumValidation", request.checksumValidation());
        securitySettings.put("aesOptional", request.aesOptional());
        return securitySettings();
    }
}