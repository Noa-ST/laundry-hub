package com.laundry.dto.response;

import com.laundry.entity.Role;
import java.time.LocalDateTime;

public record SupportMessageResponseDTO(
    Long id,
    Long conversationId,
    Long senderId,
    String senderName,
    String senderAvatar,
    Role senderRole,
    String content,
    boolean isRead,
    LocalDateTime createdAt
) {}
