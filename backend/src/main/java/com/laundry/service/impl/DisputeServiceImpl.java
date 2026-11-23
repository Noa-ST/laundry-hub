package com.laundry.service.impl;

import com.laundry.dto.request.AdminResolveDisputeRequest;
import com.laundry.dto.request.CreateDisputeRequest;
import com.laundry.dto.request.ShopRespondDisputeRequest;
import com.laundry.dto.response.DisputeResponse;
import com.laundry.entity.Dispute;
import com.laundry.entity.Order;
import com.laundry.entity.Role;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.enums.DisputeStatus;
import com.laundry.enums.OrderPayoutStatus;
import com.laundry.enums.OrderStatus;
import com.laundry.exception.BadRequestException;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.DisputeRepository;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.DisputeService;
import com.laundry.service.NotificationService;
import lombok.RequiredArgsConstructor;
import com.laundry.entity.Voucher;
import com.laundry.enums.RefundMethod;
import com.laundry.repository.VoucherRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DisputeServiceImpl implements DisputeService {
    
    private final DisputeRepository disputeRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final VoucherRepository voucherRepository;
    private final NotificationService notificationService;

    private User getUserByPrincipal(String username) {
        return userRepository.findByPhone(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }

    @Override
    @Transactional
    public DisputeResponse createDispute(String username, Long orderId, CreateDisputeRequest request) {
        User customer = getUserByPrincipal(username);
                
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
                
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new AccessDeniedException("Đơn hàng này không thuộc về bạn");
        }
        
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("Chỉ có thể gửi khiếu nại cho đơn hàng đã hoàn thành (COMPLETED)");
        }

        if (order.getPayoutStatus() == OrderPayoutStatus.SETTLED) {
            throw new BadRequestException("Đơn hàng đã hoàn tất đối soát, không thể mở khiếu nại mới. Vui lòng liên hệ CSKH.");
        }
        
        if (order.isHasDispute() || disputeRepository.findByOrderId(orderId).isPresent()) {
            throw new BadRequestException("Đơn hàng này đã có khiếu nại trước đó");
        }

        if (request.getRequestedAmount() == null || request.getRequestedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền yêu cầu bồi thường phải lớn hơn 0");
        }
        if (order.getFinalTotalPrice() != null && request.getRequestedAmount().compareTo(order.getFinalTotalPrice()) > 0) {
            throw new BadRequestException("Số tiền yêu cầu bồi thường không được vượt quá giá trị đơn hàng");
        }
        
        Dispute dispute = Dispute.builder()
                .order(order)
                .customer(customer)
                .shop(order.getShop())
                .reason(request.getReason())
                .description(request.getDescription())
                .evidenceUrls(request.getEvidenceUrls())
                .requestedAmount(request.getRequestedAmount())
                .bankName(request.getBankName())
                .bankAccountNumber(request.getBankAccountNumber())
                .bankAccountName(request.getBankAccountName())
                .status(DisputeStatus.OPEN)
                .build();
                
        order.setHasDispute(true);
        orderRepository.save(order);
        
        dispute = disputeRepository.save(dispute);

        // Notify Shop Owner
        try {
            notificationService.sendOrderNotification(
                order.getShop().getOwner().getId(),
                "Khiếu nại mới đơn hàng #" + order.getId(),
                "Khách hàng đã gửi khiếu nại bồi thường cho đơn hàng #" + order.getId() + ". Vui lòng kiểm tra và xử lý.",
                order.getId()
            );
        } catch (Exception e) {
            // Log & continue
        }

        return mapToResponse(dispute);
    }

    @Override
    public DisputeResponse getDisputeByOrderId(String username, Long orderId) {
        Dispute dispute = disputeRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Dispute not found for order"));
        
        User user = getUserByPrincipal(username);
                
        // Only allow customer, shop owner or admin
        if (!dispute.getCustomer().getId().equals(user.getId()) &&
            !dispute.getShop().getOwner().getId().equals(user.getId()) &&
            user.getRole() != Role.ADMIN) {
            throw new RuntimeException("Access denied");
        }
        
        return mapToResponse(dispute);
    }

    @Override
    public DisputeResponse getDisputeById(String username, Long disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));

        User user = getUserByPrincipal(username);

        if (!dispute.getCustomer().getId().equals(user.getId()) &&
            !dispute.getShop().getOwner().getId().equals(user.getId()) &&
            user.getRole() != Role.ADMIN) {
            throw new RuntimeException("Access denied");
        }

        return mapToResponse(dispute);
    }

    @Override
    public Page<DisputeResponse> getCustomerDisputes(String username, Pageable pageable) {
        User user = getUserByPrincipal(username);
        return disputeRepository.findByCustomerId(user.getId(), pageable).map(this::mapToResponse);
    }

    @Override
    public Page<DisputeResponse> getShopDisputes(String username, Long shopId, DisputeStatus status, Pageable pageable) {
        User user = getUserByPrincipal(username);
        
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        if (!shop.getOwner().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new RuntimeException("Access denied: You do not own this shop");
        }

        if (status != null) {
            return disputeRepository.findByShopIdAndStatus(shopId, status, pageable).map(this::mapToResponse);
        }
        return disputeRepository.findByShopId(shopId, pageable).map(this::mapToResponse);
    }

    @Override
    public Page<DisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable) {
        if (status != null) {
            return disputeRepository.findByStatus(status, pageable).map(this::mapToResponse);
        }
        return disputeRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public DisputeResponse shopRespond(String username, Long disputeId, ShopRespondDisputeRequest request) {
        User user = getUserByPrincipal(username);

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));
                
        if (!dispute.getShop().getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied: You do not own the shop for this dispute");
        }
                
        if (dispute.getStatus() != DisputeStatus.OPEN && dispute.getStatus() != DisputeStatus.SHOP_REVIEWING) {
            throw new RuntimeException("Cannot respond to dispute in current status: " + dispute.getStatus());
        }
        
        boolean accepted = Boolean.TRUE.equals(request.getAcceptRefund());
        if (accepted) {
            dispute.setStatus(DisputeStatus.RESOLVED_REFUNDED);
            dispute.setAcceptedAmount(request.getAcceptedAmount());
            RefundMethod method = request.getRefundMethod() != null ? request.getRefundMethod() : RefundMethod.BANK_TRANSFER;
            dispute.setRefundMethod(method);

            if (method == RefundMethod.VOUCHER) {
                // Generate compensation voucher for customer
                String voucherCode = "REFUND-" + dispute.getOrder().getId() + "-" + (int)(Math.random() * 9000 + 1000);
                Voucher voucher = Voucher.builder()
                        .shop(dispute.getShop())
                        .targetUser(dispute.getCustomer())
                        .code(voucherCode)
                        .discountType(Voucher.DiscountType.FIXED_AMOUNT)
                        .discountValue(request.getAcceptedAmount() != null ? request.getAcceptedAmount().doubleValue() : 0.0)
                        .minOrderValue(0.0)
                        .startDate(LocalDateTime.now())
                        .endDate(LocalDateTime.now().plusDays(90))
                        .usageLimit(1)
                        .usageLimitPerUser(1)
                        .usedCount(0)
                        .isActive(true)
                        .build();
                voucherRepository.save(voucher);
                dispute.setCompensationVoucherCode(voucherCode);
            } else {
                dispute.setRefundProofUrl(request.getRefundProofUrl());
            }
            // Tiệm đã trực tiếp bồi thường bằng chuyển khoản/voucher -> mở khóa payout cho đơn
            Order order = dispute.getOrder();
            order.setHasDispute(false);
            orderRepository.save(order);
        } else {
            dispute.setStatus(DisputeStatus.REJECTED);
        }
        
        dispute.setShopResponseNote(request.getShopResponseNote());
        dispute.setShopEvidenceUrls(request.getShopEvidenceUrls());
        dispute = disputeRepository.save(dispute);

        // Notify Customer
        try {
            String title = accepted ? "Khiếu nại được chấp thuận bồi thường" : "Tiệm đã từ chối khiếu nại";
            String msg;
            if (!accepted) {
                msg = "Tiệm từ chối khiếu nại đơn #" + dispute.getOrder().getId() + ". Bạn có thể yêu cầu Admin can thiệp nếu cần.";
            } else if (dispute.getRefundMethod() == RefundMethod.VOUCHER) {
                msg = "Tiệm đã cấp mã Voucher bồi hoàn: " + dispute.getCompensationVoucherCode() + " (trị giá " + (request.getAcceptedAmount() != null ? request.getAcceptedAmount() : 0) + "đ) cho đơn #" + dispute.getOrder().getId() + ". Áp dụng cho lần giặt tiếp theo tại tiệm.";
            } else {
                msg = "Tiệm đã xác nhận bồi thường chuyển khoản VietQR số tiền " + (request.getAcceptedAmount() != null ? request.getAcceptedAmount() : 0) + "đ cho đơn #" + dispute.getOrder().getId() + ". Vui lòng kiểm tra tài khoản.";
            }
            notificationService.sendOrderNotification(dispute.getCustomer().getId(), title, msg, dispute.getOrder().getId());
        } catch (Exception e) {
            // Log & continue
        }
        
        return mapToResponse(dispute);
    }

    @Override
    @Transactional
    public DisputeResponse escalateToAdmin(String username, Long disputeId) {
        User user = getUserByPrincipal(username);

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));

        if (!dispute.getCustomer().getId().equals(user.getId())) {
            throw new RuntimeException("Dispute does not belong to you");
        }
                
        if (dispute.getStatus() != DisputeStatus.REJECTED && dispute.getStatus() != DisputeStatus.SHOP_REVIEWING) {
            throw new RuntimeException("Cannot escalate in current status: " + dispute.getStatus());
        }
        
        dispute.setStatus(DisputeStatus.ADMIN_REVIEWING);
        dispute = disputeRepository.save(dispute);

        // Notify Shop Owner that Customer escalated to Admin
        try {
            notificationService.sendOrderNotification(
                dispute.getShop().getOwner().getId(),
                "Tranh chấp đơn #" + dispute.getOrder().getId() + " đã chuyển lên Admin",
                "Khách hàng đã yêu cầu Ban Quản Trị can thiệp giải quyết khiếu nại đơn #" + dispute.getOrder().getId(),
                dispute.getOrder().getId()
            );
        } catch (Exception e) {
            // Log & continue
        }

        return mapToResponse(dispute);
    }

    @Override
    @Transactional
    public DisputeResponse adminResolve(Long disputeId, AdminResolveDisputeRequest request) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại"));

        if (dispute.getStatus() == DisputeStatus.RESOLVED_REFUNDED
                || dispute.getStatus() == DisputeStatus.ADMIN_REJECTED
                || dispute.getStatus() == DisputeStatus.CANCELLED) {
            throw new BadRequestException("Khiếu nại này đã được giải quyết hoặc đã đóng, không thể phân xử lại.");
        }
                
        boolean accepted = Boolean.TRUE.equals(request.getAcceptRefund());
        if (accepted) {
            dispute.setStatus(DisputeStatus.RESOLVED_REFUNDED);
            dispute.setAcceptedAmount(dispute.getRequestedAmount()); 
            RefundMethod method = request.getRefundMethod() != null ? request.getRefundMethod() : RefundMethod.BANK_TRANSFER;
            dispute.setRefundMethod(method);

            if (method == RefundMethod.VOUCHER) {
                String voucherCode = "ADMIN-REFUND-" + dispute.getOrder().getId() + "-" + (int)(Math.random() * 9000 + 1000);
                Voucher voucher = Voucher.builder()
                        .shop(dispute.getShop())
                        .targetUser(dispute.getCustomer())
                        .code(voucherCode)
                        .discountType(Voucher.DiscountType.FIXED_AMOUNT)
                        .discountValue(dispute.getRequestedAmount() != null ? dispute.getRequestedAmount().doubleValue() : 0.0)
                        .minOrderValue(0.0)
                        .startDate(LocalDateTime.now())
                        .endDate(LocalDateTime.now().plusDays(90))
                        .usageLimit(1)
                        .usageLimitPerUser(1)
                        .usedCount(0)
                        .isActive(true)
                        .build();
                voucherRepository.save(voucher);
                dispute.setCompensationVoucherCode(voucherCode);
            } else {
                dispute.setRefundProofUrl(request.getRefundProofUrl());
            }
        } else {
            dispute.setStatus(DisputeStatus.ADMIN_REJECTED);
        }

        // Sau khi Admin phán quyết xong, mở khóa hasDispute để không treo payout vĩnh viễn
        Order order = dispute.getOrder();
        order.setHasDispute(false);
        orderRepository.save(order);
        
        dispute.setAdminDecisionNote(request.getAdminDecisionNote());
        dispute = disputeRepository.save(dispute);

        // Notify both Customer and Shop Owner
        try {
            String title = "Phán quyết tranh chấp đơn #" + dispute.getOrder().getId();
            String customerMsg;
            String ownerMsg;
            if (!accepted) {
                customerMsg = "Admin đã bác bỏ khiếu nại cho đơn hàng #" + dispute.getOrder().getId() + ". Lý do: " + request.getAdminDecisionNote();
                ownerMsg = "Admin đã bác bỏ khiếu nại của khách hàng cho đơn #" + dispute.getOrder().getId();
            } else if (dispute.getRefundMethod() == RefundMethod.VOUCHER) {
                customerMsg = "Admin phán quyết cấp mã Voucher bồi hoàn: " + dispute.getCompensationVoucherCode() + " (trị giá " + dispute.getRequestedAmount() + "đ) cho đơn #" + dispute.getOrder().getId() + ". Áp dụng cho lần giặt tiếp theo tại tiệm.";
                ownerMsg = "Admin đã phê duyệt bồi hoàn mã Voucher " + dispute.getCompensationVoucherCode() + " cho khách hàng đơn #" + dispute.getOrder().getId() + " (khấu trừ doanh thu đơn sau).";
            } else {
                customerMsg = "Admin đã xác nhận bồi thường chuyển khoản VietQR cho đơn #" + dispute.getOrder().getId() + ".";
                ownerMsg = "Admin đã xác nhận hoàn tất bồi thường cho đơn #" + dispute.getOrder().getId() + ".";
            }
            notificationService.sendOrderNotification(dispute.getCustomer().getId(), title, customerMsg, dispute.getOrder().getId());
            notificationService.sendOrderNotification(dispute.getShop().getOwner().getId(), title, ownerMsg, dispute.getOrder().getId());
        } catch (Exception e) {
            // Log & continue
        }

        return mapToResponse(dispute);
    }

    @Override
    @Transactional
    public DisputeResponse cancelDispute(String username, Long disputeId) {
        User user = getUserByPrincipal(username);

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));

        if (!dispute.getCustomer().getId().equals(user.getId())) {
            throw new RuntimeException("Dispute does not belong to you");
        }
                
        if (dispute.getStatus() != DisputeStatus.OPEN) {
            throw new BadRequestException("Chỉ có thể rút lại khiếu nại khi đang ở trạng thái OPEN");
        }
        
        dispute.setStatus(DisputeStatus.CANCELLED);
        Order order = dispute.getOrder();
        order.setHasDispute(false);
        orderRepository.save(order);

        // Notify Shop Owner
        try {
            notificationService.sendOrderNotification(
                dispute.getShop().getOwner().getId(),
                "Khiếu nại đã được rút lại",
                "Khách hàng đã hủy bỏ khiếu nại cho đơn hàng #" + order.getId(),
                order.getId()
            );
        } catch (Exception e) {
            // Log & continue
        }
        
        return mapToResponse(disputeRepository.save(dispute));
    }
    
    private DisputeResponse mapToResponse(Dispute dispute) {
        return DisputeResponse.builder()
                .id(dispute.getId())
                .orderId(dispute.getOrder().getId())
                .customerId(dispute.getCustomer().getId())
                .shopId(dispute.getShop().getId())
                .reason(dispute.getReason())
                .description(dispute.getDescription())
                .evidenceUrls(dispute.getEvidenceUrls())
                .status(dispute.getStatus())
                .requestedAmount(dispute.getRequestedAmount())
                .acceptedAmount(dispute.getAcceptedAmount())
                .refundMethod(dispute.getRefundMethod())
                .bankName(dispute.getBankName())
                .bankAccountNumber(dispute.getBankAccountNumber())
                .bankAccountName(dispute.getBankAccountName())
                .refundProofUrl(dispute.getRefundProofUrl())
                .compensationVoucherCode(dispute.getCompensationVoucherCode())
                .shopResponseNote(dispute.getShopResponseNote())
                .shopEvidenceUrls(dispute.getShopEvidenceUrls())
                .adminDecisionNote(dispute.getAdminDecisionNote())
                .createdAt(dispute.getCreatedAt())
                .updatedAt(dispute.getUpdatedAt())
                .build();
    }
}
