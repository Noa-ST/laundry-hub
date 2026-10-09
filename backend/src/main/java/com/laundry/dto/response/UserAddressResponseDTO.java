package com.laundry.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserAddressResponseDTO {
    private Long id;
    private String label;
    private String address;
    private Double latitude;
    private Double longitude;
    private Boolean isDefault;
}
