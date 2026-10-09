package com.laundry.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class ReviewRequestDTO {
    @NotNull(message = "ID Đơn hàng không được để trống")
    private Long orderId;

    @NotNull(message = "Đánh giá sao không được để trống")
    @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá tối đa 5 sao")
    private Integer rating;

    private String comment;

    private List<String> imageUrls;
}
