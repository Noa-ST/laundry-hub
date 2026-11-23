package com.laundry.service.impl;

import com.laundry.entity.PasswordResetToken;
import com.laundry.entity.User;
import com.laundry.repository.PasswordResetTokenRepository;
import com.laundry.repository.RefreshTokenRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.EmailService;
import com.laundry.service.PasswordResetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    @Override
    @Transactional
    public Map<String, String> requestPasswordReset(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new IllegalArgumentException("Địa chỉ email không đúng định dạng.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Rate limit: Tối đa 3 lần yêu cầu trong 15 phút
            long activeTokens = passwordResetTokenRepository.countByUserAndExpiryDateAfterAndUsedFalse(user, LocalDateTime.now());
            if (activeTokens >= 3) {
                throw new IllegalArgumentException("Bạn đã gửi quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng chờ 15 phút trước khi thử lại.");
            }

            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(token)
                    .expiryDate(LocalDateTime.now().plusMinutes(15))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), token);
        } else {
            // Log for monitoring but don't leak user existence to client
            log.info("Yêu cầu đặt lại mật khẩu cho email không tồn tại trong hệ thống: {}", normalizedEmail);
        }

        // Return a generic success message to prevent user enumeration
        return Map.of("message", "Nếu email của bạn tồn tại trên hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong ít phút.");
    }

    @Override
    @Transactional
    public Map<String, String> resetPassword(String token, String newPassword) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã xác thực đặt lại mật khẩu không hợp lệ.");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có độ dài ít nhất 6 ký tự.");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Liên kết đặt lại mật khẩu không hợp lệ hoặc không tồn tại."));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Liên kết đặt lại mật khẩu này đã được sử dụng.");
        }

        if (LocalDateTime.now().isAfter(resetToken.getExpiryDate())) {
            throw new IllegalArgumentException("Liên kết đặt lại mật khẩu đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu link mới.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
        refreshTokenRepository.revokeAllByUserId(user.getId());

        log.info("Đặt lại mật khẩu thành công cho người dùng ID: {}", user.getId());

        return Map.of("message", "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.");
    }
}
