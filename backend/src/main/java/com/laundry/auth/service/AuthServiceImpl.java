package com.laundry.auth.service;

import com.laundry.auth.dto.AuthResponseDTO;
import com.laundry.auth.dto.LoginRequestDTO;
import com.laundry.auth.dto.RegisterRequestDTO;
import com.laundry.entity.RefreshToken;
import com.laundry.entity.User;
import com.laundry.repository.RefreshTokenRepository;
import com.laundry.repository.UserRepository;
import com.laundry.security.jwt.JwtUtils;
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

    @Override
    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO request) {
        if (!request.getPhone().matches("^(0[3|5|7|8|9])[0-9]{8}$")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ.");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại đã được đăng ký.");
        }
        
        User user = User.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(null) // No email concatenated
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
                .phone(user.getPhone())
                .role(user.getRole())
                .build();
    }

    @Override
    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getPhone(), request.getPassword()));
                
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        
        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
                
        RefreshToken refreshToken = createRefreshToken(user);
                
        return AuthResponseDTO.builder()
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
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
                .phone(user.getPhone())
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
        String accessToken = jwtUtils.generateJwtTokenFromUsername(user.getPhone(), user.getId(), user.getRole().name());
        
        return AuthResponseDTO.builder()
                .accessToken(accessToken)
                .refreshToken(requestRefreshToken)
                .userId(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
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
}