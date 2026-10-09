package com.laundry.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private Long orderId;
    private boolean isRead;
    private LocalDateTime createdAt;
}
