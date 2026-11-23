package com.laundry.service;

import com.laundry.auth.dto.AuthResponseDTO;

public interface GoogleAuthService {
    AuthResponseDTO loginWithGoogle(String credential);
}
