package com.laundry.dto.response;

import java.time.LocalDateTime;

public record ChatMessageResponseDTO(
    Long id,
    Long senderId,
    String senderName,
    String content,
    LocalDateTime timestamp,
    boolean isRead
) {}
