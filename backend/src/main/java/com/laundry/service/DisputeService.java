package com.laundry.service;

import com.laundry.dto.request.AdminResolveDisputeRequest;
import com.laundry.dto.request.CreateDisputeRequest;
import com.laundry.dto.request.ShopRespondDisputeRequest;
import com.laundry.dto.response.DisputeResponse;
import com.laundry.enums.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DisputeService {
    DisputeResponse createDispute(String username, Long orderId, CreateDisputeRequest request);
    
    DisputeResponse getDisputeByOrderId(String username, Long orderId);
    
    DisputeResponse getDisputeById(String username, Long disputeId);
    
    Page<DisputeResponse> getCustomerDisputes(String username, Pageable pageable);
    
    Page<DisputeResponse> getShopDisputes(String username, Long shopId, DisputeStatus status, Pageable pageable);
    
    Page<DisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable);
    
    DisputeResponse shopRespond(String username, Long disputeId, ShopRespondDisputeRequest request);
    
    DisputeResponse escalateToAdmin(String username, Long disputeId);
    
    DisputeResponse adminResolve(Long disputeId, AdminResolveDisputeRequest request);
    
    DisputeResponse cancelDispute(String username, Long disputeId);
}
