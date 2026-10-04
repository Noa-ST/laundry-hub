package com.laundry.auth.dto;

import com.laundry.entity.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponseDTO {
    private String accessToken;
    private String refreshToken;
    private Long userId;
    private String fullName;
    private String phone;
    private Role role;
}