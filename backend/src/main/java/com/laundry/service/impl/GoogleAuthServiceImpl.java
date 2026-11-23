package com.laundry.service.impl;

import com.laundry.auth.dto.AuthResponseDTO;
import com.laundry.entity.RefreshToken;
import com.laundry.entity.Role;
import com.laundry.entity.User;
import com.laundry.repository.RefreshTokenRepository;
import com.laundry.repository.UserRepository;
import com.laundry.security.jwt.JwtUtils;
import com.laundry.service.GoogleAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthServiceImpl implements GoogleAuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RestTemplate restTemplate = new RestTemplate();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${app.google-client-id:}")
    private String configuredClientId;

    @Override
    @Transactional
    public AuthResponseDTO loginWithGoogle(String credential) {
        if (credential == null || credential.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã xác thực Google không được để trống.");
        }

        // Gọi endpoint chính thức của Google để xác minh ID Token
        String tokenInfoUrl = UriComponentsBuilder
                .fromHttpUrl("https://oauth2.googleapis.com/tokeninfo")
                .queryParam("id_token", credential.trim())
                .toUriString();

        Map<String, Object> tokenInfo;
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    tokenInfoUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<>() {}
            );
            tokenInfo = response.getBody();
        } catch (Exception e) {
            log.error("Xác minh Google ID Token thất bại: {}", e.getMessage());
            throw new IllegalArgumentException("Mã xác thực Google không hợp lệ hoặc đã hết hạn.");
        }

        if (tokenInfo == null || !tokenInfo.containsKey("email")) {
            throw new IllegalArgumentException("Không thể trích xuất thông tin tài khoản từ Google.");
        }

        // Bắt buộc cấu hình Google Client ID và xác minh audience
        if (configuredClientId == null || configuredClientId.trim().isEmpty()) {
            log.error("Google Client ID chưa được cấu hình (app.google-client-id).");
            throw new IllegalArgumentException("Đăng nhập Google chưa được cấu hình trên hệ thống.");
        }
        String aud = (String) tokenInfo.get("aud");
        if (!configuredClientId.trim().equals(aud)) {
            log.warn("Audience mismatch: expected {} but got {}", configuredClientId, aud);
            throw new IllegalArgumentException("Google Client ID không khớp.");
        }

        // Bắt buộc email đã được Google xác minh
        Object emailVerifiedObj = tokenInfo.get("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(emailVerifiedObj)
                || "true".equalsIgnoreCase(String.valueOf(emailVerifiedObj));
        if (!emailVerified) {
            throw new IllegalArgumentException("Tài khoản Google chưa xác minh email.");
        }

        String email = ((String) tokenInfo.get("email")).toLowerCase().trim();
        String name = (String) tokenInfo.getOrDefault("name", "Người dùng Google");
        String picture = (String) tokenInfo.get("picture");

        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        User user;

        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getIsActive() != null && !user.getIsActive()) {
                throw new IllegalArgumentException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
            }
            if ((user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty()) && picture != null) {
                user.setAvatarUrl(picture);
                userRepository.save(user);
            }
        } else {
            // Tạo tài khoản mới cho người dùng Google
            String uniquePhone = generateUniquePhone();
            user = User.builder()
                    .email(email)
                    .fullName(name)
                    .phone(uniquePhone)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .avatarUrl(picture)
                    .role(Role.CUSTOMER)
                    .isActive(true)
                    .build();
            user = userRepository.save(user);
            log.info("Đã tạo tài khoản mới từ Google cho email: {}", email);
        }

        String identifier = user.getPhone() != null && !user.getPhone().isEmpty() ? user.getPhone() : user.getEmail();
        String accessToken = jwtUtils.generateJwtTokenFromUsername(identifier, user.getId(), user.getRole().name());
        RefreshToken refreshToken = createRefreshToken(user);

        return AuthResponseDTO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }

    private String generateUniquePhone() {
        for (int i = 0; i < 20; i++) {
            // Tạo số điện thoại bắt đầu bằng 09 kèm 8 chữ số ngẫu nhiên
            String phone = "09" + String.format("%08d", SECURE_RANDOM.nextInt(100000000));
            if (!userRepository.existsByPhone(phone)) {
                return phone;
            }
        }
        return "09" + System.currentTimeMillis() % 100000000;
    }

    private RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(jwtUtils.generateRefreshToken())
                .expiryDate(Instant.now().plus(14, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        return refreshTokenRepository.save(refreshToken);
    }
}
