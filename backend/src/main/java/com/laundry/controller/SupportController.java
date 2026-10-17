package com.laundry.controller;

import com.laundry.dto.request.SupportMessageRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.SupportConversationResponseDTO;
import com.laundry.dto.response.SupportMessageResponseDTO;
import com.laundry.enums.SupportStatus;
import com.laundry.security.SecurityUtils;
import com.laundry.service.SupportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    // --- User (Customer & Shop Owner) Endpoints ---

    @GetMapping("/my-conversation")
    public ResponseEntity<ApiResponse<SupportConversationResponseDTO>> getMyConversation() {
        Long userId = SecurityUtils.getCurrentUserId();
        SupportConversationResponseDTO conv = supportService.getOrCreateMyConversation(userId);
        return ResponseEntity.ok(ApiResponse.success(conv));
    }

    @GetMapping("/my-conversation/messages")
    public ResponseEntity<ApiResponse<List<SupportMessageResponseDTO>>> getMyMessages() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<SupportMessageResponseDTO> messages = supportService.getMyMessages(userId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PostMapping("/my-conversation/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponseDTO>> sendMessageFromUser(
            @Valid @RequestBody SupportMessageRequestDTO request) {
        Long userId = SecurityUtils.getCurrentUserId();
        SupportMessageResponseDTO message = supportService.sendMessageFromUser(userId, request);
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    // --- Admin Endpoints ---

    @GetMapping("/admin/conversations")
    public ResponseEntity<ApiResponse<Page<SupportConversationResponseDTO>>> getAdminConversations(
            @RequestParam(required = false) SupportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<SupportConversationResponseDTO> conversations = supportService.getAdminConversations(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(conversations));
    }

    @GetMapping("/admin/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<SupportMessageResponseDTO>>> getAdminConversationMessages(
            @PathVariable Long id) {
        List<SupportMessageResponseDTO> messages = supportService.getAdminConversationMessages(id);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PostMapping("/admin/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponseDTO>> sendMessageFromAdmin(
            @PathVariable Long id,
            @Valid @RequestBody SupportMessageRequestDTO request) {
        Long adminId = SecurityUtils.getCurrentUserId();
        SupportMessageResponseDTO message = supportService.sendMessageFromAdmin(adminId, id, request);
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    @PatchMapping("/admin/conversations/{id}/status")
    public ResponseEntity<ApiResponse<SupportConversationResponseDTO>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ");
        }
        SupportStatus status = SupportStatus.valueOf(statusStr.toUpperCase());
        SupportConversationResponseDTO updated = supportService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @GetMapping("/admin/unread-count")
    public ResponseEntity<ApiResponse<Long>> getAdminUnreadCount() {
        long count = supportService.getAdminUnreadCount();
        return ResponseEntity.ok(ApiResponse.success(count));
    }
}
