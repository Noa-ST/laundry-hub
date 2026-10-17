package com.laundry.service;

import com.laundry.dto.request.SupportMessageRequestDTO;
import com.laundry.dto.response.SupportConversationResponseDTO;
import com.laundry.dto.response.SupportMessageResponseDTO;
import com.laundry.enums.SupportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SupportService {
    SupportConversationResponseDTO getOrCreateMyConversation(Long userId);
    List<SupportMessageResponseDTO> getMyMessages(Long userId);
    SupportMessageResponseDTO sendMessageFromUser(Long userId, SupportMessageRequestDTO request);

    Page<SupportConversationResponseDTO> getAdminConversations(SupportStatus status, Pageable pageable);
    List<SupportMessageResponseDTO> getAdminConversationMessages(Long conversationId);
    SupportMessageResponseDTO sendMessageFromAdmin(Long adminId, Long conversationId, SupportMessageRequestDTO request);
    SupportConversationResponseDTO updateStatus(Long conversationId, SupportStatus status);
    long getAdminUnreadCount();
}
