package com.laundry.mockuser.dto;

public record MockUserResponseDTO(
        Long id,
        String fullName,
        String phone,
        String email,
        String role,
        String avatarUrl
) {
}
