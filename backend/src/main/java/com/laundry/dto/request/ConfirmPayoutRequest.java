package com.laundry.dto.request;

import lombok.Data;

@Data
public class ConfirmPayoutRequest {
    private String proofImageUrl;
    private String note;
}
