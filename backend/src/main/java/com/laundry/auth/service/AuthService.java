package com.laundry.auth.service;

import com.laundry.auth.dto.AuthResponseDTO;
import com.laundry.auth.dto.LoginRequestDTO;
import com.laundry.auth.dto.RegisterRequestDTO;

public interface AuthService {
    AuthResponseDTO register(RegisterRequestDTO request);
    AuthResponseDTO login(LoginRequestDTO request);
    AuthResponseDTO getMe(Long userId);
    AuthResponseDTO refreshToken(String refreshToken);
    void logout(String refreshToken);
}