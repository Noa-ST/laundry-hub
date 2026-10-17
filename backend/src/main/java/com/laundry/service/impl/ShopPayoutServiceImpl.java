package com.laundry.service.impl;

import com.laundry.dto.request.ConfirmPayoutRequest;
import com.laundry.dto.request.CreatePayoutBatchRequest;
import com.laundry.dto.request.UpdateShopBankRequest;
import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerPayoutSummaryDTO;
import com.laundry.dto.response.PayoutStatsResponseDTO;
import com.laundry.dto.response.ShopPayoutResponseDTO;
import com.laundry.entity.Order;
import com.laundry.entity.Shop;
import com.laundry.entity.ShopPayout;
import com.laundry.enums.OrderPayoutStatus;
import com.laundry.enums.PayoutStatus;
import com.laundry.exception.BadRequestException;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopPayoutRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.service.NotificationService;
import com.laundry.service.ShopPayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopPayoutServiceImpl implements ShopPayoutService {

    private final ShopPayoutRepository shopPayoutRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;

    // Tự động chạy chốt kỳ đối soát vào 00:00 thứ Hai hàng tuần
    @Scheduled(cron = "0 0 0 * * MON")
    @Transactional
    public void scheduledWeeklyPayoutJob() {
        log.info("Bắt đầu tự động chốt kỳ đối soát giải ngân hàng tuần...");
        try {
            CreatePayoutBatchRequest request = new CreatePayoutBatchRequest();
            request.setPeriodEnd(LocalDate.now());
            request.setPlatformFeeRate(5.0);
            createPayoutBatch(request);
            log.info("Chốt kỳ đối soát giải ngân tự động thành công!");
        } catch (Exception e) {
            log.error("Lỗi khi tự động chốt kỳ giải ngân: ", e);
        }
    }

    @Override
    @Transactional
    public List<ShopPayoutResponseDTO> createPayoutBatch(CreatePayoutBatchRequest request) {
        LocalDate periodEnd = request != null && request.getPeriodEnd() != null 
                ? request.getPeriodEnd() 
                : LocalDate.now();
        LocalDateTime cutoffTime = periodEnd.atTime(23, 59, 59);

        double feeRate = (request != null && request.getPlatformFeeRate() != null) 
                ? request.getPlatformFeeRate() 
                : 5.0; // Mặc định 5% hoa hồng sàn

        List<Shop> targetShops;
        if (request != null && request.getSpecificShopId() != null) {
            Shop s = shopRepository.findById(request.getSpecificShopId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tiệm giặt: " + request.getSpecificShopId()));
            targetShops = List.of(s);
        } else {
            targetShops = shopRepository.findAll();
        }

        List<ShopPayout> createdPayouts = new ArrayList<>();

        for (Shop shop : targetShops) {
            List<Order> eligibleOrders = orderRepository.findEligibleOrdersForPayout(shop.getId(), cutoffTime);
            if (eligibleOrders.isEmpty()) {
                continue;
            }

            BigDecimal grossAmount = BigDecimal.ZERO;
            LocalDate earliestDate = periodEnd;

            for (Order o : eligibleOrders) {
                BigDecimal orderTotal = o.getFinalTotalPrice() != null ? o.getFinalTotalPrice() : BigDecimal.ZERO;
                grossAmount = grossAmount.add(orderTotal);
                if (o.getCreatedAt() != null && o.getCreatedAt().toLocalDate().isBefore(earliestDate)) {
                    earliestDate = o.getCreatedAt().toLocalDate();
                }
            }

            BigDecimal platformFeeAmount = grossAmount.multiply(BigDecimal.valueOf(feeRate / 100.0))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal netPayoutAmount = grossAmount.subtract(platformFeeAmount);

            ShopPayout payout = ShopPayout.builder()
                    .shop(shop)
                    .periodStart(earliestDate)
                    .periodEnd(periodEnd)
                    .totalOrders(eligibleOrders.size())
                    .grossAmount(grossAmount)
                    .platformFeeRate(feeRate)
                    .platformFeeAmount(platformFeeAmount)
                    .netPayoutAmount(netPayoutAmount)
                    .status(PayoutStatus.PENDING)
                    .bankName(shop.getBankName())
                    .bankAccountNumber(shop.getBankAccountNumber())
                    .bankAccountName(shop.getBankAccountName())
                    .build();

            payout = shopPayoutRepository.save(payout);

            for (Order o : eligibleOrders) {
                o.setPayout(payout);
                o.setPayoutStatus(OrderPayoutStatus.PENDING);
                orderRepository.save(o);
            }

            createdPayouts.add(payout);

            // Gửi thông báo cho Chủ tiệm
            if (shop.getOwner() != null) {
                String msg = String.format("Đã chốt kỳ đối soát (%s - %s). Tổng %d đơn, doanh thu %sđ, thực nhận %sđ. Sàn sẽ giải ngân theo lịch.",
                        earliestDate, periodEnd, eligibleOrders.size(),
                        formatVnd(grossAmount), formatVnd(netPayoutAmount));
                notificationService.sendOrderNotification(shop.getOwner().getId(), "Kỳ đối soát mới được tạo", msg, null);
            }
        }

        return createdPayouts.stream().map(this::mapToPayoutDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopPayoutResponseDTO> getAdminPayouts(PayoutStatus status, Long shopId) {
        return shopPayoutRepository.searchPayouts(status, shopId).stream()
                .map(this::mapToPayoutDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ShopPayoutResponseDTO getPayoutDetail(Long payoutId) {
        ShopPayout payout = shopPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt giải ngân #" + payoutId));
        return mapToPayoutDTO(payout);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getOrdersInPayout(Long payoutId) {
        List<Order> orders = orderRepository.findByPayoutIdOrderByCreatedAtAsc(payoutId);
        return orders.stream().map(this::mapToOrderDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShopPayoutResponseDTO confirmPayout(Long payoutId, ConfirmPayoutRequest request) {
        ShopPayout payout = shopPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt giải ngân #" + payoutId));

        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            throw new BadRequestException("Đợt giải ngân này đã hoàn thành trước đó.");
        }

        payout.setStatus(PayoutStatus.COMPLETED);
        payout.setPaidAt(LocalDateTime.now());
        if (request != null) {
            if (request.getProofImageUrl() != null && !request.getProofImageUrl().isBlank()) {
                payout.setProofImageUrl(request.getProofImageUrl());
            }
            if (request.getNote() != null) {
                payout.setNote(request.getNote());
            }
        }
        shopPayoutRepository.save(payout);

        // Đánh dấu các đơn hàng thành SETTLED
        List<Order> orders = orderRepository.findByPayoutIdOrderByCreatedAtAsc(payoutId);
        for (Order o : orders) {
            o.setPayoutStatus(OrderPayoutStatus.SETTLED);
            orderRepository.save(o);
        }

        // Bắn thông báo cho Shop Owner
        if (payout.getShop() != null && payout.getShop().getOwner() != null) {
            String msg = String.format("Admin đã giải ngân thành công %sđ cho kỳ (%s - %s). Vui lòng kiểm tra tài khoản ngân hàng của tiệm.",
                    formatVnd(payout.getNetPayoutAmount()), payout.getPeriodStart(), payout.getPeriodEnd());
            notificationService.sendOrderNotification(payout.getShop().getOwner().getId(), "Giải ngân thành công", msg, null);
        }

        return mapToPayoutDTO(payout);
    }

    @Override
    @Transactional
    public ShopPayoutResponseDTO rejectPayout(Long payoutId, String reason) {
        ShopPayout payout = shopPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt giải ngân #" + payoutId));

        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            throw new BadRequestException("Không thể hủy đợt giải ngân đã hoàn thành.");
        }

        payout.setStatus(PayoutStatus.REJECTED);
        payout.setNote(reason != null ? reason : "Đợt giải ngân bị hủy / tạm hoãn");
        shopPayoutRepository.save(payout);

        // Nhả các đơn hàng về lại UNSETTLED để gom vào đợt sau
        List<Order> orders = orderRepository.findByPayoutIdOrderByCreatedAtAsc(payoutId);
        for (Order o : orders) {
            o.setPayout(null);
            o.setPayoutStatus(OrderPayoutStatus.UNSETTLED);
            orderRepository.save(o);
        }

        return mapToPayoutDTO(payout);
    }

    @Override
    @Transactional(readOnly = true)
    public PayoutStatsResponseDTO getAdminPayoutStats() {
        // Tiền VietQR của các đơn hoàn thành chưa giải ngân (UNSETTLED)
        List<Order> unsettledOrders = orderRepository.findAllUnsettledCompletedVietQrOrders();
        BigDecimal holdingBalance = unsettledOrders.stream()
                .map(o -> o.getFinalTotalPrice() != null ? o.getFinalTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tiền đang nằm trong các đợt PENDING
        List<ShopPayout> pendingPayouts = shopPayoutRepository.findByStatus(PayoutStatus.PENDING);
        BigDecimal pendingPayoutAmount = pendingPayouts.stream()
                .map(p -> p.getNetPayoutAmount() != null ? p.getNetPayoutAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tiền đã giải ngân thành công
        List<ShopPayout> completedPayouts = shopPayoutRepository.findByStatus(PayoutStatus.COMPLETED);
        BigDecimal completedPayoutAmount = completedPayouts.stream()
                .map(p -> p.getNetPayoutAmount() != null ? p.getNetPayoutAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tổng phí sàn đã thu
        BigDecimal totalPlatformFee = completedPayouts.stream()
                .map(p -> p.getPlatformFeeAmount() != null ? p.getPlatformFeeAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PayoutStatsResponseDTO.builder()
                .holdingBalance(holdingBalance)
                .pendingPayoutAmount(pendingPayoutAmount)
                .completedPayoutAmount(completedPayoutAmount)
                .totalPlatformFee(totalPlatformFee)
                .pendingBatchesCount(pendingPayouts.size())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopPayoutResponseDTO> getOwnerPayouts(Long ownerId) {
        return shopPayoutRepository.findByShopOwnerIdOrderByCreatedAtDesc(ownerId).stream()
                .map(this::mapToPayoutDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OwnerPayoutSummaryDTO getOwnerPayoutSummary(Long ownerId) {
        Shop shop = shopRepository.findByOwnerId(ownerId)
                .orElse(null);

        BigDecimal pendingBalance = BigDecimal.ZERO;
        if (shop != null) {
            List<Order> unsettledOrders = orderRepository.findUnsettledOrdersByOwnerId(ownerId);
            pendingBalance = unsettledOrders.stream()
                    .map(o -> o.getFinalTotalPrice() != null ? o.getFinalTotalPrice() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<ShopPayout> ownerPayouts = shopPayoutRepository.findByShopOwnerIdOrderByCreatedAtDesc(ownerId);
        
        BigDecimal inProcessingBalance = ownerPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.PENDING)
                .map(p -> p.getNetPayoutAmount() != null ? p.getNetPayoutAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSettledBalance = ownerPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.COMPLETED)
                .map(p -> p.getNetPayoutAmount() != null ? p.getNetPayoutAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate nextMonday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));

        boolean bankConfigured = shop != null 
                && shop.getBankAccountNumber() != null && !shop.getBankAccountNumber().isBlank()
                && shop.getBankName() != null && !shop.getBankName().isBlank();

        return OwnerPayoutSummaryDTO.builder()
                .pendingBalance(pendingBalance)
                .inProcessingBalance(inProcessingBalance)
                .totalSettledBalance(totalSettledBalance)
                .nextScheduledPayoutDate(nextMonday)
                .isBankConfigured(bankConfigured)
                .bankName(shop != null ? shop.getBankName() : null)
                .bankAccountNumber(shop != null ? shop.getBankAccountNumber() : null)
                .bankAccountName(shop != null ? shop.getBankAccountName() : null)
                .build();
    }

    @Override
    @Transactional
    public void updateShopBankInfo(Long ownerId, UpdateShopBankRequest request) {
        Shop shop = shopRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy tiệm giặt của bạn"));

        shop.setBankName(request.getBankName());
        shop.setBankAccountNumber(request.getBankAccountNumber());
        shop.setBankAccountName(request.getBankAccountName());
        shopRepository.save(shop);
    }

    private ShopPayoutResponseDTO mapToPayoutDTO(ShopPayout p) {
        return ShopPayoutResponseDTO.builder()
                .id(p.getId())
                .shopId(p.getShop() != null ? p.getShop().getId() : null)
                .shopName(p.getShop() != null ? p.getShop().getName() : "")
                .shopPhone(p.getShop() != null ? p.getShop().getPhone() : "")
                .ownerName(p.getShop() != null && p.getShop().getOwner() != null ? p.getShop().getOwner().getFullName() : "")
                .periodStart(p.getPeriodStart())
                .periodEnd(p.getPeriodEnd())
                .totalOrders(p.getTotalOrders())
                .grossAmount(p.getGrossAmount())
                .platformFeeRate(p.getPlatformFeeRate())
                .platformFeeAmount(p.getPlatformFeeAmount())
                .netPayoutAmount(p.getNetPayoutAmount())
                .status(p.getStatus())
                .proofImageUrl(p.getProofImageUrl())
                .note(p.getNote())
                .paidAt(p.getPaidAt())
                .bankName(p.getBankName())
                .bankAccountNumber(p.getBankAccountNumber())
                .bankAccountName(p.getBankAccountName())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private OrderResponseDTO mapToOrderDTO(Order order) {
        List<OrderItemResponseDTO> items = order.getItems().stream()
                .map(item -> new OrderItemResponseDTO(
                        item.getId(),
                        item.getService().getName(),
                        item.getQuantity(),
                        item.getPriceAtBooking(),
                        item.getService().getUnit() != null ? item.getService().getUnit().getName() : ""
                ))
                .collect(Collectors.toList());

        return new OrderResponseDTO(
                order.getId(),
                order.getShop().getId(),
                order.getShop().getName(),
                order.getStatus().name(),
                order.getBookingTime(),
                order.getServiceFee(),
                order.getShippingFee(),
                order.getDiscountAmount(),
                order.getFinalTotalPrice(),
                order.getEstimatedTotal(),
                order.getVoucher() != null ? order.getVoucher().getCode() : null,
                order.getInboundType() != null ? order.getInboundType().name() : null,
                order.getOutboundType() != null ? order.getOutboundType().name() : null,
                order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null,
                order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null,
                (order.getReceiverName() != null && !order.getReceiverName().isBlank()) ? order.getReceiverName() : (order.getCustomer() != null ? order.getCustomer().getFullName() : null),
                (order.getReceiverPhone() != null && !order.getReceiverPhone().isBlank()) ? order.getReceiverPhone() : (order.getCustomer() != null ? order.getCustomer().getPhone() : null),
                order.getDeliveryAddress(),
                order.getPickupAddress(),
                order.getNote(),
                order.getCancelReason(),
                order.getCancelledBy(),
                order.getPaidAt(),
                order.getCreatedAt(),
                order.getReview() != null,
                order.isHasDispute(),
                items
        );
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format("%,d", amount.longValue());
    }
}
