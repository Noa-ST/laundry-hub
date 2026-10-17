package com.laundry.service;

import com.laundry.dto.request.ConfirmPayoutRequest;
import com.laundry.dto.request.CreatePayoutBatchRequest;
import com.laundry.dto.request.UpdateShopBankRequest;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerPayoutSummaryDTO;
import com.laundry.dto.response.PayoutStatsResponseDTO;
import com.laundry.dto.response.ShopPayoutResponseDTO;
import com.laundry.enums.PayoutStatus;

import java.util.List;

public interface ShopPayoutService {
    
    // --- ADMIN METHODS ---
    List<ShopPayoutResponseDTO> createPayoutBatch(CreatePayoutBatchRequest request);
    List<ShopPayoutResponseDTO> getAdminPayouts(PayoutStatus status, Long shopId);
    ShopPayoutResponseDTO getPayoutDetail(Long payoutId);
    List<OrderResponseDTO> getOrdersInPayout(Long payoutId);
    ShopPayoutResponseDTO confirmPayout(Long payoutId, ConfirmPayoutRequest request);
    ShopPayoutResponseDTO rejectPayout(Long payoutId, String reason);
    PayoutStatsResponseDTO getAdminPayoutStats();

    // --- OWNER METHODS ---
    List<ShopPayoutResponseDTO> getOwnerPayouts(Long ownerId);
    OwnerPayoutSummaryDTO getOwnerPayoutSummary(Long ownerId);
    void updateShopBankInfo(Long ownerId, UpdateShopBankRequest request);
}
