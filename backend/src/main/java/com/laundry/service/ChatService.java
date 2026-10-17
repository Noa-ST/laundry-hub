package com.laundry.service;

import com.laundry.dto.request.ChatMessageRequestDTO;
import com.laundry.dto.response.ChatMessageResponseDTO;
import com.laundry.entity.ChatMessage;
import com.laundry.entity.Order;
import com.laundry.entity.User;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.ChatMessageRepository;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ChatMessageResponseDTO sendMessage(Long orderId, Long senderId, ChatMessageRequestDTO request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate sender is either the customer or the shop owner
        boolean isCustomer = order.getCustomer() != null && order.getCustomer().getId().equals(senderId);
        boolean isShopOwner = order.getShop() != null && order.getShop().getOwner() != null && order.getShop().getOwner().getId().equals(senderId);
        if (!isCustomer && !isShopOwner) {
            throw new IllegalArgumentException("Không có quyền chat trong đơn hàng này");
        }

        ChatMessage message = ChatMessage.builder()
                .order(order)
                .sender(sender)
                .content(request.getContent())
                .isRead(false)
                .build();

        message = chatMessageRepository.save(message);

        ChatMessageResponseDTO responseDTO = mapToDTO(message);

        // Broadcast to WebSocket topic specific to this order
        messagingTemplate.convertAndSend("/topic/chat/" + orderId, responseDTO);

        return responseDTO;
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponseDTO> getOrderMessages(Long orderId, Long userId, Pageable pageable) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Validate user is either the customer or the shop owner
        boolean isCustomer = order.getCustomer() != null && order.getCustomer().getId().equals(userId);
        boolean isShopOwner = order.getShop() != null && order.getShop().getOwner() != null && order.getShop().getOwner().getId().equals(userId);
        if (!isCustomer && !isShopOwner) {
            throw new IllegalArgumentException("Không có quyền xem chat trong đơn hàng này");
        }

        return chatMessageRepository.findByOrderIdOrderByTimestampDesc(orderId, pageable)
                .map(this::mapToDTO);
    }

    private ChatMessageResponseDTO mapToDTO(ChatMessage message) {
        return new ChatMessageResponseDTO(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getFullName(),
                message.getContent(),
                message.getTimestamp(),
                message.isRead()
        );
    }
}
