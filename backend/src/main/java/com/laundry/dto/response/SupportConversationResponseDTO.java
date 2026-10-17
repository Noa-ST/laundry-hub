package com.laundry.dto.response;

import com.laundry.entity.Role;
import com.laundry.enums.SupportStatus;
import java.time.LocalDateTime;

public record SupportConversationResponseDTO(
    Long id,
    Long userId,
    String userName,
    String userPhone,
    String userEmail,
    String userAvatar,
    Role userRole,
    SupportStatus status,
    String lastMessage,
    LocalDateTime lastMessageAt,
    int unreadAdminCount,
    int unreadUserCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
