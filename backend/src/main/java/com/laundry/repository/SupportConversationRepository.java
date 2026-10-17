package com.laundry.repository;

import com.laundry.entity.SupportConversation;
import com.laundry.enums.SupportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportConversationRepository extends JpaRepository<SupportConversation, Long> {
    Optional<SupportConversation> findByUserId(Long userId);

    Page<SupportConversation> findAllByOrderByLastMessageAtDesc(Pageable pageable);

    Page<SupportConversation> findByStatusOrderByLastMessageAtDesc(SupportStatus status, Pageable pageable);

    @Query("SELECT COUNT(c) FROM SupportConversation c WHERE c.unreadAdminCount > 0")
    long countUnreadForAdmin();
}
