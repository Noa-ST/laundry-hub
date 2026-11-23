package com.laundry.service;

import com.laundry.entity.Notification;
import com.laundry.repository.NotificationRepository;
import com.laundry.dto.response.NotificationDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    public NotificationService(SimpMessagingTemplate messagingTemplate, NotificationRepository notificationRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Send a notification to a specific user topic
     */
    @Transactional
    public void sendOrderNotification(Long userId, String title, String message, Long orderId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .orderId(orderId)
                .build();
        notification = notificationRepository.save(notification);

        // Gửi đúng DTO giống REST API (có trường read, createdAt)
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", mapToDTO(notification));
    }

    /**
     * Send a general notification to a specific user
     */
    @Transactional
    public void sendNotification(Long userId, String title, String message) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .build();
        notification = notificationRepository.save(notification);

        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", mapToDTO(notification));
    }
    
    /**
     * Send a global notification to all shop owners (e.g. new order arrived)
     */
    @Transactional
    public void sendNewOrderToOwners(Long ownerId, String title, String message, Long orderId) {
        Notification notification = Notification.builder()
                .userId(ownerId)
                .title(title)
                .message(message)
                .orderId(orderId)
                .build();
        notification = notificationRepository.save(notification);

        // Gửi tới đường dẫn riêng của chủ tiệm nhận đơn
        messagingTemplate.convertAndSend("/topic/user/" + ownerId + "/notifications", mapToDTO(notification));
    }

    public Page<NotificationDTO> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToDTO);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long id, Long userId) {
        notificationRepository.findById(id).ifPresent(notif -> {
            if (notif.getUserId().equals(userId)) {
                notif.setRead(true);
                notificationRepository.save(notif);
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    private NotificationDTO mapToDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .orderId(notification.getOrderId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
