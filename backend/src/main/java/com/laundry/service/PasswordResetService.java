package com.laundry.service;

import java.util.Map;

public interface PasswordResetService {
    Map<String, String> requestPasswordReset(String email);
    Map<String, String> resetPassword(String token, String newPassword);
}
