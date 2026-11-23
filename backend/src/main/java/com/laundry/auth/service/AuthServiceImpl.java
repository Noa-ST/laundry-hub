package com.laundry.auth.service;

import com.laundry.auth.dto.AuthResponseDTO;
import com.laundry.auth.dto.LoginRequestDTO;
import com.laundry.auth.dto.RegisterRequestDTO;
import com.laundry.entity.RefreshToken;
import com.laundry.entity.Role;
import com.laundry.entity.User;
import com.laundry.repository.RefreshTokenRepository;
import com.laundry.repository.UserRepository;
import com.laundry.security.jwt.JwtUtils;
import com.laundry.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO request) {
        if (request.getRole() != Role.CUSTOMER && request.getRole() != Role.SHOP_OWNER) {
            throw new IllegalArgumentException("Vai trò đăng ký không hợp lệ.");
        }
        if (!request.getPhone().matches("^(0[3|5|7|8|9])[0-9]{8}$")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ.");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại đã được đăng ký.");
        }
        
        String email = null;
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            email = request.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email đã được đăng ký bởi tài khoản khác.");
            }
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();
                
        user = userRepository.save(user);
        
        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getPhone(), user.getId(), user.getRole().name());
        RefreshToken refreshToken = createRefreshToken(user);
        
        return AuthResponseDTO.builder()
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }

    @Override
    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        String identifier = request.getPhone() != null ? request.getPhone().trim() : "";
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, request.getPassword()));
                
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        User user = userRepository.findByPhone(identifier)
                .or(() -> userRepository.findByEmail(identifier.toLowerCase()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
                
        if (user.getIsActive() != null && !user.getIsActive()) {
            throw new IllegalArgumentException("Tài khoản của bạn đã bị khóa hoặc chưa được phê duyệt.");
        }

        String subject = (user.getPhone() != null && !user.getPhone().isEmpty()) ? user.getPhone() : user.getEmail();
        String jwt = jwtUtils.generateJwtTokenFromUsername(subject, user.getId(), user.getRole().name());
        RefreshToken refreshToken = createRefreshToken(user);
                
        return AuthResponseDTO.builder()
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }

    @Override
    public AuthResponseDTO getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
                
        return AuthResponseDTO.builder()
                .accessToken(null)
                .refreshToken(null)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }
    
    @Override
    @Transactional
    public AuthResponseDTO refreshToken(String requestRefreshToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(requestRefreshToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token không tồn tại."));
                
        if (refreshToken.isRevoked()) {
            throw new IllegalArgumentException("Refresh token đã bị thu hồi.");
        }
        if (refreshToken.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(refreshToken);
            throw new IllegalArgumentException("Refresh token đã hết hạn.");
        }
        
        User user = refreshToken.getUser();
        if (user.getIsActive() != null && !user.getIsActive()) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new IllegalArgumentException("Tài khoản của bạn đã bị khóa.");
        }

        // Rotate refresh token
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);
        RefreshToken newRefreshToken = createRefreshToken(user);

        String subject = (user.getPhone() != null && !user.getPhone().isEmpty()) ? user.getPhone() : user.getEmail();
        String accessToken = jwtUtils.generateJwtTokenFromUsername(subject, user.getId(), user.getRole().name());
        
        return AuthResponseDTO.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }
    
    @Override
    @Transactional
    public void logout(String requestRefreshToken) {
        if (requestRefreshToken != null && !requestRefreshToken.isEmpty()) {
            refreshTokenRepository.findByToken(requestRefreshToken).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
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
    
    @Override
    @Transactional
    public AuthResponseDTO updateAvatar(Long userId, String avatarUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
                
        String oldAvatarUrl = user.getAvatarUrl();
        user.setAvatarUrl(avatarUrl);
        user = userRepository.save(user);
        
        if (oldAvatarUrl != null && !oldAvatarUrl.equals(avatarUrl)) {
            cloudinaryService.deleteImageAsync(oldAvatarUrl);
        }
        
        return AuthResponseDTO.builder()
                .accessToken(null)
                .refreshToken(null)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }
}