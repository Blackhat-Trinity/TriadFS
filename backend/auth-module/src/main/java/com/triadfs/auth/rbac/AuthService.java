package com.triadfs.auth.rbac;

import com.triadfs.auth.jwt.JwtService;
import com.triadfs.metadata.model.RoleEntity;
import com.triadfs.metadata.model.UserEntity;
import com.triadfs.metadata.repository.RoleRepository;
import com.triadfs.metadata.repository.UserRepository;
import com.triadfs.metadata.service.UserAccountService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserAccountService userAccountService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       UserAccountService userAccountService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userAccountService = userAccountService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthTokens register(String email, String password, String displayName) {
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        ensureBaseRoles();
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName);
        user.setStatus("ACTIVE");
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        RoleEntity role = roleRepository.findByName("ROLE_RESEARCHER")
                .orElseThrow(() -> new IllegalStateException("Role seed missing"));
        user.getRoles().add(role);
        userRepository.save(user);

        List<String> authorities = user.getRoles().stream().map(RoleEntity::getName).toList();
        String accessToken = jwtService.issueAccessToken(user.getId().toString(), authorities);
        return new AuthTokens(accessToken, user.getId(), user.getEmail(), user.getDisplayName(), authorities);
    }

    public AuthTokens login(String email, String password) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        List<String> authorities = user.getRoles().stream().map(RoleEntity::getName).toList();
        String accessToken = jwtService.issueAccessToken(user.getId().toString(), authorities);
        return new AuthTokens(accessToken, user.getId(), user.getEmail(), user.getDisplayName(), authorities);
    }

    public UserEntity me(String subjectUserId) {
        return userAccountService.getUserOrThrow(Objects.requireNonNull(UUID.fromString(subjectUserId)));
    }

    private void ensureBaseRoles() {
        upsertRole("ROLE_ADMIN", "System administrator");
        upsertRole("ROLE_RESEARCHER", "Can run transfers and benchmarks");
        upsertRole("ROLE_VIEWER", "Read-only user");
    }

    private void upsertRole(String name, String description) {
        roleRepository.findByName(name).orElseGet(() -> {
            RoleEntity role = new RoleEntity();
            role.setId(UUID.randomUUID());
            role.setName(name);
            role.setDescription(description);
            return roleRepository.save(role);
        });
    }
}
