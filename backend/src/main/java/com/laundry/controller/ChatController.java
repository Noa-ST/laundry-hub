package com.laundry.controller;

import com.laundry.dto.request.ChatMessageRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.ChatMessageResponseDTO;
import com.laundry.security.SecurityUtils;
import com.laundry.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/v1/orders/{orderId}/messages")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatMessageResponseDTO>> sendMessage(
            @PathVariable Long orderId,
            @Valid @RequestBody ChatMessageRequestDTO request) {
        Long userId = SecurityUtils.getCurrentUserId();
        ChatMessageResponseDTO message = chatService.sendMessage(orderId, userId, request);
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ChatMessageResponseDTO>>> getOrderMessages(
            @PathVariable Long orderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessageResponseDTO> messages = chatService.getOrderMessages(orderId, userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }
}
