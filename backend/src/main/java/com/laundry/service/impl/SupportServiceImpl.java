package com.laundry.service.impl;

import com.laundry.dto.request.SupportMessageRequestDTO;
import com.laundry.dto.response.SupportConversationResponseDTO;
import com.laundry.dto.response.SupportMessageResponseDTO;
import com.laundry.entity.Role;
import com.laundry.entity.SupportConversation;
import com.laundry.entity.SupportMessage;
import com.laundry.entity.User;
import com.laundry.enums.SupportStatus;
import com.laundry.repository.SupportConversationRepository;
import com.laundry.repository.SupportMessageRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.SupportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportServiceImpl implements SupportService {

    private final SupportConversationRepository conversationRepository;
    private final SupportMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public SupportConversationResponseDTO getOrCreateMyConversation(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));

        SupportConversation conv = conversationRepository.findByUserId(userId)
                .orElseGet(() -> {
                    SupportConversation newConv = SupportConversation.builder()
                            .user(user)
                            .status(SupportStatus.OPEN)
                            .lastMessage("Cuộc trò chuyện đã được tạo")
                            .lastMessageAt(LocalDateTime.now())
                            .unreadAdminCount(0)
                            .unreadUserCount(0)
                            .build();
                    return conversationRepository.save(newConv);
                });

        return mapToConversationDTO(conv);
    }

    @Override
    @Transactional
    public List<SupportMessageResponseDTO> getMyMessages(Long userId) {
        SupportConversation conv = conversationRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Chưa có phiên hỗ trợ nào"));

        // Reset unread count for user
        if (conv.getUnreadUserCount() > 0) {
            conv.setUnreadUserCount(0);
            conversationRepository.save(conv);
        }

        List<SupportMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId());
        return messages.stream().map(this::mapToMessageDTO).toList();
    }

    @Override
    @Transactional
    public SupportMessageResponseDTO sendMessageFromUser(Long userId, SupportMessageRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));

        SupportConversation conv = conversationRepository.findByUserId(userId)
                .orElseGet(() -> {
                    SupportConversation newConv = SupportConversation.builder()
                            .user(user)
                            .status(SupportStatus.OPEN)
                            .unreadAdminCount(0)
                            .unreadUserCount(0)
                            .build();
                    return conversationRepository.save(newConv);
                });

        SupportMessage msg = SupportMessage.builder()
                .conversation(conv)
                .sender(user)
                .senderRole(user.getRole())
                .content(request.getContent().trim())
                .isRead(false)
                .build();
        msg = messageRepository.save(msg);

        // Update conversation summary
        conv.setLastMessage(msg.getContent());
        conv.setLastMessageAt(LocalDateTime.now());
        conv.setUnreadAdminCount(conv.getUnreadAdminCount() + 1);
        if (conv.getStatus() == SupportStatus.RESOLVED || conv.getStatus() == SupportStatus.CLOSED) {
            conv.setStatus(SupportStatus.OPEN);
        }
        conv = conversationRepository.save(conv);

        SupportMessageResponseDTO msgDTO = mapToMessageDTO(msg);
        SupportConversationResponseDTO convDTO = mapToConversationDTO(conv);

        // Broadcast to conversation topic for both participants
        messagingTemplate.convertAndSend("/topic/support/" + conv.getId(), msgDTO);

        // Notify Admin support channel
        messagingTemplate.convertAndSend("/topic/admin/support", convDTO);

        return msgDTO;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SupportConversationResponseDTO> getAdminConversations(SupportStatus status, Pageable pageable) {
        Page<SupportConversation> page;
        if (status != null) {
            page = conversationRepository.findByStatusOrderByLastMessageAtDesc(status, pageable);
        } else {
            page = conversationRepository.findAllByOrderByLastMessageAtDesc(pageable);
        }
        return page.map(this::mapToConversationDTO);
    }

    @Override
    @Transactional
    public List<SupportMessageResponseDTO> getAdminConversationMessages(Long conversationId) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc trò chuyện hỗ trợ"));

        // Reset unread count for admin
        if (conv.getUnreadAdminCount() > 0) {
            conv.setUnreadAdminCount(0);
            conversationRepository.save(conv);
            messagingTemplate.convertAndSend("/topic/admin/support", mapToConversationDTO(conv));
        }

        List<SupportMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream().map(this::mapToMessageDTO).toList();
    }

    @Override
    @Transactional
    public SupportMessageResponseDTO sendMessageFromAdmin(Long adminId, Long conversationId, SupportMessageRequestDTO request) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin Admin"));

        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc trò chuyện hỗ trợ"));

        SupportMessage msg = SupportMessage.builder()
                .conversation(conv)
                .sender(admin)
                .senderRole(Role.ADMIN)
                .content(request.getContent().trim())
                .isRead(false)
                .build();
        msg = messageRepository.save(msg);

        // Update conversation summary
        conv.setLastMessage(msg.getContent());
        conv.setLastMessageAt(LocalDateTime.now());
        conv.setUnreadUserCount(conv.getUnreadUserCount() + 1);
        conv.setStatus(SupportStatus.IN_PROGRESS);
        conv = conversationRepository.save(conv);

        SupportMessageResponseDTO msgDTO = mapToMessageDTO(msg);
        SupportConversationResponseDTO convDTO = mapToConversationDTO(conv);

        // Broadcast to conversation topic
        messagingTemplate.convertAndSend("/topic/support/" + conv.getId(), msgDTO);

        // Notify specific user support channel
        messagingTemplate.convertAndSend("/topic/user/" + conv.getUser().getId() + "/support", msgDTO);

        // Update admin list
        messagingTemplate.convertAndSend("/topic/admin/support", convDTO);

        return msgDTO;
    }

    @Override
    @Transactional
    public SupportConversationResponseDTO updateStatus(Long conversationId, SupportStatus status) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc trò chuyện hỗ trợ"));

        conv.setStatus(status);
        conv = conversationRepository.save(conv);

        SupportConversationResponseDTO dto = mapToConversationDTO(conv);
        messagingTemplate.convertAndSend("/topic/support/" + conv.getId(), dto);
        messagingTemplate.convertAndSend("/topic/admin/support", dto);

        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public long getAdminUnreadCount() {
        return conversationRepository.countUnreadForAdmin();
    }

    private SupportConversationResponseDTO mapToConversationDTO(SupportConversation conv) {
        User u = conv.getUser();
        return new SupportConversationResponseDTO(
                conv.getId(),
                u != null ? u.getId() : null,
                u != null ? u.getFullName() : "Người dùng ẩn",
                u != null ? u.getPhone() : null,
                u != null ? u.getEmail() : null,
                u != null ? u.getAvatarUrl() : null,
                u != null ? u.getRole() : Role.CUSTOMER,
                conv.getStatus(),
                conv.getLastMessage(),
                conv.getLastMessageAt(),
                conv.getUnreadAdminCount(),
                conv.getUnreadUserCount(),
                conv.getCreatedAt(),
                conv.getUpdatedAt()
        );
    }

    private SupportMessageResponseDTO mapToMessageDTO(SupportMessage msg) {
        User s = msg.getSender();
        return new SupportMessageResponseDTO(
                msg.getId(),
                msg.getConversation().getId(),
                s != null ? s.getId() : null,
                s != null ? s.getFullName() : "CSKH LaundryHub",
                s != null ? s.getAvatarUrl() : null,
                msg.getSenderRole(),
                msg.getContent(),
                msg.isRead(),
                msg.getCreatedAt()
        );
    }
}
