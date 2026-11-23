package com.laundry.service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String recipientName, String resetToken);
}
