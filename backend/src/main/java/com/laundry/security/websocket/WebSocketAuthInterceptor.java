package com.laundry.security.websocket;

import com.laundry.entity.Role;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.SupportConversationRepository;
import com.laundry.security.CustomUserDetails;
import com.laundry.security.CustomUserDetailsService;
import com.laundry.security.jwt.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Xác thực và phân quyền cho kết nối STOMP.
 * <ul>
 *   <li>CONNECT: bắt buộc header {@code Authorization: Bearer <jwt>} hợp lệ, tài khoản còn hoạt động.</li>
 *   <li>SUBSCRIBE: chỉ cho phép các topic mà user sở hữu (mặc định TỪ CHỐI mọi topic không khai báo).</li>
 *   <li>SEND: từ chối — hệ thống không có @MessageMapping, client chỉ nhận dữ liệu qua WebSocket.</li>
 * </ul>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern USER_TOPIC = Pattern.compile("^/topic/user/(\\d+)/(notifications|support)$");
    private static final Pattern CHAT_TOPIC = Pattern.compile("^/topic/chat/(\\d+)$");
    private static final Pattern SUPPORT_TOPIC = Pattern.compile("^/topic/support/(\\d+)$");
    private static final String ADMIN_SUPPORT_TOPIC = "/topic/admin/support";

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;
    private final OrderRepository orderRepository;
    private final SupportConversationRepository supportConversationRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        switch (command) {
            case CONNECT, STOMP -> authenticate(accessor);
            case SUBSCRIBE -> authorizeSubscribe(accessor);
            case SEND -> throw new MessageDeliveryException("Không được phép gửi dữ liệu qua WebSocket");
            default -> {
                // DISCONNECT, UNSUBSCRIBE, ACK, NACK... không cần kiểm tra thêm
            }
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Unauthorized");
        }
        String jwt = header.substring(7);
        if (!jwtUtils.validateJwtToken(jwt)) {
            throw new MessageDeliveryException("Unauthorized");
        }

        CustomUserDetails userDetails;
        try {
            String username = jwtUtils.getUserNameFromJwtToken(jwt);
            userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);
        } catch (Exception e) {
            log.warn("WebSocket CONNECT: không tải được user từ token: {}", e.getMessage());
            throw new MessageDeliveryException("Unauthorized");
        }
        if (!userDetails.isEnabled()) {
            throw new MessageDeliveryException("Unauthorized");
        }

        accessor.setUser(new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        CustomUserDetails user = extractUser(accessor.getUser());
        String destination = accessor.getDestination();
        if (user == null || destination == null || !canSubscribe(user, destination)) {
            log.warn("Từ chối SUBSCRIBE: user={}, destination={}", user != null ? user.getId() : null, destination);
            throw new MessageDeliveryException("Forbidden");
        }
    }

    private boolean canSubscribe(CustomUserDetails user, String destination) {
        Long userId = user.getId();
        boolean isAdmin = user.getUser().getRole() == Role.ADMIN;

        Matcher m = USER_TOPIC.matcher(destination);
        if (m.matches()) {
            return userId.equals(Long.valueOf(m.group(1)));
        }

        m = CHAT_TOPIC.matcher(destination);
        if (m.matches()) {
            return orderRepository.isOrderParticipant(Long.valueOf(m.group(1)), userId);
        }

        m = SUPPORT_TOPIC.matcher(destination);
        if (m.matches()) {
            return isAdmin || supportConversationRepository.existsByIdAndUserId(Long.valueOf(m.group(1)), userId);
        }

        if (ADMIN_SUPPORT_TOPIC.equals(destination)) {
            return isAdmin;
        }

        return false;
    }

    private CustomUserDetails extractUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof CustomUserDetails details) {
            return details;
        }
        return null;
    }
}
