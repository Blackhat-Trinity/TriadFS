package com.triadfs.api.config;

import com.triadfs.metadata.model.RoleEntity;
import com.triadfs.metadata.model.UserEntity;
import com.triadfs.metadata.repository.RoleRepository;
import com.triadfs.metadata.repository.UserRepository;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Component
@Profile("desktop")
public class DesktopBootstrapInitializer implements InitializingBean {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;
    private final boolean bootstrapEnabled;
    private final String bootstrapEmail;
    private final String bootstrapPassword;
    private final String bootstrapDisplayName;

    public DesktopBootstrapInitializer(UserRepository userRepository,
                                       RoleRepository roleRepository,
                                       PasswordEncoder passwordEncoder,
                                       TransactionTemplate transactionTemplate,
                                       @Value("${triadfs.desktop.bootstrap.enabled:true}") boolean bootstrapEnabled,
                                       @Value("${triadfs.desktop.bootstrap.email:desktop@local.triadfs}") String bootstrapEmail,
                                       @Value("${triadfs.desktop.bootstrap.password:triadfs-desktop}") String bootstrapPassword,
                                       @Value("${triadfs.desktop.bootstrap.display-name:TriadFS Desktop}") String bootstrapDisplayName) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = transactionTemplate;
        this.bootstrapEnabled = bootstrapEnabled;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
        this.bootstrapDisplayName = bootstrapDisplayName;
    }

    @Override
    public void afterPropertiesSet() {
        if (!bootstrapEnabled) {
            return;
        }

        transactionTemplate.executeWithoutResult(status -> {
            RoleEntity adminRole = ensureRole("ROLE_ADMIN", "System administrator");
            RoleEntity researcherRole = ensureRole("ROLE_RESEARCHER", "Can run transfers and benchmarks");
            ensureRole("ROLE_VIEWER", "Read-only user");

            Instant now = Instant.now();
            UserEntity user = userRepository.findByEmailIgnoreCase(bootstrapEmail).orElseGet(() -> {
                UserEntity entity = new UserEntity();
                entity.setId(UUID.randomUUID());
                entity.setEmail(bootstrapEmail);
                entity.setCreatedAt(now);
                return entity;
            });

            user.setPasswordHash(passwordEncoder.encode(bootstrapPassword));
            user.setDisplayName(bootstrapDisplayName);
            user.setStatus("ACTIVE");
            user.setUpdatedAt(now);

            Set<RoleEntity> roles = new LinkedHashSet<>();
            roles.add(adminRole);
            roles.add(researcherRole);
            user.setRoles(roles);
            userRepository.save(user);
        });
    }

    private RoleEntity ensureRole(String name, String description) {
        return roleRepository.findByName(name).orElseGet(() -> {
            RoleEntity role = new RoleEntity();
            role.setId(UUID.randomUUID());
            role.setName(name);
            role.setDescription(description);
            return roleRepository.save(role);
        });
    }
}
