package com.triadfs.api.config;

import com.triadfs.metadata.model.RoleEntity;
import com.triadfs.metadata.model.UserEntity;
import com.triadfs.metadata.repository.RoleRepository;
import com.triadfs.metadata.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.UUID;

@Configuration
public class SeedDataConfig {
    @Bean
    CommandLineRunner seed(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            RoleEntity adminRole = roleRepository.findByName("ROLE_ADMIN").orElseGet(() -> {
                RoleEntity role = new RoleEntity();
                role.setId(UUID.randomUUID());
                role.setName("ROLE_ADMIN");
                role.setDescription("System administrator");
                return roleRepository.save(role);
            });
            roleRepository.findByName("ROLE_RESEARCHER").orElseGet(() -> {
                RoleEntity role = new RoleEntity();
                role.setId(UUID.randomUUID());
                role.setName("ROLE_RESEARCHER");
                role.setDescription("Research operator");
                return roleRepository.save(role);
            });
            roleRepository.findByName("ROLE_VIEWER").orElseGet(() -> {
                RoleEntity role = new RoleEntity();
                role.setId(UUID.randomUUID());
                role.setName("ROLE_VIEWER");
                role.setDescription("Read only");
                return roleRepository.save(role);
            });

            userRepository.findByEmailIgnoreCase("admin@triadfs.local").orElseGet(() -> {
                UserEntity user = new UserEntity();
                user.setId(UUID.randomUUID());
                user.setEmail("admin@triadfs.local");
                user.setDisplayName("TriadFS Admin");
                user.setPasswordHash(passwordEncoder.encode("admin123"));
                user.setStatus("ACTIVE");
                user.setCreatedAt(Instant.now());
                user.setUpdatedAt(Instant.now());
                user.getRoles().add(adminRole);
                return userRepository.save(user);
            });
        };
    }
}