package com.laundry.repository;

import com.laundry.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByOrderIdOrderByTimestampAsc(Long orderId);
    org.springframework.data.domain.Page<ChatMessage> findByOrderIdOrderByTimestampDesc(Long orderId, org.springframework.data.domain.Pageable pageable);
}
