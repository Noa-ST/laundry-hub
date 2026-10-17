package com.laundry.repository;

import com.laundry.entity.SupportMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
    List<SupportMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    Page<SupportMessage> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);
}
