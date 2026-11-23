package com.laundry.auth.controller;

import com.laundry.auth.dto.AuthResponseDTO;
import com.laundry.auth.dto.LoginRequestDTO;
import com.laundry.auth.dto.RefreshTokenRequestDTO;
import com.laundry.auth.dto.RegisterRequestDTO;
import com.laundry.dto.request.UpdateAvatarRequestDTO;
import com.laundry.auth.service.AuthService;
import com.laundry.dto.response.ApiResponse;
import com.laundry.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final com.laundry.service.PasswordResetService passwordResetService;
    private final com.laundry.service.GoogleAuthService googleAuthService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> register(@Valid @RequestBody RegisterRequestDTO request) {
        AuthResponseDTO response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> login(@Valid @RequestBody LoginRequestDTO request) {
        AuthResponseDTO response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> googleLogin(@RequestBody java.util.Map<String, String> request) {
        String credential = request.get("credential");
        if (credential == null || credential.trim().isEmpty()) {
            credential = request.get("idToken");
        }
        AuthResponseDTO response = googleAuthService.loginWithGoogle(credential);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập Google thành công", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> forgotPassword(@RequestBody java.util.Map<String, String> request) {
        String email = request.get("email");
        java.util.Map<String, String> result = passwordResetService.requestPasswordReset(email);
        return ResponseEntity.ok(ApiResponse.success(result.get("message"), result));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> resetPassword(@RequestBody java.util.Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        java.util.Map<String, String> result = passwordResetService.resetPassword(token, newPassword);
        return ResponseEntity.ok(ApiResponse.success(result.get("message"), result));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> getMe() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        AuthResponseDTO response = authService.getMe(currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", response));
    }
    
    @PutMapping("/me/avatar")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> updateAvatar(@Valid @RequestBody UpdateAvatarRequestDTO request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        AuthResponseDTO response = authService.updateAvatar(currentUserId, request.getAvatarUrl());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ảnh đại diện thành công", response));
    }
    
    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO request) {
        AuthResponseDTO response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Refresh token thành công", response));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequestDTO request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công", null));
    }
}