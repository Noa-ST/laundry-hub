package com.laundry.dto.request;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CreatePayoutBatchRequest {
    private LocalDate periodEnd;
    private Double platformFeeRate; // % phí sàn (mặc định 5%)
    private Long specificShopId; // Nếu muốn tạo riêng cho 1 shop (optional)
}
